// services/triageEngine.js - AI-Powered Triage Engine
const natural = require('natural');
const brain = require('brain.js');

class TriageEngine {
  constructor() {
    // Initialize NLP components
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    
    // Critical symptoms that require immediate attention
    this.criticalSymptoms = [
      'chest pain', 'difficulty breathing', 'unconscious', 'severe bleeding',
      'stroke', 'heart attack', 'seizure', 'severe trauma', 'anaphylaxis',
      'choking', 'severe burns', 'head injury', 'poisoning', 'overdose',
      'suicidal', 'unresponsive', 'cardiac arrest', 'respiratory failure'
    ];
    
    // Urgent symptoms
    this.urgentSymptoms = [
      'high fever', 'severe pain', 'fracture', 'deep cut', 'vomiting blood',
      'severe headache', 'abdominal pain', 'allergic reaction', 'asthma attack',
      'diabetic emergency', 'kidney stone', 'severe dehydration', 'concussion',
      'moderate bleeding', 'eye injury', 'chemical burn', 'electric shock'
    ];
    
    // Less urgent symptoms
    this.lessUrgentSymptoms = [
      'moderate pain', 'fever', 'cough', 'sore throat', 'minor cut',
      'sprain', 'rash', 'minor burn', 'dizziness', 'nausea', 'diarrhea',
      'earache', 'minor allergic reaction', 'anxiety', 'migraine'
    ];
    
    // Age-based risk factors
    this.ageRiskFactors = {
      infant: { min: 0, max: 1, multiplier: 1.5 },
      toddler: { min: 1, max: 3, multiplier: 1.3 },
      child: { min: 3, max: 12, multiplier: 1.1 },
      teen: { min: 12, max: 18, multiplier: 1.0 },
      adult: { min: 18, max: 65, multiplier: 1.0 },
      senior: { min: 65, max: 80, multiplier: 1.2 },
      elderly: { min: 80, max: 150, multiplier: 1.4 }
    };
    
    // Vital signs normal ranges
    this.vitalSignsRanges = {
      bloodPressure: {
        systolic: { min: 90, max: 140, critical_low: 70, critical_high: 180 },
        diastolic: { min: 60, max: 90, critical_low: 40, critical_high: 120 }
      },
      heartRate: { min: 60, max: 100, critical_low: 40, critical_high: 150 },
      temperature: { min: 36.5, max: 37.5, critical_low: 35, critical_high: 40 },
      oxygenSaturation: { min: 95, max: 100, critical_low: 90, critical_high: 100 },
      respiratoryRate: { min: 12, max: 20, critical_low: 8, critical_high: 30 }
    };
    
    // Initialize neural network for complex triage decisions
    this.network = new brain.NeuralNetwork({
      hiddenLayers: [10, 10],
      activation: 'sigmoid'
    });
    
    // Train the network with sample data
    this.trainNetwork();
  }
  
  // Train neural network with sample triage data
  trainNetwork() {
    const trainingData = [
      // Critical cases
      { input: [1, 1, 1, 0.9, 0.8], output: [1] }, // All critical indicators
      { input: [1, 0.8, 0.7, 0.9, 0.6], output: [0.9] },
      
      // Urgent cases
      { input: [0.7, 0.6, 0.5, 0.6, 0.5], output: [0.7] },
      { input: [0.6, 0.5, 0.4, 0.5, 0.4], output: [0.6] },
      
      // Less urgent cases
      { input: [0.4, 0.3, 0.3, 0.3, 0.3], output: [0.4] },
      { input: [0.3, 0.2, 0.2, 0.2, 0.2], output: [0.3] },
      
      // Non-urgent cases
      { input: [0.1, 0.1, 0.1, 0.1, 0.1], output: [0.1] },
      { input: [0.2, 0.1, 0.1, 0.1, 0.1], output: [0.15] }
    ];
    
    this.network.train(trainingData, {
      iterations: 2000,
      errorThresh: 0.005
    });
  }
  
  // Main triage assessment function
  async assessPatient(patientData) {
    const {
      symptoms,
      vitalSigns,
      age,
      medicalHistory,
      testReports,
      duration
    } = patientData;
    
    // Initialize scores
    let symptomScore = 0;
    let vitalScore = 0;
    let ageScore = 0;
    let historyScore = 0;
    let durationScore = 0;
    let testScore = 0;
    
    // 1. Analyze symptoms
    if (symptoms && symptoms.length > 0) {
      symptomScore = this.analyzeSymptoms(symptoms);
    }
    
    // 2. Analyze vital signs
    if (vitalSigns) {
      vitalScore = this.analyzeVitalSigns(vitalSigns);
    }
    
    // 3. Consider age factor
    ageScore = this.calculateAgeRisk(age);
    
    // 4. Consider medical history
    if (medicalHistory && medicalHistory.length > 0) {
      historyScore = this.analyzeMedicalHistory(medicalHistory);
    }
    
    // 5. Consider symptom duration
    if (duration) {
      durationScore = this.analyzeDuration(duration);
    }
    
    // 6. Analyze test reports if available
    if (testReports && testReports.length > 0) {
      testScore = await this.analyzeTestReports(testReports);
    }
    
    // Use neural network for final scoring
    const networkInput = [
      symptomScore / 100,
      vitalScore / 100,
      ageScore / 100,
      historyScore / 100,
      (durationScore + testScore) / 200
    ];
    
    const networkOutput = this.network.run(networkInput);
    const finalScore = networkOutput[0] * 100;
    
    // Determine category and priority
    let category, priority, estimatedWait;
    
    if (finalScore >= 80) {
      category = 'critical';
      priority = 5;
      estimatedWait = 0; // Immediate
    } else if (finalScore >= 60) {
      category = 'urgent';
      priority = 4;
      estimatedWait = 15; // 15 minutes
    } else if (finalScore >= 40) {
      category = 'less-urgent';
      priority = 3;
      estimatedWait = 45; // 45 minutes
    } else {
      category = 'non-urgent';
      priority = 2;
      estimatedWait = 90; // 90 minutes
    }
    
    // Generate triage notes
    const notes = this.generateTriageNotes({
      symptomScore,
      vitalScore,
      ageScore,
      historyScore,
      durationScore,
      testScore,
      finalScore
    });
    
    return {
      score: Math.round(finalScore),
      category,
      priority,
      estimatedWait,
      notes,
      breakdown: {
        symptoms: symptomScore,
        vitals: vitalScore,
        age: ageScore,
        history: historyScore,
        duration: durationScore,
        tests: testScore
      }
    };
  }
  
  // Analyze symptoms using NLP
  analyzeSymptoms(symptoms) {
    let maxScore = 0;
    
    for (const symptomData of symptoms) {
      const symptomText = symptomData.symptom.toLowerCase();
      const severity = symptomData.severity || 5;
      
      // Check for critical symptoms
      for (const critical of this.criticalSymptoms) {
        if (symptomText.includes(critical)) {
          maxScore = Math.max(maxScore, 90 + (severity / 10) * 10);
        }
      }
      
      // Check for urgent symptoms
      for (const urgent of this.urgentSymptoms) {
        if (symptomText.includes(urgent)) {
          maxScore = Math.max(maxScore, 60 + (severity / 10) * 10);
        }
      }
      
      // Check for less urgent symptoms
      for (const lessUrgent of this.lessUrgentSymptoms) {
        if (symptomText.includes(lessUrgent)) {
          maxScore = Math.max(maxScore, 30 + (severity / 10) * 10);
        }
      }
      
      // If no match found, base on severity alone
      if (maxScore === 0) {
        maxScore = Math.max(maxScore, severity * 5);
      }
    }
    
    return Math.min(maxScore, 100);
  }
  
  // Analyze vital signs
  analyzeVitalSigns(vitals) {
    let score = 0;
    let criticalCount = 0;
    let abnormalCount = 0;
    
    // Check blood pressure
    if (vitals.bloodPressure) {
      const bp = this.parseBloodPressure(vitals.bloodPressure);
      if (bp) {
        if (bp.systolic <= this.vitalSignsRanges.bloodPressure.systolic.critical_low ||
            bp.systolic >= this.vitalSignsRanges.bloodPressure.systolic.critical_high ||
            bp.diastolic <= this.vitalSignsRanges.bloodPressure.diastolic.critical_low ||
            bp.diastolic >= this.vitalSignsRanges.bloodPressure.diastolic.critical_high) {
          criticalCount++;
        } else if (bp.systolic < this.vitalSignsRanges.bloodPressure.systolic.min ||
                   bp.systolic > this.vitalSignsRanges.bloodPressure.systolic.max ||
                   bp.diastolic < this.vitalSignsRanges.bloodPressure.diastolic.min ||
                   bp.diastolic > this.vitalSignsRanges.bloodPressure.diastolic.max) {
          abnormalCount++;
        }
      }
    }
    
    // Check heart rate
    if (vitals.heartRate) {
      if (vitals.heartRate <= this.vitalSignsRanges.heartRate.critical_low ||
          vitals.heartRate >= this.vitalSignsRanges.heartRate.critical_high) {
        criticalCount++;
      } else if (vitals.heartRate < this.vitalSignsRanges.heartRate.min ||
                 vitals.heartRate > this.vitalSignsRanges.heartRate.max) {
        abnormalCount++;
      }
    }
    
    // Check temperature
    if (vitals.temperature) {
      if (vitals.temperature <= this.vitalSignsRanges.temperature.critical_low ||
          vitals.temperature >= this.vitalSignsRanges.temperature.critical_high) {
        criticalCount++;
      } else if (vitals.temperature < this.vitalSignsRanges.temperature.min ||
                 vitals.temperature > this.vitalSignsRanges.temperature.max) {
        abnormalCount++;
      }
    }
    
    // Check oxygen saturation
    if (vitals.oxygenSaturation) {
      if (vitals.oxygenSaturation <= this.vitalSignsRanges.oxygenSaturation.critical_low) {
        criticalCount++;
      } else if (vitals.oxygenSaturation < this.vitalSignsRanges.oxygenSaturation.min) {
        abnormalCount++;
      }
    }
    
    // Calculate score
    score = (criticalCount * 30) + (abnormalCount * 15);
    return Math.min(score, 100);
  }
  
  // Parse blood pressure string (e.g., "120/80")
  parseBloodPressure(bpString) {
    const match = bpString.match(/(\d+)\/(\d+)/);
    if (match) {
      return {
        systolic: parseInt(match[1]),
        diastolic: parseInt(match[2])
      };
    }
    return null;
  }
  
  // Calculate age-based risk score
  calculateAgeRisk(age) {
    if (!age) return 0;
    
    for (const [category, range] of Object.entries(this.ageRiskFactors)) {
      if (age >= range.min && age <= range.max) {
        return (range.multiplier - 1) * 50; // Convert multiplier to score
      }
    }
    return 0;
  }
  
  // Analyze medical history for risk factors
  analyzeMedicalHistory(history) {
    let score = 0;
    const highRiskConditions = [
      'heart disease', 'diabetes', 'hypertension', 'cancer', 'copd',
      'kidney disease', 'liver disease', 'immunocompromised', 'pregnancy'
    ];
    
    for (const condition of history) {
      const conditionName = condition.condition.toLowerCase();
      for (const highRisk of highRiskConditions) {
        if (conditionName.includes(highRisk) && condition.status === 'active') {
          score += 20;
        }
      }
    }
    
    return Math.min(score, 100);
  }
  
  // Analyze symptom duration
  analyzeDuration(duration) {
    const durationLower = duration.toLowerCase();
    
    if (durationLower.includes('minute') || durationLower.includes('just')) {
      return 80; // Very recent onset - could be acute
    } else if (durationLower.includes('hour')) {
      const hours = parseInt(durationLower.match(/\d+/)?.[0] || '1');
      if (hours <= 6) return 60;
      if (hours <= 24) return 40;
      return 30;
    } else if (durationLower.includes('day')) {
      const days = parseInt(durationLower.match(/\d+/)?.[0] || '1');
      if (days <= 2) return 30;
      if (days <= 7) return 20;
      return 10;
    } else if (durationLower.includes('week') || durationLower.includes('month')) {
      return 5; // Chronic condition
    }
    
    return 20; // Default
  }
  
  // Analyze test reports (OCR extracted text)
  async analyzeTestReports(reports) {
    let score = 0;
    
    const criticalFindings = [
      'critical', 'urgent', 'emergency', 'abnormal', 'severe',
      'acute', 'immediate attention', 'life-threatening'
    ];
    
    const abnormalFindings = [
      'elevated', 'decreased', 'positive', 'irregular',
      'outside normal', 'borderline', 'concerning'
    ];
    
    for (const report of reports) {
      if (report.ocrExtractedText) {
        const text = report.ocrExtractedText.toLowerCase();
        
        // Check for critical findings
        for (const finding of criticalFindings) {
          if (text.includes(finding)) {
            score = Math.max(score, 80);
          }
        }
        
        // Check for abnormal findings
        for (const finding of abnormalFindings) {
          if (text.includes(finding)) {
            score = Math.max(score, 40);
          }
        }
      }
    }
    
    return score;
  }
  
  // Generate detailed triage notes
  generateTriageNotes(scores) {
    const { symptomScore, vitalScore, ageScore, historyScore, durationScore, testScore, finalScore } = scores;
    
    let notes = `Triage Assessment - Score: ${finalScore}\n`;
    notes += `Category: ${finalScore >= 80 ? 'CRITICAL' : finalScore >= 60 ? 'URGENT' : finalScore >= 40 ? 'LESS URGENT' : 'NON-URGENT'}\n\n`;
    
    notes += 'Component Scores:\n';
    if (symptomScore > 0) notes += `- Symptoms: ${symptomScore}/100\n`;
    if (vitalScore > 0) notes += `- Vital Signs: ${vitalScore}/100\n`;
    if (ageScore > 0) notes += `- Age Factor: ${ageScore}/100\n`;
    if (historyScore > 0) notes += `- Medical History: ${historyScore}/100\n`;
    if (durationScore > 0) notes += `- Duration: ${durationScore}/100\n`;
    if (testScore > 0) notes += `- Test Results: ${testScore}/100\n`;
    
    // Add recommendations
    notes += '\nRecommendations:\n';
    if (finalScore >= 80) {
      notes += '- Immediate medical attention required\n';
      notes += '- Alert emergency team\n';
      notes += '- Continuous monitoring needed\n';
    } else if (finalScore >= 60) {
      notes += '- Urgent care needed within 15-30 minutes\n';
      notes += '- Monitor for deterioration\n';
    } else if (finalScore >= 40) {
      notes += '- Can wait 30-60 minutes\n';
      notes += '- Regular monitoring\n';
    } else {
      notes += '- Non-urgent case\n';
      notes += '- Standard queue processing\n';
    }
    
    return notes;
  }
  
  // Recalculate queue based on new patient or priority change
  async recalculateQueue(patients) {
    const triageResults = [];
    
    for (const patient of patients) {
      const assessment = await this.assessPatient(patient);
      triageResults.push({
        patientId: patient._id,
        ...assessment
      });
    }
    
    // Sort by priority (descending) and then by check-in time (ascending)
    triageResults.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.checkInTime - b.checkInTime;
    });
    
    return triageResults;
  }
}

// Export singleton instance
module.exports = new TriageEngine();
