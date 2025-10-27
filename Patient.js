// models/Patient.js - Patient Data Model
const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    required: true
  },
  
  // Medical Information
  symptoms: [{
    symptom: String,
    severity: {
      type: Number,
      min: 1,
      max: 10
    },
    duration: String,
    description: String
  }],
  
  vitalSigns: {
    bloodPressure: String,
    heartRate: Number,
    temperature: Number,
    oxygenSaturation: Number,
    respiratoryRate: Number
  },
  
  medicalHistory: [{
    condition: String,
    diagnosedDate: Date,
    status: {
      type: String,
      enum: ['active', 'resolved', 'managed']
    }
  }],
  
  allergies: [String],
  
  currentMedications: [{
    name: String,
    dosage: String,
    frequency: String
  }],
  
  // Test Reports
  testReports: [{
    reportType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    fileUrl: String,
    ocrExtractedText: String,
    findings: mongoose.Schema.Types.Mixed
  }],
  
  // Triage Information
  triageScore: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  
  triageCategory: {
    type: String,
    enum: ['critical', 'urgent', 'less-urgent', 'non-urgent'],
    default: 'non-urgent'
  },
  
  triageNotes: String,
  
  // Token Information
  currentToken: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token'
  },
  
  tokenHistory: [{
    tokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Token'
    },
    assignedAt: Date,
    completedAt: Date
  }],
  
  // Status
  status: {
    type: String,
    enum: ['waiting', 'in-consultation', 'completed', 'cancelled'],
    default: 'waiting'
  },
  
  estimatedWaitTime: {
    type: Number, // in minutes
    default: 0
  },
  
  // Notifications
  notificationPreferences: {
    sms: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    }
  },
  
  fcmToken: String, // Firebase Cloud Messaging token for push notifications
  
  // Timestamps
  checkInTime: {
    type: Date,
    default: Date.now
  },
  consultationStartTime: Date,
  consultationEndTime: Date,
  
  // Additional Information
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  
  insuranceInfo: {
    provider: String,
    policyNumber: String,
    groupNumber: String
  },
  
  notes: String,
  
  // Privacy & Consent
  consentGiven: {
    type: Boolean,
    required: true,
    default: false
  },
  
  consentDate: Date,
  
  // Location (for multi-branch support)
  branch: {
    type: String,
    default: 'main'
  }
  
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
patientSchema.index({ email: 1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ status: 1 });
patientSchema.index({ triageCategory: 1 });
patientSchema.index({ checkInTime: 1 });

// Virtual for patient's full name
patientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for patient's age
patientSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Method to calculate wait time
patientSchema.methods.calculateWaitTime = function() {
  if (!this.checkInTime) return 0;
  const now = new Date();
  const waitTimeMs = now - this.checkInTime;
  return Math.floor(waitTimeMs / (1000 * 60)); // Return in minutes
};

// Static method to find patients by status
patientSchema.statics.findByStatus = function(status) {
  return this.find({ status });
};

// Static method to get queue position
patientSchema.statics.getQueuePosition = async function(patientId) {
  const patient = await this.findById(patientId);
  if (!patient) return null;
  
  const waitingPatients = await this.find({
    status: 'waiting',
    checkInTime: { $lt: patient.checkInTime },
    triageCategory: patient.triageCategory
  }).countDocuments();
  
  return waitingPatients + 1;
};

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
