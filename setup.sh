#!/bin/bash
# setup.sh - Complete Setup Script for Slotify

echo "🏥 Welcome to Slotify Setup!"
echo "============================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
echo "Checking prerequisites..."
echo "------------------------"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node -v)
    print_status "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js 16+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    print_status "npm installed: $NPM_VERSION"
else
    print_error "npm not found. Please install npm."
    exit 1
fi

# Check MongoDB (optional)
if command_exists mongod; then
    print_status "MongoDB installed locally"
    USE_LOCAL_MONGO=true
else
    print_warning "MongoDB not installed locally. You'll need MongoDB Atlas."
    USE_LOCAL_MONGO=false
fi

echo ""
echo "Setting up project structure..."
echo "-------------------------------"

# Create project directories
mkdir -p backend/{routes,models,services,config,middleware}
mkdir -p frontend/src/components
mkdir -p uploads/reports
mkdir -p logs

print_status "Project directories created"

# Organize backend files
echo ""
echo "Organizing backend files..."
echo "--------------------------"

# Move files to appropriate directories
if [ -f "server.js" ]; then
    mv server.js backend/
    print_status "Moved server.js"
fi

if [ -f "database.js" ]; then
    mv database.js backend/config/
    print_status "Moved database.js"
fi

if [ -f "Patient.js" ]; then
    mv Patient.js backend/models/
    print_status "Moved Patient.js"
fi

if [ -f "Token.js" ]; then
    mv Token.js backend/models/
    print_status "Moved Token.js"
fi

if [ -f "triageEngine.js" ]; then
    mv triageEngine.js backend/services/
    print_status "Moved triageEngine.js"
fi

if [ -f "ocrService.js" ]; then
    mv ocrService.js backend/services/
    print_status "Moved ocrService.js"
fi

if [ -f "notificationService.js" ]; then
    mv notificationService.js backend/services/
    print_status "Moved notificationService.js"
fi

if [ -f "triage.routes.js" ]; then
    mv triage.routes.js backend/routes/triage.js
    print_status "Moved triage routes"
fi

if [ -f "queue.routes.js" ]; then
    mv queue.routes.js backend/routes/queue.js
    print_status "Moved queue routes"
fi

# Create missing route files
echo ""
echo "Creating additional route files..."
echo "----------------------------------"

# Create auth routes
cat > backend/routes/auth.js << 'EOF'
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Simple auth routes (extend as needed)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // For demo: admin login
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, role: 'admin' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

module.exports = router;
EOF
print_status "Created auth routes"

# Create patient routes
cat > backend/routes/patient.js << 'EOF'
const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');

router.get('/profile/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).populate('currentToken');
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
EOF
print_status "Created patient routes"

# Create admin routes
cat > backend/routes/admin.js << 'EOF'
const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const Token = require('../models/Token');

router.get('/dashboard', async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments({ status: 'waiting' });
    const byCategory = await Patient.aggregate([
      { $match: { status: 'waiting' } },
      { $group: { _id: '$triageCategory', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      data: {
        totalPatients,
        byCategory,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
EOF
print_status "Created admin routes"

# Setup frontend
echo ""
echo "Setting up frontend..."
echo "---------------------"

# Check if create-react-app needs to be run
if [ ! -d "frontend/node_modules" ]; then
    print_warning "Creating React application..."
    npx create-react-app frontend
    print_status "React app created"
fi

# Move React components
if [ -f "PatientForm.jsx" ]; then
    mv PatientForm.jsx frontend/src/
    print_status "Moved PatientForm.jsx"
fi

if [ -f "QueueDisplay.jsx" ]; then
    mv QueueDisplay.jsx frontend/src/
    print_status "Moved QueueDisplay.jsx"
fi

if [ -f "AdminDashboard.jsx" ]; then
    mv AdminDashboard.jsx frontend/src/
    print_status "Moved AdminDashboard.jsx"
fi

if [ -f "App.js" ]; then
    mv App.js frontend/src/
    print_status "Moved App.js"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
echo "-------------------------"

# Backend dependencies
print_warning "Installing backend dependencies..."
npm install

# Frontend dependencies
print_warning "Installing frontend dependencies..."
cd frontend
npm install axios socket.io-client react-router-dom
cd ..

print_status "All dependencies installed"

# Setup environment file
echo ""
echo "Setting up environment configuration..."
echo "---------------------------------------"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status "Created .env file from template"
        print_warning "Please edit .env file with your API keys"
    fi
fi

# Create startup scripts
echo ""
echo "Creating startup scripts..."
echo "--------------------------"

# Create start script for backend
cat > start-backend.sh << 'EOF'
#!/bin/bash
echo "Starting Slotify Backend..."
npm run dev
EOF
chmod +x start-backend.sh
print_status "Created start-backend.sh"

# Create start script for frontend
cat > start-frontend.sh << 'EOF'
#!/bin/bash
echo "Starting Slotify Frontend..."
cd frontend
npm start
EOF
chmod +x start-frontend.sh
print_status "Created start-frontend.sh"

# Create start-all script
cat > start-all.sh << 'EOF'
#!/bin/bash
echo "Starting Slotify System..."
# Start backend in background
npm run dev &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Start frontend
cd frontend
npm start &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo "Slotify is running!"
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID" INT
wait
EOF
chmod +x start-all.sh
print_status "Created start-all.sh"

# Final setup summary
echo ""
echo "======================================"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "======================================"
echo ""
echo "Next Steps:"
echo "-----------"
echo ""

if [ "$USE_LOCAL_MONGO" = false ]; then
    echo "1. Set up MongoDB Atlas:"
    echo "   - Go to https://www.mongodb.com/atlas"
    echo "   - Create a free cluster"
    echo "   - Get your connection string"
    echo ""
fi

echo "2. Configure environment variables:"
echo "   - Edit the .env file"
echo "   - Add your MongoDB connection string"
echo "   - Add API keys (Twilio, Firebase, etc.) if needed"
echo ""

echo "3. Start the application:"
echo "   - Option A: Run everything: ./start-all.sh"
echo "   - Option B: Run separately:"
echo "     Terminal 1: ./start-backend.sh"
echo "     Terminal 2: ./start-frontend.sh"
echo ""

echo "4. Access the application:"
echo "   - Frontend: http://localhost:3001"
echo "   - Backend API: http://localhost:3000/api"
echo "   - Health Check: http://localhost:3000/api/health"
echo ""

echo "5. Test the system:"
echo "   - Register a patient"
echo "   - View the queue display"
echo "   - Access admin dashboard"
echo ""

print_status "Setup script completed successfully!"
echo ""
echo "For detailed documentation, see:"
echo "- README.md"
echo "- API_DOCUMENTATION.md"
echo "- DEPLOYMENT_GUIDE.md"
echo ""
echo "Happy coding! 🚀"
