// services/notificationService.js - Notification Service for SMS/Email/Push
const twilio = require('twilio');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    // Initialize Twilio client for SMS
    this.twilioClient = null;
    this.twilioEnabled = false;
    
    // Initialize Firebase for push notifications
    this.firebaseApp = null;
    this.firebaseEnabled = false;
    
    // Initialize email transporter
    this.emailTransporter = null;
    this.emailEnabled = false;
    
    // Notification templates
    this.templates = {
      tokenIssued: {
        sms: 'Slotify: Your token number is {token}. Current position: {position}. Estimated wait: {wait} mins. Reply CANCEL to cancel.',
        email: {
          subject: 'Your Slotify Token - {token}',
          html: `
            <h2>Welcome to Slotify</h2>
            <p>Your token number is: <strong>{token}</strong></p>
            <p>Current position in queue: <strong>{position}</strong></p>
            <p>Estimated wait time: <strong>{wait} minutes</strong></p>
            <p>You will receive updates as your turn approaches.</p>
          `
        },
        push: {
          title: 'Token Issued - {token}',
          body: 'Position {position} | Wait time: {wait} mins'
        }
      },
      
      positionChanged: {
        sms: 'Slotify: Your position updated. Token: {token}, New position: {position}, Wait: {wait} mins',
        email: {
          subject: 'Queue Position Updated - Token {token}',
          html: `
            <h3>Your Queue Position Has Changed</h3>
            <p>Token: <strong>{token}</strong></p>
            <p>New position: <strong>{position}</strong></p>
            <p>Estimated wait: <strong>{wait} minutes</strong></p>
          `
        },
        push: {
          title: 'Position Updated',
          body: 'New position: {position} | Wait: {wait} mins'
        }
      },
      
      turnApproaching: {
        sms: 'Slotify Alert: Your turn is approaching! Token {token}. You are position {position}. Please be ready.',
        email: {
          subject: 'Your Turn is Approaching - Token {token}',
          html: `
            <h2 style="color: orange;">Your Turn is Approaching!</h2>
            <p>Token: <strong>{token}</strong></p>
            <p>Current position: <strong>{position}</strong></p>
            <p>Please make your way to the waiting area.</p>
          `
        },
        push: {
          title: '⚠️ Turn Approaching!',
          body: 'Token {token} - Position {position} - Please be ready'
        }
      },
      
      tokenCalled: {
        sms: 'Slotify: YOUR TURN NOW! Token {token}. Please proceed to {room}. Doctor: {doctor}',
        email: {
          subject: 'YOUR TURN NOW - Token {token}',
          html: `
            <h1 style="color: green;">IT'S YOUR TURN!</h1>
            <p>Token: <strong>{token}</strong></p>
            <p>Please proceed to: <strong>{room}</strong></p>
            <p>Doctor: <strong>{doctor}</strong></p>
          `
        },
        push: {
          title: '🔔 YOUR TURN NOW!',
          body: 'Token {token} - Proceed to {room}'
        }
      },
      
      tokenCancelled: {
        sms: 'Slotify: Your token {token} has been cancelled. Reason: {reason}',
        email: {
          subject: 'Token Cancelled - {token}',
          html: `
            <h3>Token Cancellation</h3>
            <p>Your token <strong>{token}</strong> has been cancelled.</p>
            <p>Reason: <strong>{reason}</strong></p>
            <p>Please book a new appointment if needed.</p>
          `
        },
        push: {
          title: 'Token Cancelled',
          body: 'Token {token} cancelled: {reason}'
        }
      },
      
      reminder: {
        sms: 'Slotify Reminder: Token {token}, Position {position}, Est. wait: {wait} mins',
        email: {
          subject: 'Queue Reminder - Token {token}',
          html: `
            <h3>Queue Status Reminder</h3>
            <p>Token: <strong>{token}</strong></p>
            <p>Position: <strong>{position}</strong></p>
            <p>Estimated wait: <strong>{wait} minutes</strong></p>
          `
        },
        push: {
          title: 'Queue Reminder',
          body: 'Token {token} - Position {position}'
        }
      }
    };
    
    // Initialize services
    this.initialize();
  }
  
  // Initialize notification services
  async initialize() {
    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        this.twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        this.twilioEnabled = true;
        console.log('✅ Twilio SMS service initialized');
      } catch (error) {
        console.error('❌ Error initializing Twilio:', error.message);
      }
    } else {
      console.log('⚠️ Twilio credentials not found - SMS disabled');
    }
    
    // Initialize Firebase
    if (process.env.FIREBASE_PROJECT_ID) {
      try {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
        this.firebaseEnabled = true;
        console.log('✅ Firebase push notification service initialized');
      } catch (error) {
        console.error('❌ Error initializing Firebase:', error.message);
      }
    } else {
      console.log('⚠️ Firebase credentials not found - Push notifications disabled');
    }
    
    // Initialize Email (using Gmail as example, can be changed to SendGrid)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        this.emailTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
        this.emailEnabled = true;
        console.log('✅ Email service initialized');
      } catch (error) {
        console.error('❌ Error initializing email:', error.message);
      }
    } else {
      console.log('⚠️ Email credentials not found - Email notifications disabled');
    }
  }
  
  // Send notification based on patient preferences
  async sendNotification(patient, templateName, data) {
    const results = {
      sms: null,
      email: null,
      push: null
    };
    
    const template = this.templates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }
    
    // Send SMS if enabled and preferred
    if (patient.notificationPreferences?.sms && patient.phone) {
      results.sms = await this.sendSMS(patient.phone, template.sms, data);
    }
    
    // Send Email if enabled and preferred
    if (patient.notificationPreferences?.email && patient.email) {
      results.email = await this.sendEmail(patient.email, template.email, data);
    }
    
    // Send Push if enabled and preferred
    if (patient.notificationPreferences?.push && patient.fcmToken) {
      results.push = await this.sendPushNotification(patient.fcmToken, template.push, data);
    }
    
    return results;
  }
  
  // Send SMS notification
  async sendSMS(phoneNumber, template, data) {
    if (!this.twilioEnabled) {
      console.log('SMS service not available');
      return { success: false, error: 'SMS service not configured' };
    }
    
    try {
      // Replace placeholders in template
      let message = this.replacePlaceholders(template, data);
      
      // Ensure message is under 160 characters for single SMS
      if (message.length > 160) {
        message = message.substring(0, 157) + '...';
      }
      
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      
      console.log(`✅ SMS sent to ${phoneNumber}: ${result.sid}`);
      return { 
        success: true, 
        messageId: result.sid,
        method: 'sms'
      };
    } catch (error) {
      console.error(`❌ Error sending SMS to ${phoneNumber}:`, error.message);
      return { 
        success: false, 
        error: error.message,
        method: 'sms'
      };
    }
  }
  
  // Send Email notification
  async sendEmail(email, template, data) {
    if (!this.emailEnabled) {
      console.log('Email service not available');
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      const subject = this.replacePlaceholders(template.subject, data);
      const html = this.replacePlaceholders(template.html, data);
      
      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@slotify.com',
        to: email,
        subject: subject,
        html: html
      };
      
      const result = await this.emailTransporter.sendMail(mailOptions);
      
      console.log(`✅ Email sent to ${email}: ${result.messageId}`);
      return { 
        success: true, 
        messageId: result.messageId,
        method: 'email'
      };
    } catch (error) {
      console.error(`❌ Error sending email to ${email}:`, error.message);
      return { 
        success: false, 
        error: error.message,
        method: 'email'
      };
    }
  }
  
  // Send Push notification
  async sendPushNotification(fcmToken, template, data) {
    if (!this.firebaseEnabled) {
      console.log('Push notification service not available');
      return { success: false, error: 'Push service not configured' };
    }
    
    try {
      const title = this.replacePlaceholders(template.title, data);
      const body = this.replacePlaceholders(template.body, data);
      
      const message = {
        notification: {
          title: title,
          body: body
        },
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
        token: fcmToken
      };
      
      const result = await admin.messaging().send(message);
      
      console.log(`✅ Push notification sent: ${result}`);
      return { 
        success: true, 
        messageId: result,
        method: 'push'
      };
    } catch (error) {
      console.error(`❌ Error sending push notification:`, error.message);
      return { 
        success: false, 
        error: error.message,
        method: 'push'
      };
    }
  }
  
  // Broadcast notification to multiple patients
  async broadcastNotification(patients, templateName, commonData) {
    const results = [];
    
    for (const patient of patients) {
      const data = {
        ...commonData,
        token: patient.currentToken?.tokenNumber || 'N/A',
        position: patient.currentToken?.currentPosition || 'N/A'
      };
      
      const result = await this.sendNotification(patient, templateName, data);
      results.push({
        patientId: patient._id,
        results: result
      });
    }
    
    return results;
  }
  
  // Send batch SMS (more efficient for large numbers)
  async sendBatchSMS(phoneNumbers, template, data) {
    if (!this.twilioEnabled) {
      return { success: false, error: 'SMS service not configured' };
    }
    
    const results = [];
    const message = this.replacePlaceholders(template, data);
    
    // Twilio allows sending to multiple numbers
    const promises = phoneNumbers.map(phone => 
      this.sendSMS(phone, template, data)
    );
    
    const batchResults = await Promise.allSettled(promises);
    
    batchResults.forEach((result, index) => {
      results.push({
        phone: phoneNumbers[index],
        ...result.value || result.reason
      });
    });
    
    return results;
  }
  
  // Replace placeholders in template
  replacePlaceholders(template, data) {
    let result = template;
    
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{${key}}`, 'g');
      result = result.replace(placeholder, value);
    }
    
    return result;
  }
  
  // Schedule notification for later
  async scheduleNotification(patient, templateName, data, scheduledTime) {
    // This would typically use a job queue like Bull
    // For now, using setTimeout for demonstration
    const delay = new Date(scheduledTime) - new Date();
    
    if (delay <= 0) {
      // Send immediately if scheduled time has passed
      return this.sendNotification(patient, templateName, data);
    }
    
    setTimeout(async () => {
      await this.sendNotification(patient, templateName, data);
    }, delay);
    
    return { 
      scheduled: true, 
      scheduledFor: scheduledTime,
      delay: delay 
    };
  }
  
  // Send reminder notifications
  async sendReminders(minutesBeforeTurn = 15) {
    // This would be called by a cron job
    // Find patients whose turn is approaching
    const Patient = require('../models/Patient');
    const Token = require('../models/Token');
    
    const tokens = await Token.find({
      status: 'active',
      currentPosition: { $lte: 3 }, // Top 3 in queue
      lastNotificationAt: {
        $lt: new Date(Date.now() - 10 * 60 * 1000) // Last notified > 10 mins ago
      }
    }).populate('patient');
    
    const results = [];
    
    for (const token of tokens) {
      if (token.currentPosition === 1) {
        // Next in line - send approaching notification
        const result = await this.sendNotification(
          token.patient,
          'turnApproaching',
          {
            token: token.tokenNumber,
            position: token.currentPosition,
            wait: token.estimatedWaitMinutes
          }
        );
        results.push(result);
      } else {
        // Send reminder
        const result = await this.sendNotification(
          token.patient,
          'reminder',
          {
            token: token.tokenNumber,
            position: token.currentPosition,
            wait: token.estimatedWaitMinutes
          }
        );
        results.push(result);
      }
      
      // Update last notification time
      token.lastNotificationAt = new Date();
      await token.save();
    }
    
    return results;
  }
  
  // Test notification services
  async testServices() {
    const testResults = {
      sms: false,
      email: false,
      push: false
    };
    
    // Test SMS
    if (this.twilioEnabled) {
      try {
        const account = await this.twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        testResults.sms = account.status === 'active';
      } catch (error) {
        console.error('SMS test failed:', error.message);
      }
    }
    
    // Test Email
    if (this.emailEnabled) {
      try {
        await this.emailTransporter.verify();
        testResults.email = true;
      } catch (error) {
        console.error('Email test failed:', error.message);
      }
    }
    
    // Test Push
    if (this.firebaseEnabled) {
      testResults.push = true; // Firebase initialized successfully
    }
    
    return testResults;
  }
}

// Export singleton instance
module.exports = new NotificationService();
