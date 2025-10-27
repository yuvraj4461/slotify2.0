// frontend/QueueDisplay.jsx - Real-time Queue Display Component
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const QueueDisplay = () => {
  const [queues, setQueues] = useState({
    critical: [],
    urgent: [],
    lessUrgent: [],
    nonUrgent: []
  });
  
  const [statistics, setStatistics] = useState({
    totalWaiting: 0,
    criticalCount: 0,
    urgentCount: 0,
    lessUrgentCount: 0,
    nonUrgentCount: 0
  });
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [socket, setSocket] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [currentlyCalling, setCurrentlyCalling] = useState(null);
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(API_URL);
    setSocket(newSocket);
    
    // Socket event listeners
    newSocket.on('queue-update', (data) => {
      console.log('Queue updated:', data);
      fetchQueueData();
      setLastUpdate(new Date());
    });
    
    newSocket.on('token-called', (data) => {
      setCurrentlyCalling(data);
      setTimeout(() => setCurrentlyCalling(null), 10000); // Show for 10 seconds
      fetchQueueData();
    });
    
    newSocket.on('token-completed', () => {
      fetchQueueData();
    });
    
    newSocket.on('token-cancelled', () => {
      fetchQueueData();
    });
    
    // Initial data fetch
    fetchQueueData();
    
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // Refresh queue data every 30 seconds
    const dataInterval = setInterval(() => {
      fetchQueueData();
    }, 30000);
    
    return () => {
      newSocket.close();
      clearInterval(timeInterval);
      clearInterval(dataInterval);
    };
  }, []);
  
  const fetchQueueData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/queue/current`);
      if (response.data.success) {
        setQueues(response.data.data.queues);
        setStatistics(response.data.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching queue data:', error);
    }
  };
  
  const getCategoryColor = (category) => {
    switch (category) {
      case 'critical': return 'bg-red-600';
      case 'urgent': return 'bg-orange-500';
      case 'less-urgent': return 'bg-yellow-500';
      case 'non-urgent': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getCategoryTextColor = (category) => {
    switch (category) {
      case 'critical': return 'text-red-600';
      case 'urgent': return 'text-orange-600';
      case 'less-urgent': return 'text-yellow-600';
      case 'non-urgent': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };
  
  const TokenCard = ({ token, category }) => (
    <div className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
      token.status === 'called' ? 'animate-pulse bg-yellow-50' : ''
    }`} style={{ borderLeftColor: getCategoryColor(category).replace('bg-', '#') }}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-2xl font-bold text-gray-800">
            {token.displayNumber}
          </div>
          <div className="text-sm text-gray-600">
            Token: {token.tokenNumber}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Patient: {token.patientInitials}
          </div>
        </div>
        <div className="text-right">
          {token.status === 'called' ? (
            <div className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold animate-pulse">
              CALLED
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              Position: {token.position}
            </div>
          )}
          {token.room && (
            <div className="text-xs text-blue-600 font-semibold mt-1">
              Room: {token.room}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-1">
            Wait: {token.waitTime} mins
          </div>
        </div>
      </div>
    </div>
  );
  
  const QueueSection = ({ title, tokens, category, color }) => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className={`${color} text-white p-4`}>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-sm opacity-90">
          {tokens.length} patient{tokens.length !== 1 ? 's' : ''} waiting
        </p>
      </div>
      <div className="p-4 max-h-96 overflow-y-auto">
        {tokens.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No patients in queue</p>
        ) : (
          <div className="space-y-3">
            {tokens.slice(0, 5).map((token, index) => (
              <TokenCard key={token.tokenNumber} token={token} category={category} />
            ))}
            {tokens.length > 5 && (
              <p className="text-center text-gray-500 text-sm">
                +{tokens.length - 5} more waiting
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                🏥 Slotify Queue Display
              </h1>
              <p className="text-gray-600 mt-1">Real-time Patient Queue Management</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-gray-800">
                {currentTime.toLocaleTimeString()}
              </div>
              <div className="text-sm text-gray-600">
                {currentTime.toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Last update: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Currently Calling Alert */}
      {currentlyCalling && (
        <div className="bg-yellow-400 text-black animate-pulse">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-center">
              <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <div>
                <span className="text-xl font-bold">NOW CALLING: </span>
                <span className="text-2xl font-bold">{currentlyCalling.tokenNumber}</span>
                <span className="text-lg ml-4">Please proceed to {currentlyCalling.room}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Statistics Bar */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-800">{statistics.totalWaiting}</div>
              <div className="text-xs text-gray-600">Total Waiting</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{statistics.criticalCount}</div>
              <div className="text-xs text-gray-600">Critical</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{statistics.urgentCount}</div>
              <div className="text-xs text-gray-600">Urgent</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{statistics.lessUrgentCount}</div>
              <div className="text-xs text-gray-600">Less Urgent</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{statistics.nonUrgentCount}</div>
              <div className="text-xs text-gray-600">Non-Urgent</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Queue Sections */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          <QueueSection
            title="CRITICAL"
            tokens={queues.critical}
            category="critical"
            color="bg-red-600"
          />
          <QueueSection
            title="URGENT"
            tokens={queues.urgent}
            category="urgent"
            color="bg-orange-500"
          />
          <QueueSection
            title="LESS URGENT"
            tokens={queues.lessUrgent}
            category="less-urgent"
            color="bg-yellow-500"
          />
          <QueueSection
            title="NON-URGENT"
            tokens={queues.nonUrgent}
            category="non-urgent"
            color="bg-green-500"
          />
        </div>
      </div>
      
      {/* Footer Information */}
      <div className="bg-white mt-8 border-t">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Emergency Notice</h4>
              <p className="text-sm text-gray-600">
                If you experience severe symptoms, please alert our staff immediately
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Average Wait Times</h4>
              <p className="text-sm text-gray-600">
                Critical: Immediate | Urgent: 15 mins | Less Urgent: 45 mins | Non-Urgent: 90 mins
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Need Help?</h4>
              <p className="text-sm text-gray-600">
                Please approach our help desk or call reception for assistance
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueDisplay;
