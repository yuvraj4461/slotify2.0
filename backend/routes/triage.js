// routes/triage.js - Triage API Routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');

// Import models
const Patient = require('../models/Patient');
const Token = require('../models/Token');

// Import services
const triageEngine = require('../services/triageEngine');
const ocrService = require('../services/ocrService');
const notificationService = require('../services/notificationService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/reports/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `report-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

// POST /api/triage/assess - Main triage assessment endpoint
router.post('/assess', [
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('phone').notEmpty().trim(),
  body('dateOfBirth').isISO8601(),
  body('gender').isIn(['male', 'female', 'other', 'prefer-not-to-say']),
  body('symptoms').isArray().notEmpty(),
  body('consentGiven').isBoolean().equals('true')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const patientData = req.body;
    
    // Check if patient already exists
    let patient = await Patient.findOne({ email: patientData.email });
    
    if (patient && patient.status === 'waiting') {
      return res.status(400).json({
        success: false,
        message: 'You already have an active token. Please check your status.',
        tokenNumber: patient.currentToken?.tokenNumber
      });
    }
    
    // Create or update patient record
    if (!patient) {
      patient = new Patient(patientData);
    } else {
      // Update existing patient data
      Object.assign(patient, patientData);
    }
    
    // Calculate age for triage
    const birthDate = new Date(patientData.dateOfBirth);
    const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    
    // Perform triage assessment
    const triageResult = await triageEngine.assessPatient({
      symptoms: patientData.symptoms,
      vitalSigns: patientData.vitalSigns,
      age: age,
      medicalHistory: patientData.medicalHistory,
      duration: patientData.symptomDuration
    });
    
    // Update patient with triage results
    patient.triageScore = triageResult.priority;
    patient.triageCategory = triageResult.category;
    patient.triageNotes = triageResult.notes;
    patient.status = 'waiting';
    patient.checkInTime = new Date();
    patient.estimatedWaitTime = triageResult.estimatedWait;
    
    // Save patient
    await patient.save();
    
    // Generate token
    const tokenNumber = await Token.generateTokenNumber('main', triageResult.category);
    
    // Get current queue position
    const queueLength = await Token.countDocuments({
      status: 'active',
      category: triageResult.category,
      branch: 'main'
    });
    
    // Create token
    const token = new Token({
      tokenNumber: tokenNumber,
      displayNumber: parseInt(tokenNumber.split('-')[2]),
      patient: patient._id,
      priority: triageResult.priority,
      category: triageResult.category,
      originalPosition: queueLength + 1,
      currentPosition: queueLength + 1,
      estimatedWaitMinutes: triageResult.estimatedWait,
      securityPin: Math.floor(1000 + Math.random() * 9000).toString(),
      branch: patientData.branch || 'main'
    });
    
    await token.save();
    
    // Update patient with token reference
    patient.currentToken = token._id;
    patient.tokenHistory.push({
      tokenId: token._id,
      assignedAt: new Date()
    });
    await patient.save();
    
    // Reorder queue if needed (for critical cases)
    if (triageResult.category === 'critical') {
      await Token.reorderQueue('main');
    }
    
    // Send notification to patient
    await notificationService.sendNotification(
      patient,
      'tokenIssued',
      {
        token: token.tokenNumber,
        position: token.currentPosition,
        wait: token.estimatedWaitMinutes
      }
    );
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    io.emit('queue-update', {
      type: 'new-patient',
      category: triageResult.category,
      queueLength: queueLength + 1
    });
    
    res.status(201).json({
      success: true,
      message: 'Triage assessment complete',
      data: {
        token: {
          number: token.tokenNumber,
          displayNumber: token.displayNumber,
          pin: token.securityPin,
          position: token.currentPosition,
          category: token.category
        },
        triage: {
          score: triageResult.score,
          category: triageResult.category,
          priority: triageResult.priority,
          estimatedWait: triageResult.estimatedWait,
          breakdown: triageResult.breakdown
        },
        patient: {
          id: patient._id,
          name: patient.fullName,
          status: patient.status
        }
      }
    });
    
  } catch (error) {
    console.error('Triage assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing triage assessment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/triage/upload-report - Upload and analyze test report
router.post('/upload-report', upload.single('report'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const { patientId, tokenNumber } = req.body;
    
    // Find patient
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Analyze report using OCR
    const ocrResult = await ocrService.analyzeReport(req.file.path);
    
    // Add report to patient record
    patient.testReports.push({
      reportType: req.body.reportType || 'general',
      fileUrl: req.file.path,
      ocrExtractedText: ocrResult.cleanedText,
      findings: {
        urgencyScore: ocrResult.urgencyScore,
        summary: ocrResult.summary,
        criticalFindings: ocrResult.findings.critical,
        abnormalFindings: ocrResult.findings.abnormal,
        testResults: ocrResult.testResults,
        vitalSigns: ocrResult.vitalSigns
      }
    });
    
    // Re-assess triage if report shows critical findings
    if (ocrResult.urgencyScore >= 60) {
      const newTriageResult = await triageEngine.assessPatient({
        symptoms: patient.symptoms,
        vitalSigns: { ...patient.vitalSigns, ...ocrResult.vitalSigns },
        age: patient.age,
        medicalHistory: patient.medicalHistory,
        testReports: patient.testReports
      });
      
      // Update patient and token if priority changed
      if (newTriageResult.priority > patient.triageScore) {
        patient.triageScore = newTriageResult.priority;
        patient.triageCategory = newTriageResult.category;
        patient.triageNotes += `\n\nUPDATED after report analysis:\n${newTriageResult.notes}`;
        
        // Update token priority
        const token = await Token.findById(patient.currentToken);
        if (token) {
          token.priority = newTriageResult.priority;
          token.category = newTriageResult.category;
          await token.save();
          
          // Reorder queue
          await Token.reorderQueue('main');
          
          // Notify patient of position change
          await notificationService.sendNotification(
            patient,
            'positionChanged',
            {
              token: token.tokenNumber,
              position: token.currentPosition,
              wait: token.estimatedWaitMinutes
            }
          );
        }
      }
    }
    
    await patient.save();
    
    res.json({
      success: true,
      message: 'Report analyzed successfully',
      data: {
        urgencyScore: ocrResult.urgencyScore,
        summary: ocrResult.summary,
        criticalFindings: ocrResult.findings.critical.length,
        abnormalFindings: ocrResult.findings.abnormal.length,
        triageUpdated: ocrResult.urgencyScore >= 60
      }
    });
    
  } catch (error) {
    console.error('Report upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/triage/update-vitals - Update vital signs
router.post('/update-vitals', [
  body('patientId').notEmpty(),
  body('vitalSigns').isObject()
], async (req, res) => {
  try {
    const { patientId, vitalSigns } = req.body;
    
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Update vital signs
    patient.vitalSigns = { ...patient.vitalSigns, ...vitalSigns };
    
    // Re-assess triage
    const triageResult = await triageEngine.assessPatient({
      symptoms: patient.symptoms,
      vitalSigns: patient.vitalSigns,
      age: patient.age,
      medicalHistory: patient.medicalHistory
    });
    
    // Update if priority changed
    if (triageResult.priority !== patient.triageScore) {
      patient.triageScore = triageResult.priority;
      patient.triageCategory = triageResult.category;
      patient.triageNotes += `\n\nVitals update: ${JSON.stringify(vitalSigns)}`;
      
      // Update token
      const token = await Token.findById(patient.currentToken);
      if (token) {
        token.priority = triageResult.priority;
        token.category = triageResult.category;
        await token.save();
        
        // Reorder queue
        await Token.reorderQueue('main');
      }
    }
    
    await patient.save();
    
    res.json({
      success: true,
      message: 'Vital signs updated',
      data: {
        vitalSigns: patient.vitalSigns,
        triageCategory: patient.triageCategory,
        triageScore: patient.triageScore
      }
    });
    
  } catch (error) {
    console.error('Update vitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating vital signs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/triage/categories - Get triage category statistics
router.get('/categories', async (req, res) => {
  try {
    const stats = await Patient.aggregate([
      { $match: { status: 'waiting' } },
      {
        $group: {
          _id: '$triageCategory',
          count: { $sum: 1 },
          avgWaitTime: { $avg: '$estimatedWaitTime' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching triage categories'
    });
  }
});

module.exports = router;
