// frontend/PatientForm.jsx - Patient Registration & Triage Form Component
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PatientForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'male',
    symptoms: [],
    vitalSigns: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      oxygenSaturation: ''
    },
    medicalHistory: [],
    symptomDuration: '',
    consentGiven: false
  });

  const [currentSymptom, setCurrentSymptom] = useState({
    symptom: '',
    severity: 5,
    duration: '',
    description: ''
  });

  const [currentCondition, setCurrentCondition] = useState({
    condition: '',
    status: 'active'
  });

  const [testReport, setTestReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [error, setError] = useState('');

  // Common symptoms for quick selection
  const commonSymptoms = [
    'Chest Pain', 'Difficulty Breathing', 'High Fever', 'Severe Headache',
    'Abdominal Pain', 'Dizziness', 'Nausea', 'Cough', 'Sore Throat',
    'Body Aches', 'Fatigue', 'Rash', 'Vomiting', 'Diarrhea'
  ];

  // Common medical conditions
  const commonConditions = [
    'Diabetes', 'Hypertension', 'Heart Disease', 'Asthma', 'COPD',
    'Cancer', 'Kidney Disease', 'Liver Disease', 'Thyroid Disorder',
    'Arthritis', 'Depression', 'Anxiety'
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('vitalSigns.')) {
      const vitalName = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        vitalSigns: {
          ...prev.vitalSigns,
          [vitalName]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const addSymptom = () => {
    if (currentSymptom.symptom) {
      setFormData(prev => ({
        ...prev,
        symptoms: [...prev.symptoms, currentSymptom]
      }));
      setCurrentSymptom({
        symptom: '',
        severity: 5,
        duration: '',
        description: ''
      });
    }
  };

  const removeSymptom = (index) => {
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms.filter((_, i) => i !== index)
    }));
  };

  const addCondition = () => {
    if (currentCondition.condition) {
      setFormData(prev => ({
        ...prev,
        medicalHistory: [...prev.medicalHistory, currentCondition]
      }));
      setCurrentCondition({
        condition: '',
        status: 'active'
      });
    }
  };

  const removeCondition = (index) => {
    setFormData(prev => ({
      ...prev,
      medicalHistory: prev.medicalHistory.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = (e) => {
    setTestReport(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Submit triage assessment
      const response = await axios.post('http://localhost:3000/api/triage/assess', formData);
      
      if (response.data.success) {
        setTokenInfo(response.data.data);
        
        // If test report is uploaded, submit it
        if (testReport && response.data.data.patient?.id) {
          const formData = new FormData();
          formData.append('report', testReport);
          formData.append('patientId', response.data.data.patient.id);
          formData.append('tokenNumber', response.data.data.token.number);
          
          await axios.post('http://localhost:3000/api/triage/upload-report', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        
        // Store token in localStorage
        localStorage.setItem('slotifyToken', JSON.stringify(response.data.data.token));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during submission');
    } finally {
      setLoading(false);
    }
  };

  // Success screen component
  if (tokenInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="mb-6">
              <svg className="w-20 h-20 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Registration Successful!</h2>
            
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg p-6 mb-6">
              <p className="text-sm uppercase tracking-wide mb-2">Your Token Number</p>
              <p className="text-5xl font-bold">{tokenInfo.token.displayNumber}</p>
              <p className="text-xl mt-2">{tokenInfo.token.number}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600 text-sm">Category</p>
                <p className={`text-lg font-semibold ${
                  tokenInfo.triage.category === 'critical' ? 'text-red-600' :
                  tokenInfo.triage.category === 'urgent' ? 'text-orange-600' :
                  tokenInfo.triage.category === 'less-urgent' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {tokenInfo.triage.category.toUpperCase()}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600 text-sm">Queue Position</p>
                <p className="text-lg font-semibold">{tokenInfo.token.position}</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600 text-sm">Estimated Wait</p>
                <p className="text-lg font-semibold">{tokenInfo.triage.estimatedWait} mins</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600 text-sm">Security PIN</p>
                <p className="text-lg font-semibold">{tokenInfo.token.pin}</p>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">
                Please save your token number and PIN. You'll receive notifications about your queue status.
              </p>
            </div>
            
            <button
              onClick={() => window.location.href = '/queue-status'}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200"
            >
              Check Queue Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main registration form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            🏥 Slotify - Patient Registration
          </h1>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Symptoms Section - Complete */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Current Symptoms *</h2>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Quick select common symptoms:</p>
                <div className="flex flex-wrap gap-2">
                  {commonSymptoms.map(symptom => (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => setCurrentSymptom(prev => ({ ...prev, symptom }))}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition"
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Symptom</label>
                  <input
                    type="text"
                    value={currentSymptom.symptom}
                    onChange={(e) => setCurrentSymptom(prev => ({ ...prev, symptom: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter symptom"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity (1-10)</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={currentSymptom.severity}
                    onChange={(e) => setCurrentSymptom(prev => ({ ...prev, severity: e.target.value }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Mild</span>
                    <span className="font-semibold text-lg">{currentSymptom.severity}</span>
                    <span>Severe</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={currentSymptom.duration}
                    onChange={(e) => setCurrentSymptom(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 2 hours, 3 days"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={currentSymptom.description}
                    onChange={(e) => setCurrentSymptom(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description"
                  />
                </div>
              </div>
              
              <button
                type="button"
                onClick={addSymptom}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Add Symptom
              </button>
              
              {formData.symptoms.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Added Symptoms:</p>
                  <div className="space-y-2">
                    {formData.symptoms.map((symptom, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div>
                          <span className="font-medium">{symptom.symptom}</span>
                          <span className="ml-2 text-sm text-gray-600">
                            (Severity: {symptom.severity}/10, Duration: {symptom.duration})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSymptom(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Test Report Upload */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Test Reports (Optional)</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept="image/*,application/pdf"
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                </label>
                {testReport && (
                  <p className="mt-2 text-sm text-green-600">✓ File selected: {testReport.name}</p>
                )}
              </div>
            </div>
            
            {/* Consent */}
            <div className="border-b pb-6">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="consentGiven"
                  checked={formData.consentGiven}
                  onChange={handleInputChange}
                  required
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700">
                  I consent to the processing of my medical information for triage purposes and understand that this system provides preliminary assessment only. 
                  I agree that final medical decisions will be made by qualified healthcare professionals.
                </label>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="text-center">
              <button
                type="submit"
                disabled={loading || !formData.consentGiven || formData.symptoms.length === 0}
                className={`px-8 py-3 rounded-lg font-semibold text-white transition duration-200 ${
                  loading || !formData.consentGiven || formData.symptoms.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Processing...' : 'Submit for Triage Assessment'}
              </button>
              
              {formData.symptoms.length === 0 && (
                <p className="mt-2 text-sm text-red-600">Please add at least one symptom</p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PatientForm;
