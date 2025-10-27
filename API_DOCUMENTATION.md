# 📚 Slotify API Documentation & Free Services Guide

## 🎯 Complete API Setup Guide

### 1. **MongoDB Atlas (Database) - FREE**
```
Website: https://www.mongodb.com/atlas
Free Tier: 512MB storage, shared cluster
How to Get:
1. Sign up at mongodb.com/atlas
2. Create a new cluster (choose free tier)
3. Get connection string from Dashboard
4. Add to .env as MONGODB_URI
```

### 2. **Twilio (SMS) - FREE TRIAL**
```
Website: https://www.twilio.com/try-twilio
Free: $15 credit (~1500 SMS)
How to Get:
1. Sign up at twilio.com
2. Verify phone number
3. Get Account SID from Console Dashboard
4. Get Auth Token from Console Dashboard
5. Get a Twilio phone number (free with trial)
6. Add all three to .env file
```

### 3. **Firebase (Push Notifications) - FREE**
```
Website: https://firebase.google.com
Free Tier: Unlimited notifications
How to Get:
1. Go to Firebase Console
2. Create new project
3. Go to Project Settings
4. Under General tab, find Firebase SDK snippet
5. Copy config values to .env
6. Download service account key for server
```

### 4. **OCR Options - ALL FREE**

#### Option A: Tesseract.js (Recommended - Completely Free)
```javascript
// Already included in package.json
// No API key needed - runs locally
npm install tesseract.js
```

#### Option B: Google Cloud Vision (Free Tier)
```
Website: https://cloud.google.com/vision
Free: 1000 units/month
How to Get:
1. Create Google Cloud account
2. Enable Vision API
3. Create API key
4. Add to .env as GOOGLE_CLOUD_API_KEY
```

### 5. **Medical Symptom Analysis - FREE OPTIONS**

#### Option A: Infermedica (Limited Free)
```
Website: https://developer.infermedica.com
Free: 200 requests/month
How to Get:
1. Sign up for developer account
2. Create new app
3. Get App ID and App Key
4. Add to .env
```

#### Option B: Use Built-in AI (Completely Free)
```javascript
// Our triageEngine.js already includes
// symptom analysis using natural and brain.js
// No external API needed!
```

### 6. **Hosting Options - ALL FREE**

#### Option A: Render
```
Website: https://render.com
Free Tier: 750 hours/month
Deploy:
1. Connect GitHub repo
2. Choose "Web Service"
3. Set build command: npm install
4. Set start command: npm start
```

#### Option B: Railway
```
Website: https://railway.app
Free Tier: $5 credit/month
Deploy:
1. Connect GitHub
2. Deploy directly
3. Add environment variables
```

#### Option C: Vercel (Frontend) + Heroku (Backend)
```
Vercel: https://vercel.com (Frontend hosting)
Heroku: https://heroku.com (Backend - free tier discontinued but student pack available)
```

---

## 🔌 API Endpoints Documentation

### Authentication Endpoints

#### POST /api/auth/register
```javascript
// Request
{
  "email": "patient@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}

// Response
{
  "success": true,
  "token": "JWT_TOKEN",
  "user": { ... }
}
```

#### POST /api/auth/login
```javascript
// Request
{
  "email": "patient@example.com",
  "password": "securePassword123"
}

// Response
{
  "success": true,
  "token": "JWT_TOKEN",
  "user": { ... }
}
```

### Triage Endpoints

#### POST /api/triage/assess
```javascript
// Request
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "symptoms": [
    {
      "symptom": "chest pain",
      "severity": 8,
      "duration": "2 hours",
      "description": "Sharp pain in left chest"
    }
  ],
  "vitalSigns": {
    "bloodPressure": "140/90",
    "heartRate": 95,
    "temperature": 38.5,
    "oxygenSaturation": 96
  },
  "medicalHistory": [
    {
      "condition": "diabetes",
      "status": "active"
    }
  ],
  "consentGiven": true
}

// Response
{
  "success": true,
  "data": {
    "token": {
      "number": "20241223-C-0001",
      "pin": "1234",
      "position": 1,
      "category": "critical"
    },
    "triage": {
      "score": 85,
      "category": "critical",
      "priority": 5,
      "estimatedWait": 0
    }
  }
}
```

#### POST /api/triage/upload-report
```javascript
// Form Data Request
FormData: {
  "report": File (image/pdf),
  "patientId": "patient_id",
  "tokenNumber": "20241223-C-0001",
  "reportType": "blood_test"
}

// Response
{
  "success": true,
  "data": {
    "urgencyScore": 75,
    "summary": "Critical findings detected",
    "criticalFindings": 2,
    "abnormalFindings": 3
  }
}
```

### Queue Management Endpoints

#### GET /api/queue/status
```javascript
// Request
GET /api/queue/status?token=20241223-C-0001

// Response
{
  "success": true,
  "data": {
    "position": 3,
    "estimatedWait": 15,
    "status": "active",
    "ahead": 2
  }
}
```

#### GET /api/queue/current
```javascript
// Response
{
  "success": true,
  "data": {
    "critical": [
      { "token": "...", "position": 1, "wait": 0 }
    ],
    "urgent": [
      { "token": "...", "position": 1, "wait": 15 }
    ],
    "lessUrgent": [],
    "nonUrgent": []
  }
}
```

#### POST /api/queue/call-next
```javascript
// Request (Admin only)
{
  "department": "general",
  "room": "Room 101",
  "doctorId": "doctor_id"
}

// Response
{
  "success": true,
  "data": {
    "token": "20241223-C-0001",
    "patient": { ... }
  }
}
```

### Patient Endpoints

#### GET /api/patients/profile/:id
```javascript
// Response
{
  "success": true,
  "data": {
    "patient": {
      "name": "John Doe",
      "email": "john@example.com",
      "currentToken": { ... },
      "history": [ ... ]
    }
  }
}
```

#### PUT /api/patients/update/:id
```javascript
// Request
{
  "phone": "+9876543210",
  "notificationPreferences": {
    "sms": true,
    "email": false,
    "push": true
  }
}
```

### Admin Endpoints

#### GET /api/admin/dashboard
```javascript
// Response
{
  "success": true,
  "data": {
    "totalPatients": 45,
    "byCategory": {
      "critical": 2,
      "urgent": 8,
      "lessUrgent": 15,
      "nonUrgent": 20
    },
    "avgWaitTime": 35,
    "activeTokens": 45
  }
}
```

---

## 🚀 Quick Start Commands

```bash
# 1. Clone and install
git clone <your-repo>
cd slotify
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your API keys

# 3. Create required directories
mkdir -p uploads/reports

# 4. Start MongoDB (local)
mongod

# 5. Run server
npm run dev

# 6. Access API
http://localhost:3000/api/health
```

---

## 🎨 Frontend Integration Example

```javascript
// Using Axios
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

// Submit triage form
async function submitTriage(patientData) {
  try {
    const response = await axios.post(`${API_URL}/triage/assess`, patientData);
    return response.data;
  } catch (error) {
    console.error('Triage error:', error);
  }
}

// Check queue status
async function checkQueueStatus(tokenNumber) {
  try {
    const response = await axios.get(`${API_URL}/queue/status?token=${tokenNumber}`);
    return response.data;
  } catch (error) {
    console.error('Queue status error:', error);
  }
}

// Socket.io for real-time updates
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Join token room for updates
socket.emit('join-token-room', tokenId);

// Listen for updates
socket.on('token-update', (data) => {
  console.log('Token updated:', data);
  updateUI(data);
});
```

---

## 💡 Pro Tips

### 1. **Start with Free Tiers**
- Use Tesseract.js for OCR (no API needed)
- Use built-in triage engine (no external API)
- Start with MongoDB Atlas free tier
- Use Render.com for free hosting

### 2. **Student Benefits**
- GitHub Student Pack: Free credits for many services
- Google Cloud: $300 free credit
- AWS Educate: Free credits
- Microsoft Azure: $100 free credit

### 3. **Development Tips**
```bash
# Use ngrok for webhook testing
npx ngrok http 3000

# Use nodemon for auto-reload
npm run dev

# Test SMS without Twilio
# Console.log notifications in development
```

### 4. **Security Best Practices**
- Never commit .env file
- Use environment variables in production
- Enable CORS only for your frontend
- Use rate limiting
- Implement input validation
- Use HTTPS in production

---

## 📞 Support & Resources

### Official Documentation
- MongoDB: https://docs.mongodb.com
- Twilio: https://www.twilio.com/docs
- Firebase: https://firebase.google.com/docs
- Express.js: https://expressjs.com
- Socket.io: https://socket.io/docs

### Community Help
- Stack Overflow: Tag with [slotify]
- GitHub Issues: Report bugs
- Discord/Slack: Join developer communities

### Video Tutorials
- YouTube: Search "MERN stack medical app"
- Udemy: "Building Healthcare Apps"
- FreeCodeCamp: MERN tutorials

---

## 🎉 Congratulations!

You now have everything needed to build and deploy Slotify:
- ✅ Complete backend code
- ✅ AI-powered triage system
- ✅ Real-time notifications
- ✅ OCR for test reports
- ✅ Queue management
- ✅ All with FREE services!

Start building and help improve healthcare accessibility! 🏥
