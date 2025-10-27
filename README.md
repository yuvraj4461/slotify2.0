# 🏥 Slotify - Intelligent Medical Triage System

## Overview
Slotify is an AI-powered medical triage system that automatically assigns and manages patient queue tokens based on medical urgency.

## Features
- 🔍 Symptom analysis using NLP
- 📄 Test report OCR scanning
- 🎯 Priority-based queue management
- 📱 Real-time token updates
- 🔔 SMS/Push notifications
- 📊 Dashboard for staff

## Tech Stack
- **Backend**: Node.js + Express
- **Database**: MongoDB (or PostgreSQL)
- **Frontend**: React.js
- **AI/ML**: TensorFlow.js, Tesseract.js
- **Real-time**: Socket.io
- **Notifications**: Twilio (SMS), Firebase (Push)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up Environment Variables
Copy `.env.example` to `.env` and fill in your API keys

### 3. Start MongoDB
```bash
mongod
```

### 4. Run the Backend
```bash
cd backend
npm start
```

### 5. Run the Frontend
```bash
cd frontend
npm start
```

## Project Structure
```
slotify/
├── backend/
│   ├── server.js
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── Patient.js
│   │   └── Token.js
│   ├── routes/
│   │   ├── triage.js
│   │   └── queue.js
│   ├── services/
│   │   ├── triageEngine.js
│   │   ├── ocrService.js
│   │   └── notificationService.js
│   └── middleware/
│       └── auth.js
├── frontend/
│   ├── App.js
│   ├── PatientForm.js
│   ├── QueueDisplay.js
│   └── AdminDashboard.js
├── .env.example
├── package.json
└── README.md
```

## Free APIs & Services

### Essential (Free Tier Available)
1. **MongoDB Atlas** - Database (512MB free)
2. **Tesseract.js** - OCR (Completely free, runs locally)
3. **Twilio** - SMS ($15 free credit)
4. **Firebase** - Push notifications (Free tier)
5. **Render/Railway** - Hosting (Free tier)

### Optional Upgrades
- **Infermedica API** - Medical symptom checker
- **Google Cloud Vision** - Better OCR
- **SendGrid** - Email notifications

## Security & Compliance
- HIPAA compliance guidelines included
- End-to-end encryption
- Secure token generation
- Role-based access control

## License
MIT License - See LICENSE file for details
