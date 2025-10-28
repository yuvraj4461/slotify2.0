// routes/queue.js - Queue Management API Routes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Import models
const Patient = require('../models/Patient');
const Token = require('../models/Token');

// Import services
const notificationService = require('../services/notificationService');

// GET /api/queue/status - Check queue status by token
router.get('/status', async (req, res) => {
  try {
    const { token: tokenNumber, pin } = req.query;
    
    if (!tokenNumber) {
      return res.status(400).json({
        success: false,
        message: 'Token number is required'
      });
    }
    
    // Find token
    const token = await Token.findOne({ 
      tokenNumber,
      status: { $in: ['active', 'called'] }
    }).populate('patient', 'firstName lastName phone email');
    
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found or expired'
      });
    }
    
    // Verify PIN if provided
    if (pin && token.securityPin !== pin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid security PIN'
      });
    }
    
    // Calculate current position and wait time
    const aheadCount = await Token.countDocuments({
      status: 'active',
      category: token.category,
      currentPosition: { $lt: token.currentPosition },
      branch: token.branch
    });
    
    // Get average service time for estimation
    const completedTokens = await Token.find({
      status: 'completed',
      category: token.category,
      actualWaitMinutes: { $exists: true }
    }).limit(10);
    
    const avgServiceTime = completedTokens.length > 0
      ? completedTokens.reduce((sum, t) => sum + t.actualWaitMinutes, 0) / completedTokens.length
      : 15; // Default 15 minutes
    
    const estimatedWait = Math.round(aheadCount * avgServiceTime);
    
    res.json({
      success: true,
      data: {
        token: {
          number: token.tokenNumber,
          displayNumber: token.displayNumber,
          category: token.category,
          status: token.status
        },
        queue: {
          currentPosition: token.currentPosition,
          peopleAhead: aheadCount,
          estimatedWaitMinutes: estimatedWait,
          issuedAt: token.issuedAt,
          currentWaitTime: token.currentWaitTime
        },
        patient: {
          name: token.patient.fullName,
          notified: token.lastNotificationAt
        },
        consultingRoom: token.consultingRoom,
        assignedDoctor: token.assignedDoctor
      }
    });
    
  } catch (error) {
    console.error('Queue status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching queue status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/queue/current - Get current queue for display
router.get('/current', async (req, res) => {
  try {
    const { branch = 'main', department } = req.query;
    
    // Build query
    const query = {
      status: { $in: ['active', 'called'] },
      branch
    };
    
    if (department) {
      query.department = department;
    }
    
    // Get tokens by category
    const [critical, urgent, lessUrgent, nonUrgent] = await Promise.all([
      Token.find({ ...query, category: 'critical' })
        .populate('patient', 'firstName lastName')
        .sort({ currentPosition: 1 })
        .limit(10),
      Token.find({ ...query, category: 'urgent' })
        .populate('patient', 'firstName lastName')
        .sort({ currentPosition: 1 })
        .limit(10),
      Token.find({ ...query, category: 'less-urgent' })
        .populate('patient', 'firstName lastName')
        .sort({ currentPosition: 1 })
        .limit(10),
      Token.find({ ...query, category: 'non-urgent' })
        .populate('patient', 'firstName lastName')
        .sort({ currentPosition: 1 })
        .limit(10)
    ]);
    
    // Format response
    const formatTokens = (tokens) => tokens.map(token => ({
      tokenNumber: token.tokenNumber,
      displayNumber: token.displayNumber,
      position: token.currentPosition,
      patientInitials: token.patient ? 
        `${token.patient.firstName[0]}. ${token.patient.lastName[0]}.` : 'N/A',
      waitTime: token.estimatedWaitMinutes,
      status: token.status,
      room: token.consultingRoom
    }));
    
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        branch,
        queues: {
          critical: formatTokens(critical),
          urgent: formatTokens(urgent),
          lessUrgent: formatTokens(lessUrgent),
          nonUrgent: formatTokens(nonUrgent)
        },
        statistics: {
          totalWaiting: critical.length + urgent.length + lessUrgent.length + nonUrgent.length,
          criticalCount: critical.length,
          urgentCount: urgent.length,
          lessUrgentCount: lessUrgent.length,
          nonUrgentCount: nonUrgent.length
        }
      }
    });
    
  } catch (error) {
    console.error('Get current queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching current queue',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/queue/call-next - Call next patient (Admin/Staff only)
router.post('/call-next', [
  body('department').optional(),
  body('room').notEmpty(),
  body('doctorId').optional()
], async (req, res) => {
  try {
    const { department, room, doctorId } = req.body;
    
    // Get next token in queue
    const nextToken = await Token.getNextToken('main', department);
    
    if (!nextToken) {
      return res.status(404).json({
        success: false,
        message: 'No patients waiting in queue'
      });
    }
    
    // Call the token
    await nextToken.callToken(room, doctorId);
    
    // Update patient status
    const patient = nextToken.patient;
    patient.status = 'in-consultation';
    await patient.save();
    
    // Send notification to patient
    await notificationService.sendNotification(
      patient,
      'tokenCalled',
      {
        token: nextToken.tokenNumber,
        room: room,
        doctor: doctorId || 'Available Doctor'
      }
    );
    
    // Emit socket event
    const io = req.app.get('io');
    io.emit('token-called', {
      tokenNumber: nextToken.tokenNumber,
      room: room,
      category: nextToken.category
    });
    
    // Notify specific patient room
    io.to(`token-${nextToken._id}`).emit('your-turn', {
      message: 'Your turn has arrived!',
      room: room
    });
    
    res.json({
      success: true,
      message: 'Patient called successfully',
      data: {
        token: nextToken.tokenNumber,
        patient: {
          id: patient._id,
          name: patient.fullName,
          phone: patient.phone
        },
        room: room,
        category: nextToken.category
      }
    });
    
  } catch (error) {
    console.error('Call next patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calling next patient',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/queue/complete - Mark token as completed
router.post('/complete', [
  body('tokenNumber').notEmpty(),
  body('notes').optional()
], async (req, res) => {
  try {
    const { tokenNumber, notes } = req.body;
    
    const token = await Token.findOne({ tokenNumber })
      .populate('patient');
    
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }
    
    // Complete the service
    await token.completeService();
    
    // Update patient
    token.patient.status = 'completed';
    token.patient.consultationEndTime = new Date();
    if (notes) {
      token.patient.notes = notes;
    }
    await token.patient.save();
    
    // Emit socket event
    const io = req.app.get('io');
    io.emit('token-completed', {
      tokenNumber: token.tokenNumber,
      category: token.category
    });
    
    // Trigger queue reordering
    await Token.reorderQueue(token.branch);
    
    res.json({
      success: true,
      message: 'Consultation completed',
      data: {
        token: token.tokenNumber,
        serviceTime: token.actualWaitMinutes,
        completedAt: token.serviceCompletedAt
      }
    });
    
  } catch (error) {
    console.error('Complete token error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing consultation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/queue/cancel - Cancel a token
router.post('/cancel', [
  body('tokenNumber').notEmpty(),
  body('reason').notEmpty(),
  body('pin').notEmpty()
], async (req, res) => {
  try {
    const { tokenNumber, reason, pin } = req.body;
    
    const token = await Token.findOne({ tokenNumber })
      .populate('patient');
    
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }
    
    // Verify PIN
    if (token.securityPin !== pin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid security PIN'
      });
    }
    
    // Cancel token
    await token.cancelToken(reason, 'patient');
    
    // Update patient
    token.patient.status = 'cancelled';
    await token.patient.save();
    
    // Send confirmation notification
    await notificationService.sendNotification(
      token.patient,
      'tokenCancelled',
      {
        token: token.tokenNumber,
        reason: reason
      }
    );
    
    // Emit socket event
    const io = req.app.get('io');
    io.emit('token-cancelled', {
      tokenNumber: token.tokenNumber,
      category: token.category
    });
    
    // Reorder queue
    await Token.reorderQueue(token.branch);
    
    res.json({
      success: true,
      message: 'Token cancelled successfully',
      data: {
        token: token.tokenNumber,
        cancelledAt: token.cancelledAt
      }
    });
    
  } catch (error) {
    console.error('Cancel token error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/queue/statistics - Get queue statistics
router.get('/statistics', async (req, res) => {
  try {
    const { branch = 'main', date } = req.query;
    
    // Date range for today or specified date
    const startDate = date ? new Date(date) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    
    // Aggregate statistics
    const stats = await Token.aggregate([
      {
        $match: {
          branch,
          issuedAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: 1 },
          completedTokens: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledTokens: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          activeTokens: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          avgWaitTime: { $avg: '$actualWaitMinutes' },
          maxWaitTime: { $max: '$actualWaitMinutes' },
          minWaitTime: { $min: '$actualWaitMinutes' }
        }
      }
    ]);
    
    // Category breakdown
    const categoryStats = await Token.aggregate([
      {
        $match: {
          branch,
          issuedAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgWaitTime: { $avg: '$actualWaitMinutes' }
        }
      }
    ]);
    
    // Hourly distribution
    const hourlyStats = await Token.aggregate([
      {
        $match: {
          branch,
          issuedAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: { $hour: '$issuedAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        date: startDate.toISOString().split('T')[0],
        branch,
        overall: stats[0] || {
          totalTokens: 0,
          completedTokens: 0,
          cancelledTokens: 0,
          activeTokens: 0,
          avgWaitTime: 0,
          maxWaitTime: 0,
          minWaitTime: 0
        },
        byCategory: categoryStats,
        hourlyDistribution: hourlyStats.map(h => ({
          hour: h._id,
          count: h.count
        })),
        efficiency: stats[0] ? 
          Math.round((stats[0].completedTokens / stats[0].totalTokens) * 100) : 0
      }
    });
    
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/queue/notify-approaching - Send notifications to approaching patients
router.post('/notify-approaching', async (req, res) => {
  try {
    const { positions = 3 } = req.body;
    
    // Find patients in top positions
    const approachingTokens = await Token.find({
      status: 'active',
      currentPosition: { $lte: positions }
    }).populate('patient');
    
    const notifications = [];
    
    for (const token of approachingTokens) {
      const result = await notificationService.sendNotification(
        token.patient,
        'turnApproaching',
        {
          token: token.tokenNumber,
          position: token.currentPosition,
          wait: Math.max(5, token.currentPosition * 5) // Estimate 5 mins per position
        }
      );
      
      notifications.push({
        token: token.tokenNumber,
        patient: token.patient.fullName,
        sent: result
      });
      
      // Update last notification time
      token.lastNotificationAt = new Date();
      await token.save();
    }
    
    res.json({
      success: true,
      message: `Notified ${notifications.length} patients`,
      data: notifications
    });
    
  } catch (error) {
    console.error('Notify approaching error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
