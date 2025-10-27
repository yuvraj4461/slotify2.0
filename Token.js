// models/Token.js - Token/Queue Management Model
const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  // Token Identification
  tokenNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  displayNumber: {
    type: Number,
    required: true
  },
  
  // Patient Association
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  
  // Priority & Category
  priority: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  
  category: {
    type: String,
    enum: ['critical', 'urgent', 'less-urgent', 'non-urgent'],
    required: true
  },
  
  department: {
    type: String,
    enum: ['emergency', 'general', 'pediatrics', 'orthopedics', 'cardiology', 'neurology', 'other'],
    default: 'general'
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['active', 'called', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'active'
  },
  
  // Queue Position
  originalPosition: {
    type: Number,
    required: true
  },
  
  currentPosition: {
    type: Number,
    required: true
  },
  
  positionHistory: [{
    position: Number,
    changedAt: Date,
    reason: String
  }],
  
  // Time Tracking
  issuedAt: {
    type: Date,
    default: Date.now
  },
  
  estimatedServiceTime: {
    type: Date
  },
  
  actualServiceTime: Date,
  
  calledAt: Date,
  
  serviceStartedAt: Date,
  
  serviceCompletedAt: Date,
  
  // Wait Time Estimates
  estimatedWaitMinutes: {
    type: Number,
    default: 0
  },
  
  actualWaitMinutes: {
    type: Number,
    default: 0
  },
  
  // Doctor Assignment
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  
  consultingRoom: String,
  
  // Notification Tracking
  notifications: [{
    type: {
      type: String,
      enum: ['issued', 'position-changed', 'calling', 'reminder', 'cancelled']
    },
    sentAt: Date,
    method: {
      type: String,
      enum: ['sms', 'email', 'push', 'display']
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed']
    },
    message: String
  }],
  
  lastNotificationAt: Date,
  
  // QR Code for Easy Check-in
  qrCode: String,
  
  // Security PIN (for verification)
  securityPin: {
    type: String,
    required: true
  },
  
  // Validity
  validUntil: {
    type: Date,
    default: function() {
      // Token valid for 24 hours by default
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  },
  
  // Requeue Information
  requeued: {
    type: Boolean,
    default: false
  },
  
  requeueCount: {
    type: Number,
    default: 0
  },
  
  requeueHistory: [{
    requeuedAt: Date,
    reason: String,
    previousPosition: Number,
    newPosition: Number
  }],
  
  // Branch/Location
  branch: {
    type: String,
    default: 'main'
  },
  
  // Meta Information
  metadata: {
    deviceType: String,
    checkInMethod: {
      type: String,
      enum: ['web', 'mobile', 'kiosk', 'staff'],
      default: 'web'
    },
    ipAddress: String,
    userAgent: String
  },
  
  // Notes
  notes: String,
  
  // Cancellation Info
  cancellationReason: String,
  cancelledBy: String,
  cancelledAt: Date

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
tokenSchema.index({ tokenNumber: 1 });
tokenSchema.index({ patient: 1 });
tokenSchema.index({ status: 1 });
tokenSchema.index({ category: 1 });
tokenSchema.index({ currentPosition: 1 });
tokenSchema.index({ issuedAt: 1 });
tokenSchema.index({ branch: 1 });

// Virtual for checking if token is expired
tokenSchema.virtual('isExpired').get(function() {
  return new Date() > this.validUntil;
});

// Virtual for wait time calculation
tokenSchema.virtual('currentWaitTime').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') {
    return this.actualWaitMinutes;
  }
  const now = new Date();
  const waitTime = Math.floor((now - this.issuedAt) / (1000 * 60));
  return waitTime;
});

// Method to update position
tokenSchema.methods.updatePosition = async function(newPosition, reason = 'Priority adjustment') {
  // Store position history
  this.positionHistory.push({
    position: this.currentPosition,
    changedAt: new Date(),
    reason
  });
  
  this.currentPosition = newPosition;
  await this.save();
  
  return this;
};

// Method to call token
tokenSchema.methods.callToken = async function(room = null, doctor = null) {
  this.status = 'called';
  this.calledAt = new Date();
  
  if (room) this.consultingRoom = room;
  if (doctor) this.assignedDoctor = doctor;
  
  await this.save();
  return this;
};

// Method to start service
tokenSchema.methods.startService = async function() {
  this.status = 'in-progress';
  this.serviceStartedAt = new Date();
  this.actualWaitMinutes = Math.floor((this.serviceStartedAt - this.issuedAt) / (1000 * 60));
  
  await this.save();
  return this;
};

// Method to complete service
tokenSchema.methods.completeService = async function() {
  this.status = 'completed';
  this.serviceCompletedAt = new Date();
  
  await this.save();
  return this;
};

// Method to cancel token
tokenSchema.methods.cancelToken = async function(reason = 'User cancelled', cancelledBy = 'system') {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  this.cancelledAt = new Date();
  
  await this.save();
  return this;
};

// Static method to generate unique token number
tokenSchema.statics.generateTokenNumber = async function(branch = 'main', category = 'general') {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  
  // Get category prefix
  const categoryPrefix = {
    'critical': 'C',
    'urgent': 'U',
    'less-urgent': 'L',
    'non-urgent': 'N'
  }[category] || 'G';
  
  // Find the last token of the day
  const lastToken = await this.findOne({
    tokenNumber: new RegExp(`^${dateStr}-${categoryPrefix}`),
    branch
  }).sort({ tokenNumber: -1 });
  
  let sequenceNumber = 1;
  if (lastToken) {
    const lastSequence = parseInt(lastToken.tokenNumber.split('-')[2]);
    sequenceNumber = lastSequence + 1;
  }
  
  const tokenNumber = `${dateStr}-${categoryPrefix}-${String(sequenceNumber).padStart(4, '0')}`;
  return tokenNumber;
};

// Static method to get active queue
tokenSchema.statics.getActiveQueue = async function(branch = 'main', category = null) {
  const query = {
    status: { $in: ['active', 'called'] },
    branch
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .populate('patient', 'firstName lastName phone')
    .sort({ priority: -1, currentPosition: 1 });
};

// Static method to get next token to serve
tokenSchema.statics.getNextToken = async function(branch = 'main', department = null) {
  const query = {
    status: 'active',
    branch
  };
  
  if (department) {
    query.department = department;
  }
  
  return this.findOne(query)
    .populate('patient')
    .sort({ priority: -1, currentPosition: 1 });
};

// Static method to reorder queue after priority change
tokenSchema.statics.reorderQueue = async function(branch = 'main') {
  const tokens = await this.find({
    status: 'active',
    branch
  }).sort({ priority: -1, issuedAt: 1 });
  
  let position = 1;
  for (const token of tokens) {
    if (token.currentPosition !== position) {
      token.positionHistory.push({
        position: token.currentPosition,
        changedAt: new Date(),
        reason: 'Queue reordering'
      });
      token.currentPosition = position;
      await token.save();
    }
    position++;
  }
  
  return tokens;
};

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;
