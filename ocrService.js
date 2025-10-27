// services/ocrService.js - OCR Service for Test Report Processing
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs').promises;

class OCRService {
  constructor() {
    // Initialize Tesseract worker
    this.worker = null;
    this.isInitialized = false;
    
    // Medical keywords to look for
    this.medicalKeywords = {
      critical: [
        'critical', 'emergency', 'urgent', 'immediate', 'life-threatening',
        'severe', 'acute', 'unstable', 'dangerous', 'stat'
      ],
      tests: [
        'blood test', 'urine test', 'x-ray', 'ct scan', 'mri', 'ecg',
        'ultrasound', 'biopsy', 'culture', 'panel', 'cbc', 'metabolic'
      ],
      vitals: [
        'blood pressure', 'bp', 'heart rate', 'pulse', 'temperature',
        'oxygen', 'spo2', 'respiratory', 'glucose', 'sugar'
      ],
      abnormal: [
        'abnormal', 'elevated', 'decreased', 'high', 'low', 'positive',
        'negative', 'irregular', 'outside', 'borderline', 'concerning'
      ],
      values: [
        'mg/dl', 'mmol/l', 'mcg', 'iu/ml', 'cells', 'wbc', 'rbc',
        'hemoglobin', 'hematocrit', 'platelet', 'neutrophil', 'lymphocyte'
      ]
    };
    
    // Normal ranges for common tests
    this.normalRanges = {
      // Blood tests
      hemoglobin: { 
        male: { min: 13.5, max: 17.5, unit: 'g/dL' },
        female: { min: 12.0, max: 15.5, unit: 'g/dL' }
      },
      wbc: { min: 4000, max: 11000, unit: 'cells/mcL' },
      platelet: { min: 150000, max: 400000, unit: 'cells/mcL' },
      glucose: { min: 70, max: 100, unit: 'mg/dL', fasting: true },
      
      // Vital signs
      systolic_bp: { min: 90, max: 140, unit: 'mmHg' },
      diastolic_bp: { min: 60, max: 90, unit: 'mmHg' },
      heart_rate: { min: 60, max: 100, unit: 'bpm' },
      temperature: { min: 36.5, max: 37.5, unit: '°C' },
      spo2: { min: 95, max: 100, unit: '%' }
    };
  }
  
  // Initialize Tesseract worker
  async initialize() {
    if (!this.isInitialized) {
      try {
        this.worker = await Tesseract.createWorker({
          logger: m => console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
        });
        
        await this.worker.loadLanguage('eng');
        await this.worker.initialize('eng');
        
        // Set OCR parameters for better medical document recognition
        await this.worker.setParameters({
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/-:()[] ',
          preserve_interword_spaces: '1',
          tessjs_create_pdf: '0',
          tessjs_create_hocr: '0'
        });
        
        this.isInitialized = true;
        console.log('✅ OCR Service initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing OCR service:', error);
        throw error;
      }
    }
  }
  
  // Process image and extract text
  async extractText(imagePath) {
    try {
      // Ensure worker is initialized
      await this.initialize();
      
      // Perform OCR
      const { data: { text, confidence } } = await this.worker.recognize(imagePath);
      
      console.log(`OCR Confidence: ${confidence}%`);
      
      return {
        text,
        confidence,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error during OCR processing:', error);
      throw error;
    }
  }
  
  // Analyze extracted text for medical information
  async analyzeReport(imagePath) {
    try {
      // Extract text from image
      const { text, confidence } = await this.extractText(imagePath);
      
      // Clean and normalize text
      const cleanedText = this.cleanText(text);
      
      // Extract structured data
      const structuredData = {
        rawText: text,
        cleanedText,
        confidence,
        extractedValues: this.extractValues(cleanedText),
        findings: this.extractFindings(cleanedText),
        urgencyIndicators: this.findUrgencyIndicators(cleanedText),
        testResults: this.extractTestResults(cleanedText),
        vitalSigns: this.extractVitalSigns(cleanedText),
        recommendations: this.extractRecommendations(cleanedText),
        dates: this.extractDates(cleanedText),
        patientInfo: this.extractPatientInfo(cleanedText)
      };
      
      // Calculate urgency score
      structuredData.urgencyScore = this.calculateUrgencyScore(structuredData);
      
      // Generate summary
      structuredData.summary = this.generateSummary(structuredData);
      
      return structuredData;
    } catch (error) {
      console.error('Error analyzing report:', error);
      throw error;
    }
  }
  
  // Clean and normalize extracted text
  cleanText(text) {
    return text
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,\-/:()[\]%]/g, '')
      .trim()
      .toLowerCase();
  }
  
  // Extract numerical values and units
  extractValues(text) {
    const values = [];
    const regex = /(\d+(?:\.\d+)?)\s*([a-zA-Z/%]+)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      values.push({
        value: parseFloat(match[1]),
        unit: match[2],
        context: text.substring(Math.max(0, match.index - 20), Math.min(text.length, match.index + match[0].length + 20))
      });
    }
    
    return values;
  }
  
  // Extract medical findings
  extractFindings(text) {
    const findings = {
      critical: [],
      abnormal: [],
      normal: []
    };
    
    // Check for critical findings
    for (const keyword of this.medicalKeywords.critical) {
      if (text.includes(keyword)) {
        const context = this.extractContext(text, keyword);
        findings.critical.push({ keyword, context });
      }
    }
    
    // Check for abnormal findings
    for (const keyword of this.medicalKeywords.abnormal) {
      if (text.includes(keyword)) {
        const context = this.extractContext(text, keyword);
        findings.abnormal.push({ keyword, context });
      }
    }
    
    // Check for normal indicators
    const normalKeywords = ['normal', 'within range', 'unremarkable', 'stable'];
    for (const keyword of normalKeywords) {
      if (text.includes(keyword)) {
        const context = this.extractContext(text, keyword);
        findings.normal.push({ keyword, context });
      }
    }
    
    return findings;
  }
  
  // Find urgency indicators
  findUrgencyIndicators(text) {
    const indicators = [];
    
    for (const keyword of this.medicalKeywords.critical) {
      if (text.includes(keyword)) {
        indicators.push({
          type: 'critical',
          keyword,
          weight: 10
        });
      }
    }
    
    for (const keyword of this.medicalKeywords.abnormal) {
      if (text.includes(keyword)) {
        indicators.push({
          type: 'abnormal',
          keyword,
          weight: 5
        });
      }
    }
    
    return indicators;
  }
  
  // Extract test results
  extractTestResults(text) {
    const results = [];
    
    // Common test patterns
    const patterns = [
      /(\w+(?:\s+\w+)?)\s*[:=]\s*(\d+(?:\.\d+)?)\s*([a-zA-Z/%]+)?/g,
      /(\w+)\s+(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*([a-zA-Z/%]+)/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const testName = match[1];
        const value = parseFloat(match[2]);
        const unit = match[3] || match[4] || '';
        
        // Check if this is a known test
        const normalRange = this.getNormalRange(testName);
        const isAbnormal = normalRange ? this.isValueAbnormal(value, normalRange) : null;
        
        results.push({
          test: testName,
          value,
          unit,
          isAbnormal,
          normalRange
        });
      }
    }
    
    return results;
  }
  
  // Extract vital signs
  extractVitalSigns(text) {
    const vitals = {};
    
    // Blood pressure pattern
    const bpPattern = /(?:bp|blood pressure)[\s:]*(\d{2,3})\/(\d{2,3})/i;
    const bpMatch = text.match(bpPattern);
    if (bpMatch) {
      vitals.bloodPressure = {
        systolic: parseInt(bpMatch[1]),
        diastolic: parseInt(bpMatch[2]),
        reading: `${bpMatch[1]}/${bpMatch[2]}`
      };
    }
    
    // Heart rate pattern
    const hrPattern = /(?:hr|heart rate|pulse)[\s:]*(\d{2,3})/i;
    const hrMatch = text.match(hrPattern);
    if (hrMatch) {
      vitals.heartRate = parseInt(hrMatch[1]);
    }
    
    // Temperature pattern
    const tempPattern = /(?:temp|temperature)[\s:]*(\d{2,3}(?:\.\d)?)/i;
    const tempMatch = text.match(tempPattern);
    if (tempMatch) {
      vitals.temperature = parseFloat(tempMatch[1]);
    }
    
    // Oxygen saturation pattern
    const o2Pattern = /(?:spo2|o2|oxygen)[\s:]*(\d{2,3})/i;
    const o2Match = text.match(o2Pattern);
    if (o2Match) {
      vitals.oxygenSaturation = parseInt(o2Match[1]);
    }
    
    return vitals;
  }
  
  // Extract recommendations
  extractRecommendations(text) {
    const recommendations = [];
    
    const keywords = [
      'recommend', 'advised', 'suggest', 'should', 'must',
      'follow up', 'return', 'monitor', 'continue', 'discontinue'
    ];
    
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        const context = this.extractContext(text, keyword, 50);
        recommendations.push({
          keyword,
          text: context
        });
      }
    }
    
    return recommendations;
  }
  
  // Extract dates
  extractDates(text) {
    const dates = [];
    
    // Various date patterns
    const patterns = [
      /\d{1,2}\/\d{1,2}\/\d{2,4}/g,
      /\d{1,2}-\d{1,2}-\d{2,4}/g,
      /\d{4}-\d{2}-\d{2}/g,
      /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        dates.push({
          text: match[0],
          position: match.index
        });
      }
    }
    
    return dates;
  }
  
  // Extract patient information
  extractPatientInfo(text) {
    const info = {};
    
    // Name pattern (simplified)
    const namePattern = /(?:name|patient)[\s:]+([A-Za-z]+(?:\s+[A-Za-z]+)*)/i;
    const nameMatch = text.match(namePattern);
    if (nameMatch) {
      info.name = nameMatch[1];
    }
    
    // Age pattern
    const agePattern = /(?:age|yrs?|years?)[\s:]*(\d{1,3})/i;
    const ageMatch = text.match(agePattern);
    if (ageMatch) {
      info.age = parseInt(ageMatch[1]);
    }
    
    // Gender pattern
    const genderPattern = /(?:sex|gender)[\s:]*(male|female|m|f)/i;
    const genderMatch = text.match(genderPattern);
    if (genderMatch) {
      info.gender = genderMatch[1].toLowerCase().startsWith('m') ? 'male' : 'female';
    }
    
    // ID patterns
    const idPattern = /(?:id|mrn|patient\s+no)[\s:#]*([A-Z0-9]+)/i;
    const idMatch = text.match(idPattern);
    if (idMatch) {
      info.patientId = idMatch[1];
    }
    
    return info;
  }
  
  // Extract context around a keyword
  extractContext(text, keyword, contextLength = 30) {
    const index = text.indexOf(keyword);
    if (index === -1) return '';
    
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + keyword.length + contextLength);
    
    return text.substring(start, end);
  }
  
  // Get normal range for a test
  getNormalRange(testName) {
    const name = testName.toLowerCase();
    
    for (const [key, range] of Object.entries(this.normalRanges)) {
      if (name.includes(key.toLowerCase())) {
        return range;
      }
    }
    
    return null;
  }
  
  // Check if value is abnormal
  isValueAbnormal(value, range) {
    if (range.male && range.female) {
      // Use average of male and female ranges
      const avgMin = (range.male.min + range.female.min) / 2;
      const avgMax = (range.male.max + range.female.max) / 2;
      return value < avgMin || value > avgMax;
    }
    
    return value < range.min || value > range.max;
  }
  
  // Calculate urgency score based on findings
  calculateUrgencyScore(data) {
    let score = 0;
    
    // Critical findings
    score += data.findings.critical.length * 20;
    
    // Abnormal findings
    score += data.findings.abnormal.length * 10;
    
    // Urgency indicators
    score += data.urgencyIndicators.reduce((sum, indicator) => sum + indicator.weight, 0);
    
    // Abnormal test results
    if (data.testResults) {
      const abnormalTests = data.testResults.filter(test => test.isAbnormal);
      score += abnormalTests.length * 15;
    }
    
    // Abnormal vital signs
    if (data.vitalSigns) {
      if (data.vitalSigns.bloodPressure) {
        const bp = data.vitalSigns.bloodPressure;
        if (bp.systolic > 140 || bp.systolic < 90 || bp.diastolic > 90 || bp.diastolic < 60) {
          score += 15;
        }
      }
      if (data.vitalSigns.heartRate && (data.vitalSigns.heartRate > 100 || data.vitalSigns.heartRate < 60)) {
        score += 10;
      }
      if (data.vitalSigns.oxygenSaturation && data.vitalSigns.oxygenSaturation < 95) {
        score += 20;
      }
    }
    
    return Math.min(score, 100);
  }
  
  // Generate summary of findings
  generateSummary(data) {
    let summary = '';
    
    if (data.urgencyScore >= 80) {
      summary = 'CRITICAL: Immediate medical attention required. ';
    } else if (data.urgencyScore >= 60) {
      summary = 'URGENT: Prompt medical evaluation needed. ';
    } else if (data.urgencyScore >= 40) {
      summary = 'MODERATE: Medical consultation recommended. ';
    } else {
      summary = 'ROUTINE: Standard medical follow-up. ';
    }
    
    if (data.findings.critical.length > 0) {
      summary += `Found ${data.findings.critical.length} critical indicator(s). `;
    }
    
    if (data.findings.abnormal.length > 0) {
      summary += `Found ${data.findings.abnormal.length} abnormal finding(s). `;
    }
    
    const abnormalTests = data.testResults.filter(test => test.isAbnormal);
    if (abnormalTests.length > 0) {
      summary += `${abnormalTests.length} test result(s) outside normal range. `;
    }
    
    return summary.trim();
  }
  
  // Clean up resources
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('OCR Service terminated');
    }
  }
}

// Export singleton instance
module.exports = new OCRService();
