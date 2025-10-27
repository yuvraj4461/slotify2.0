# 🏗️ Slotify System Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [Core Components](#core-components)
5. [Data Flow](#data-flow)
6. [Security Architecture](#security-architecture)
7. [Scaling Strategy](#scaling-strategy)
8. [Deployment Architecture](#deployment-architecture)

---

## System Overview

Slotify is a cloud-native, microservices-oriented medical triage and queue management system designed to handle thousands of concurrent patients while maintaining sub-second response times.

### Key Architectural Principles
- **Microservices**: Modular components for scalability
- **Event-Driven**: Real-time updates via WebSocket
- **API-First**: RESTful API with clear contracts
- **Cloud-Native**: Containerized deployment
- **Fault-Tolerant**: Graceful degradation and recovery

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         CLIENTS                              │
├────────────┬────────────┬────────────┬─────────────────────┤
│  Patient   │   Queue    │   Admin    │    Mobile App       │
│   Web UI   │  Display   │ Dashboard  │   (Future)          │
└────────────┴────────────┴────────────┴─────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    NGINX (Load Balancer)                     │
│                  - SSL Termination                           │
│                  - Rate Limiting                             │
│                  - Static File Serving                       │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   REST API   │   │  WebSocket   │   │  Static      │
│   Server     │   │   Server     │   │  Assets      │
│  (Express)   │   │ (Socket.io)  │   │  (React)     │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │
        └───────┬───────────┘
                ▼
┌──────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                        │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Triage    │  │   Queue    │  │   OCR      │            │
│  │  Engine    │  │  Manager   │  │  Service   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │Notification│  │   Auth     │  │  Reports   │            │
│  │  Service   │  │  Service   │  │  Service   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   MongoDB    │   │    Redis     │   │   File       │
│  (Primary)   │   │   (Cache)    │   │  Storage     │
└──────────────┘   └──────────────┘   └──────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
├──────────────────────────────────────────────────────────────┤
│   Twilio SMS   │   Firebase    │   SendGrid   │   AWS S3    │
└──────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **React 18**: Component-based UI framework
- **Tailwind CSS**: Utility-first CSS framework
- **Socket.io Client**: Real-time bidirectional communication
- **Axios**: HTTP client for API calls
- **React Router**: Client-side routing
- **Chart.js**: Data visualization

### Backend
- **Node.js 16+**: JavaScript runtime
- **Express.js**: Web application framework
- **Socket.io**: WebSocket implementation
- **Mongoose**: MongoDB ODM
- **JWT**: Authentication tokens
- **Bcrypt**: Password hashing

### AI/ML Components
- **Brain.js**: Neural network for triage scoring
- **Natural**: NLP for symptom analysis
- **Tesseract.js**: OCR for document processing

### Data Layer
- **MongoDB**: Primary database (NoSQL)
- **Redis**: Caching and session storage
- **GridFS**: Large file storage

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **Nginx**: Reverse proxy and load balancer
- **PM2**: Process management (production)

### External Services
- **Twilio**: SMS notifications
- **Firebase FCM**: Push notifications
- **SendGrid**: Email service
- **AWS S3**: Cloud storage (optional)

---

## Core Components

### 1. Triage Engine
**Purpose**: Analyze symptoms and assign priority scores

**Key Features**:
- Neural network-based scoring
- NLP symptom analysis
- Vital signs evaluation
- Medical history consideration
- Real-time priority adjustment

**Algorithm Flow**:
```javascript
Input → Symptom Analysis → Vital Signs Check → 
Age Factor → History Review → Neural Network → 
Priority Score → Queue Assignment
```

### 2. Queue Manager
**Purpose**: Manage patient queue and positions

**Key Features**:
- Dynamic queue reordering
- Multi-category management
- Position tracking
- Wait time estimation
- Fair queuing algorithm

### 3. Notification Service
**Purpose**: Multi-channel patient communication

**Channels**:
- SMS (Twilio)
- Email (SendGrid)
- Push (Firebase)
- In-app (Socket.io)

### 4. OCR Service
**Purpose**: Extract data from medical documents

**Capabilities**:
- Test report analysis
- Prescription reading
- Medical history extraction
- Urgency detection

### 5. Authentication Service
**Purpose**: Secure access control

**Features**:
- JWT-based authentication
- Role-based access control
- Session management
- Password recovery

---

## Data Flow

### Patient Registration Flow
```
1. Patient submits symptoms via web form
2. Data validated and stored in MongoDB
3. Triage Engine analyzes symptoms
4. Priority score calculated
5. Token generated with queue position
6. Patient notified via SMS/Email
7. Real-time updates via WebSocket
```

### Queue Update Flow
```
1. New critical patient arrives
2. Triage assigns high priority
3. Queue Manager reorders positions
4. Affected patients notified
5. Display boards updated
6. Staff dashboard refreshed
```

### Document Processing Flow
```
1. Patient uploads test report
2. File stored in GridFS
3. OCR Service extracts text
4. Medical keywords identified
5. Urgency score calculated
6. Patient re-triaged if needed
7. Queue position updated
```

---

## Security Architecture

### Application Security
- **Input Validation**: Express-validator for all inputs
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: Token-based verification
- **Rate Limiting**: Per-IP request throttling

### Data Security
- **Encryption at Rest**: MongoDB encryption
- **Encryption in Transit**: TLS 1.3
- **Password Security**: Bcrypt with salt rounds
- **Token Security**: JWT with expiration
- **PII Protection**: Data masking and redaction

### Infrastructure Security
- **Network Isolation**: Docker networks
- **Secret Management**: Environment variables
- **Access Control**: Role-based permissions
- **Audit Logging**: All actions logged
- **Backup Strategy**: Daily encrypted backups

### HIPAA Compliance Considerations
- Patient data encryption
- Access audit trails
- Data retention policies
- Consent management
- Breach notification procedures

---

## Scaling Strategy

### Horizontal Scaling
```yaml
Load Balancer (Nginx)
    ├── App Server 1 (Node.js)
    ├── App Server 2 (Node.js)
    └── App Server N (Node.js)
    
MongoDB Replica Set
    ├── Primary
    ├── Secondary 1
    └── Secondary 2
    
Redis Cluster
    ├── Master
    └── Slaves
```

### Vertical Scaling Triggers
- CPU > 70% sustained
- Memory > 80% usage
- Response time > 2 seconds
- Queue depth > 1000

### Caching Strategy
1. **Redis Cache Layers**:
   - Session data (TTL: 1 hour)
   - Queue positions (TTL: 5 minutes)
   - Statistics (TTL: 1 minute)

2. **CDN for Static Assets**:
   - React build files
   - Images and documents
   - API responses (where applicable)

---

## Deployment Architecture

### Development Environment
```bash
docker-compose up --profile dev
# Includes MongoDB Express for debugging
# Hot reload enabled
# Verbose logging
```

### Production Environment
```bash
docker-compose up --profile production -d
# Optimized builds
# Security hardened
# Monitoring enabled
# Auto-restart on failure
```

### CI/CD Pipeline
```
1. Code Push → GitHub
2. GitHub Actions triggered
3. Run tests (Jest, Mocha)
4. Build Docker images
5. Push to Docker Hub
6. Deploy to Cloud (AWS/GCP/Azure)
7. Health checks
8. Rollback on failure
```

### Monitoring Stack
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **ELK Stack**: Log aggregation
- **Sentry**: Error tracking
- **Uptime Robot**: Availability monitoring

---

## Performance Metrics

### Target SLAs
- **Uptime**: 99.9% availability
- **Response Time**: < 200ms (p95)
- **Throughput**: 1000 req/sec
- **Queue Updates**: < 100ms latency
- **Notification Delivery**: < 5 seconds

### Optimization Techniques
1. **Database Indexing**: On frequently queried fields
2. **Connection Pooling**: Reuse database connections
3. **Query Optimization**: Aggregation pipelines
4. **Lazy Loading**: Load data on demand
5. **Code Splitting**: Reduce initial bundle size

---

## Disaster Recovery

### Backup Strategy
- **Database**: Daily full backup, hourly incremental
- **Files**: Real-time sync to cloud storage
- **Configuration**: Version controlled in Git

### Recovery Procedures
1. **RTO** (Recovery Time Objective): 4 hours
2. **RPO** (Recovery Point Objective): 1 hour
3. **Failover Process**: Automated with health checks
4. **Data Restoration**: Scripted recovery process

---

## Future Enhancements

### Phase 2 (Q2 2024)
- Mobile applications (iOS/Android)
- Multi-language support
- Video consultation integration
- AI-powered symptom checker

### Phase 3 (Q3 2024)
- Blockchain for medical records
- IoT device integration
- Predictive analytics
- Multi-hospital network

### Phase 4 (Q4 2024)
- Machine learning optimization
- Voice-based triage
- Automated prescription handling
- Insurance integration

---

## Conclusion

Slotify's architecture is designed to be:
- **Scalable**: Handle growth from 100 to 100,000 patients
- **Reliable**: 99.9% uptime with automatic failover
- **Secure**: HIPAA-compliant with end-to-end encryption
- **Performant**: Sub-second response times
- **Maintainable**: Modular design with clear separation of concerns

The system can be deployed on any cloud provider or on-premises infrastructure, making it flexible for various healthcare environments.
