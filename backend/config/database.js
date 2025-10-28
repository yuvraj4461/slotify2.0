// config/database.js - MongoDB Database Configuration
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/slotify', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    // Do not exit the process here — allow server to start for local development.
    // This avoids hard-failing when MongoDB isn't running locally. If the app
    // requires DB access, calls will fail later; the developer should start
    // a local MongoDB instance or set MONGODB_URI in environment variables.
    return false;
  }
};

module.exports = connectDB;
