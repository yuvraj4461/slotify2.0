// frontend/AdminDashboard.jsx - Admin Dashboard for Queue Management
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    overall: {},
    byCategory: [],
    hourlyDistribution: [],
    efficiency: 0
  });
  
  const [currentQueue, setCurrentQueue] = useState({
    critical: [],
    urgent: [],
    lessUrgent: [],
    nonUrgent: []
  });
  
  const [selectedToken, setSelectedToken] = useState(null);
  const [consultingRooms, setConsultingRooms] = useState([
    'Room 101', 'Room 102', 'Room 103', 'Room 104', 'Emergency Bay 1', 'Emergency Bay 2'
  ]);
  
  const [selectedRoom, setSelectedRoom] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  
  useEffect(() => {
    // Initialize socket
    const newSocket = io(API_URL);
    setSocket(newSocket);
    
    // Join admin room
    newSocket.emit('join-admin-room');
    
    // Socket listeners
    newSocket.on('queue-update', () => {
      fetchQueueData();
      fetchStatistics();
    });
    
    // Initial data fetch
    fetchQueueData();
    fetchStatistics();
    
    // Refresh every minute
    const interval = setInterval(() => {
      fetchStatistics();
    }, 60000);
    
    return () => {
      newSocket.close();
      clearInterval(interval);
    };
  }, []);
  
  const fetchQueueData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/queue/current`);
      if (response.data.success) {
        setCurrentQueue(response.data.data.queues);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
      showMessage('error', 'Failed to fetch queue data');
    }
  };
  
  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/queue/statistics`);
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };
  
  const callNextPatient = async (category) => {
    if (!selectedRoom) {
      showMessage('error', 'Please select a consulting room first');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/queue/call-next`, {
        room: selectedRoom,
        department: category === 'critical' ? 'emergency' : 'general'
      });
      
      if (response.data.success) {
        showMessage('success', `Called patient ${response.data.data.token} to ${selectedRoom}`);
        fetchQueueData();
      }
    } catch (error) {
      console.error('Error calling patient:', error);
      showMessage('error', error.response?.data?.message || 'Failed to call patient');
    } finally {
      setLoading(false);
    }
  };
  
  const completeConsultation = async (tokenNumber) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/queue/complete`, {
        tokenNumber,
        notes: 'Consultation completed'
      });
      
      if (response.data.success) {
        showMessage('success', `Consultation completed for ${tokenNumber}`);
        fetchQueueData();
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error completing consultation:', error);
      showMessage('error', 'Failed to complete consultation');
    } finally {
      setLoading(false);
    }
  };
  
  const sendApproachingNotifications = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/queue/notify-approaching`, {
        positions: 3
      });
      
      if (response.data.success) {
        showMessage('success', response.data.message);
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      showMessage('error', 'Failed to send notifications');
    } finally {
      setLoading(false);
    }
  };
  
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };
  
  const StatCard = ({ title, value, color, icon }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`text-4xl ${color} opacity-20`}>{icon}</div>
      </div>
    </div>
  );
  
  const QueueList = ({ title, tokens, category, color }) => (
    <div className="bg-white rounded-lg shadow-md">
      <div className={`${color} text-white p-4 rounded-t-lg`}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title} ({tokens.length})</h3>
          <button
            onClick={() => callNextPatient(category)}
            disabled={loading || tokens.length === 0}
            className="bg-white text-gray-800 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
          >
            Call Next
          </button>
        </div>
      </div>
      <div className="p-4 max-h-64 overflow-y-auto">
        {tokens.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No patients waiting</p>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div
                key={token.tokenNumber}
                className={`border rounded p-3 cursor-pointer hover:bg-gray-50 ${
                  token.status === 'called' ? 'bg-yellow-50 border-yellow-400' : ''
                }`}
                onClick={() => setSelectedToken(token)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-lg">{token.displayNumber}</span>
                    <span className="text-sm text-gray-600 ml-2">{token.tokenNumber}</span>
                  </div>
                  <div className="text-right">
                    {token.status === 'called' ? (
                      <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded">
                        CALLED - {token.room}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-600">
                        Wait: {token.waitTime}m
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Patient: {token.patientInitials}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                🏥 Slotify Admin Dashboard
              </h1>
              <p className="text-gray-600">Queue Management System</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Room</option>
                {consultingRooms.map(room => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
              <button
                onClick={sendApproachingNotifications}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Send Notifications
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Message Alert */}
      {message.text && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message.text}
        </div>
      )}
      
      {/* Statistics Cards */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="Total Tokens Today"
            value={stats.overall?.totalTokens || 0}
            color="text-blue-600"
            icon="🎫"
          />
          <StatCard
            title="Completed"
            value={stats.overall?.completedTokens || 0}
            color="text-green-600"
            icon="✅"
          />
          <StatCard
            title="Currently Waiting"
            value={stats.overall?.activeTokens || 0}
            color="text-orange-600"
            icon="⏳"
          />
          <StatCard
            title="Avg Wait Time"
            value={`${Math.round(stats.overall?.avgWaitTime || 0)}m`}
            color="text-purple-600"
            icon="⏱️"
          />
          <StatCard
            title="Efficiency"
            value={`${stats.efficiency}%`}
            color="text-indigo-600"
            icon="📊"
          />
        </div>
        
        {/* Queue Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <QueueList
            title="CRITICAL"
            tokens={currentQueue.critical}
            category="critical"
            color="bg-red-600"
          />
          <QueueList
            title="URGENT"
            tokens={currentQueue.urgent}
            category="urgent"
            color="bg-orange-500"
          />
          <QueueList
            title="LESS URGENT"
            tokens={currentQueue.lessUrgent}
            category="less-urgent"
            color="bg-yellow-500"
          />
          <QueueList
            title="NON-URGENT"
            tokens={currentQueue.nonUrgent}
            category="non-urgent"
            color="bg-green-500"
          />
        </div>
        
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
            <div className="space-y-3">
              {stats.byCategory?.map(cat => (
                <div key={cat._id} className="flex items-center">
                  <div className="w-24 text-sm font-medium capitalize">{cat._id}:</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div
                      className={`h-6 rounded-full ${
                        cat._id === 'critical' ? 'bg-red-500' :
                        cat._id === 'urgent' ? 'bg-orange-500' :
                        cat._id === 'less-urgent' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${(cat.count / stats.overall?.totalTokens) * 100}%` }}
                    >
                      <span className="absolute right-2 top-0 text-white text-sm leading-6">
                        {cat.count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Hourly Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Hourly Patient Flow</h3>
            <div className="h-48 flex items-end justify-between">
              {Array.from({ length: 24 }, (_, i) => {
                const hourData = stats.hourlyDistribution?.find(h => h.hour === i);
                const count = hourData?.count || 0;
                const maxCount = Math.max(...(stats.hourlyDistribution?.map(h => h.count) || [1]));
                const height = (count / maxCount) * 100;
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                      style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                      title={`${i}:00 - ${count} patients`}
                    />
                    {i % 3 === 0 && (
                      <span className="text-xs text-gray-600 mt-1">{i}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-center text-xs text-gray-600 mt-2">Hour of Day</div>
          </div>
        </div>
        
        {/* Selected Token Details */}
        {selectedToken && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Token Details</h3>
              <div className="space-y-2">
                <p><strong>Token:</strong> {selectedToken.tokenNumber}</p>
                <p><strong>Display Number:</strong> {selectedToken.displayNumber}</p>
                <p><strong>Patient:</strong> {selectedToken.patientInitials}</p>
                <p><strong>Position:</strong> {selectedToken.position}</p>
                <p><strong>Status:</strong> {selectedToken.status}</p>
                <p><strong>Wait Time:</strong> {selectedToken.waitTime} minutes</p>
                {selectedToken.room && (
                  <p><strong>Room:</strong> {selectedToken.room}</p>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                {selectedToken.status === 'called' && (
                  <button
                    onClick={() => {
                      completeConsultation(selectedToken.tokenNumber);
                      setSelectedToken(null);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Complete
                  </button>
                )}
                <button
                  onClick={() => setSelectedToken(null)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
