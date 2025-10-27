# 🚀 Slotify Deployment Guide - Step by Step

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Free API Keys Setup](#free-api-keys-setup)
3. [Production Deployment](#production-deployment)
4. [Testing the System](#testing-the-system)
5. [Troubleshooting](#troubleshooting)

---

## 1. Local Development Setup

### Prerequisites
- Node.js 16+ installed
- MongoDB installed locally OR MongoDB Atlas account
- Git installed

### Step-by-Step Installation

```bash
# Step 1: Create project directory
mkdir slotify
cd slotify

# Step 2: Copy all the provided files to your project directory

# Step 3: Install dependencies
npm install

# Step 4: Create required directories
mkdir -p uploads/reports
mkdir -p frontend
mkdir -p backend/{routes,models,services,config,middleware}

# Step 5: Organize files into proper structure
# Move backend files:
mv server.js backend/
mv database.js backend/config/
mv Patient.js Token.js backend/models/
mv triageEngine.js ocrService.js notificationService.js backend/services/
mv triage.routes.js backend/routes/triage.js

# Move frontend files:
mv PatientForm.jsx frontend/

# Step 6: Setup environment variables
cp .env.example .env
# Edit .env file with your API keys (see next section)

# Step 7: Start MongoDB (if using local)
mongod

# Step 8: Run the server
npm run dev

# Server will start on http://localhost:3000
```

---

## 2. Free API Keys Setup

### MongoDB Atlas (Required)
1. **Sign up**: https://www.mongodb.com/atlas
2. **Create Free Cluster**:
   - Click "Build a Cluster"
   - Choose FREE Shared option
   - Select region closest to you
   - Click "Create Cluster"
3. **Setup Access**:
   - Go to "Database Access"
   - Add new database user
   - Note username and password
4. **Network Access**:
   - Go to "Network Access"
   - Click "Add IP Address"
   - Allow access from anywhere (0.0.0.0/0) for development
5. **Get Connection String**:
   - Go to "Clusters" → "Connect"
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your password
   - Add to `.env` as `MONGODB_URI`

### Twilio (Optional - For SMS)
1. **Sign up**: https://www.twilio.com/try-twilio
2. **Verify your phone number**
3. **From Dashboard, copy**:
   - Account SID → `.env` `TWILIO_ACCOUNT_SID`
   - Auth Token → `.env` `TWILIO_AUTH_TOKEN`
4. **Get Phone Number**:
   - Go to "Phone Numbers" → "Manage" → "Buy a number"
   - Choose a number (free with trial)
   - Copy number → `.env` `TWILIO_PHONE_NUMBER`

### Firebase (Optional - For Push Notifications)
1. **Go to**: https://firebase.google.com
2. **Create Project**:
   - Click "Get Started"
   - Enter project name
   - Disable Google Analytics (optional)
   - Create Project
3. **Setup Web App**:
   - Click Web icon (</>)
   - Register app with nickname
   - Copy the config object
4. **Add to .env**:
   ```
   FIREBASE_API_KEY=your_api_key
   FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   FIREBASE_PROJECT_ID=your_project_id
   ```

---

## 3. Production Deployment

### Option A: Deploy to Render (Recommended - FREE)

1. **Prepare your code**:
   ```bash
   # Create GitHub repository
   git init
   git add .
   git commit -m "Initial commit"
   # Push to GitHub
   ```

2. **Sign up at Render**: https://render.com

3. **Create New Web Service**:
   - Connect GitHub account
   - Select your repository
   - Configure:
     ```
     Name: slotify-api
     Environment: Node
     Build Command: npm install
     Start Command: node backend/server.js
     ```

4. **Add Environment Variables**:
   - Go to "Environment"
   - Add all variables from `.env`

5. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)

### Option B: Deploy to Railway (FREE $5 credit)

1. **Sign up**: https://railway.app

2. **New Project**:
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your repository

3. **Add Variables**:
   - Go to "Variables"
   - Add all from `.env`

4. **Deploy**:
   - Railway auto-deploys on push

### Option C: Deploy to Heroku (Student Pack)

1. **Install Heroku CLI**:
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Windows
   # Download installer from heroku.com
   ```

2. **Create Heroku App**:
   ```bash
   heroku create slotify-app
   git push heroku main
   ```

3. **Add MongoDB**:
   ```bash
   heroku addons:create mongolab:sandbox
   ```

4. **Set Environment Variables**:
   ```bash
   heroku config:set TWILIO_ACCOUNT_SID=your_sid
   heroku config:set TWILIO_AUTH_TOKEN=your_token
   # Add all other variables
   ```

---

## 4. Testing the System

### Test Patient Registration
```bash
curl -X POST http://localhost:3000/api/triage/assess \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Test",
    "email": "john@test.com",
    "phone": "+1234567890",
    "dateOfBirth": "1990-01-01",
    "gender": "male",
    "symptoms": [{
      "symptom": "chest pain",
      "severity": 8,
      "duration": "2 hours",
      "description": "Sharp pain"
    }],
    "consentGiven": true
  }'
```

### Test Queue Status
```bash
curl http://localhost:3000/api/queue/status?token=YOUR_TOKEN_NUMBER
```

### Test OCR (with image)
```bash
curl -X POST http://localhost:3000/api/triage/upload-report \
  -F "report=@/path/to/test-report.jpg" \
  -F "patientId=PATIENT_ID" \
  -F "tokenNumber=TOKEN_NUMBER"
```

---

## 5. Troubleshooting

### Common Issues & Solutions

#### MongoDB Connection Error
```
Error: MongoNetworkError
```
**Solution**:
- Check MongoDB is running: `mongod`
- Verify connection string in `.env`
- If using Atlas, check IP whitelist

#### Twilio SMS Not Sending
```
Error: Twilio credentials are required
```
**Solution**:
- Verify Twilio credentials in `.env`
- Check phone number format (+1234567890)
- Ensure trial account has credits

#### OCR Not Working
```
Error: Tesseract initialization failed
```
**Solution**:
```bash
# Reinstall tesseract
npm uninstall tesseract.js
npm install tesseract.js
```

#### Port Already in Use
```
Error: EADDRINUSE: address already in use :::3000
```
**Solution**:
```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>
# Or change port in .env
PORT=3001
```

#### CORS Issues in Frontend
```
Error: Access-Control-Allow-Origin
```
**Solution**:
- Update `FRONTEND_URL` in `.env`
- Ensure CORS middleware is configured

---

## Frontend Setup (React)

### Create React App
```bash
# In separate terminal
npx create-react-app slotify-frontend
cd slotify-frontend

# Install dependencies
npm install axios socket.io-client

# Copy PatientForm.jsx to src/

# Update App.js
import PatientForm from './PatientForm';

function App() {
  return <PatientForm />;
}

# Start React app
npm start
# Opens on http://localhost:3001
```

---

## Environment Variables Reference

```env
# Required
PORT=3000
MONGODB_URI=mongodb://localhost:27017/slotify
JWT_SECRET=your_secret_key_change_this

# Optional but Recommended
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Optional
FIREBASE_API_KEY=xxxxx
FRONTEND_URL=http://localhost:3001
ADMIN_EMAIL=admin@slotify.com
ADMIN_PASSWORD=securepassword123
```

---

## Quick Deployment Checklist

- [ ] MongoDB Atlas account created
- [ ] Connection string added to `.env`
- [ ] Code pushed to GitHub
- [ ] Deployment platform chosen (Render/Railway)
- [ ] Environment variables configured
- [ ] Test endpoints working
- [ ] Frontend connected to backend
- [ ] SMS notifications tested (if using)
- [ ] OCR functionality tested

---

## Support & Next Steps

1. **Add Features**:
   - Admin dashboard
   - Real-time queue display
   - Multi-language support
   - Analytics dashboard

2. **Optimize Performance**:
   - Add Redis for caching
   - Implement load balancing
   - Add CDN for static assets

3. **Security Enhancements**:
   - Add rate limiting
   - Implement 2FA
   - Add API key authentication
   - Enable HTTPS

4. **Monitoring**:
   - Add error tracking (Sentry)
   - Implement logging (Winston)
   - Add uptime monitoring

---

## Congratulations! 🎉

Your Slotify medical triage system is now ready to help patients get timely medical care based on their urgency level!

For questions or issues, check the API_DOCUMENTATION.md file for detailed API information.
