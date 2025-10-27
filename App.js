// frontend/App.js - Main React Application
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import PatientForm from './PatientForm';
import QueueDisplay from './QueueDisplay';
import AdminDashboard from './AdminDashboard';
import './App.css';

// Token Status Component
const TokenStatus = () => {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  
  useEffect(() => {
    // Check if token exists in localStorage
    const savedToken = localStorage.getItem('slotifyToken');
    if (savedToken) {
      setTokenInfo(JSON.parse(savedToken));
      fetchQueueStatus(JSON.parse(savedToken).number);
    }
  }, []);
  
  const fetchQueueStatus = async (tokenNumber) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/queue/status?token=${tokenNumber}`);
      const data = await response.json();
      
      if (data.success) {
        setQueueStatus(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch queue status');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCheckStatus = (e) => {
    e.preventDefault();
    const tokenNumber = e.target.tokenNumber.value;
    const pin = e.target.pin.value;
    
    fetchQueueStatus(tokenNumber, pin);
  };
  
  if (!tokenInfo && !queueStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Check Token Status</h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleCheckStatus} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Token Number
                </label>
                <input
                  type="text"
                  name="tokenNumber"
                  required
                  placeholder="e.g., 20241223-C-0001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security PIN
                </label>
                <input
                  type="text"
                  name="pin"
                  required
                  placeholder="4-digit PIN"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Check Status'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Queue Status</h2>
          
          {queueStatus && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Your Token</p>
                  <p className="text-4xl font-bold text-blue-600">{queueStatus.token.displayNumber}</p>
                  <p className="text-sm text-gray-500 mt-1">{queueStatus.token.number}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Current Position</p>
                  <p className="text-2xl font-semibold">{queueStatus.queue.currentPosition}</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">People Ahead</p>
                  <p className="text-2xl font-semibold">{queueStatus.queue.peopleAhead}</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Est. Wait Time</p>
                  <p className="text-2xl font-semibold">{queueStatus.queue.estimatedWaitMinutes} mins</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-2xl font-semibold capitalize">{queueStatus.token.status}</p>
                </div>
              </div>
              
              {queueStatus.token.status === 'called' && (
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 animate-pulse">
                  <p className="text-center text-lg font-semibold text-yellow-800">
                    🔔 Your turn! Please proceed to {queueStatus.consultingRoom || 'reception'}
                  </p>
                </div>
              )}
              
              <button
                onClick={() => fetchQueueStatus(queueStatus.token.number)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Refresh Status
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Navigation Component
const Navigation = () => (
  <nav className="bg-white shadow-lg">
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center py-4">
        <Link to="/" className="text-2xl font-bold text-blue-600">
          🏥 Slotify
        </Link>
        <div className="flex space-x-6">
          <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium">
            Register
          </Link>
          <Link to="/queue" className="text-gray-700 hover:text-blue-600 font-medium">
            Queue Display
          </Link>
          <Link to="/status" className="text-gray-700 hover:text-blue-600 font-medium">
            Check Status
          </Link>
          <Link to="/admin" className="text-gray-700 hover:text-blue-600 font-medium">
            Admin
          </Link>
        </div>
      </div>
    </div>
  </nav>
);

// Main App Component
function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<PatientForm />} />
          <Route path="/queue" element={<QueueDisplay />} />
          <Route path="/status" element={<TokenStatus />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
