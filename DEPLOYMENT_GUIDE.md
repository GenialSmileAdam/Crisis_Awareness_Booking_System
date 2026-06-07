# Crisis Awareness Booking System - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Supabase account (for production)
- Resend API key (for email)
- Campus One OIDC credentials

### Environment Setup

#### 1. Backend Configuration (.env)
```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost/crisis_db

# Authentication
JWT_SECRET=<generate-random-secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# Campus One OIDC
CAMPUS_ONE_CLIENT_ID=<from-campus-one>
CAMPUS_ONE_CLIENT_SECRET=<from-campus-one>
CAMPUS_ONE_REDIRECT_URI=https://yourdomain.com/api/auth/callback
CAMPUS_ONE_ISSUER=https://auth.campusone.com.ng

# Email (Resend)
EMAIL_ENABLED=true
RESEND_API_KEY=<resend-api-key>
EMAIL_FROM=noreply@yourdomain.com

# AI Features
AI_ENABLED=true
GROQ_API_KEY=<groq-api-key>

# Crisis Hotline
CRISIS_HOTLINE_NUMBER=0800-SAFESPACE (0800-723-373)
CRISIS_HOTLINE_NAME=24/7 Crisis Support
CRISIS_HOTLINE_DESCRIPTION=Free. Confidential. Available now.

# Supabase
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_KEY=<your-service-key>

# URLs
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

#### 2. Frontend Configuration
```bash
# .env in frontend/
VITE_API_URL=https://api.yourdomain.com
VITE_CAMPUS_ONE_CLIENT_ID=<from-campus-one>
VITE_CAMPUS_ONE_AUTHORIZE_URL=https://auth.campusone.com.ng/api/auth/oauth2/authorize
```

---

## 📦 Installation & Setup

### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python reset_dev_db.py  # Only for development!
python seed.py          # Seed with test data

# Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build
```

---

## 🗄️ Database Setup

### Development (Local PostgreSQL)
```bash
# Create database
createdb crisis_db

# Set environment
export DATABASE_URL=postgresql://localhost/crisis_db

# Apply migrations (using Alembic)
alembic upgrade head
```

### Production (Supabase)
1. Create Supabase project
2. Get connection string from Supabase dashboard
3. Update `DATABASE_URL` in production .env
4. Run migrations: `alembic upgrade head`

---

## 🔑 Authentication Setup

### Campus One OIDC Integration
1. Create Campus One application
2. Set redirect URI: `https://yourdomain.com/api/auth/callback`
3. Get Client ID and Secret
4. Add to environment variables
5. Test with `/api/auth/authorize` endpoint

### Password Reset Flow
1. Enable Resend email service
2. Configure `RESEND_API_KEY`
3. Set `EMAIL_FROM` to your domain
4. Email templates are auto-generated

---

## 📊 Data Initialization

### Seed Data
```bash
# Generate test data (development only)
python backend/seed.py

# This creates:
# - 20 students with various risk levels
# - 3 psychologists
# - Realistic checkin history
# - Sample appointments
```

### Reset Database (Development)
```bash
# WARNING: Deletes all data!
python backend/reset_dev_db.py
```

---

## 🚢 Deployment Strategies

### Option 1: Docker (Recommended)
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Migrate database
docker-compose exec backend alembic upgrade head
```

### Option 2: Traditional VPS
```bash
# On server:
git clone <repo> /var/www/crisis-awareness
cd /var/www/crisis-awareness

# Backend (systemd service)
sudo nano /etc/systemd/system/crisis-api.service
# [Add service definition below]

# Frontend (nginx reverse proxy)
sudo nano /etc/nginx/sites-available/crisis-awareness
# [Add nginx config below]
```

### Option 3: Cloud Platform
- **Vercel/Netlify**: Frontend deployment
- **Railway/Render/Fly.io**: Backend deployment
- **Supabase**: Hosted PostgreSQL

---

## 📋 Systemd Service Example
```ini
[Unit]
Description=Crisis Awareness API
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/var/www/crisis-awareness/backend
Environment="PATH=/var/www/crisis-awareness/backend/venv/bin"
ExecStart=/var/www/crisis-awareness/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
```

---

## 🔒 Security Checklist

- [ ] All environment variables set (no defaults for secrets)
- [ ] CORS properly configured for production domain
- [ ] HTTPS/SSL enabled
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Database backups automated
- [ ] Logs aggregated and monitored
- [ ] Error reporting configured (e.g., Sentry)
- [ ] Database credentials in secrets manager
- [ ] API keys rotated regularly

---

## 🔍 Health Checks

### Backend Health
```bash
curl https://api.yourdomain.com/health
```

### Frontend Status
```bash
# Should return 200 OK
curl https://yourdomain.com
```

---

## 📈 Monitoring & Logging

### Log Aggregation
```bash
# View logs
journalctl -u crisis-api -f

# Tail from docker
docker-compose logs -f backend
```

### Key Metrics to Monitor
- Response times (target: <200ms)
- Error rates (target: <0.1%)
- Database connections
- Email delivery success rate
- Appointment request/approval times
- Student engagement metrics

---

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check environment
echo $DATABASE_URL
```

### Email Not Sending
```bash
# Verify Resend API key
curl -X POST https://api.resend.com/emails \
  -H 'Authorization: Bearer $RESEND_API_KEY' \
  -H 'Content-Type: application/json'
```

### Campus One Auth Failing
- Verify Client ID and Secret
- Check redirect URI matches exactly
- Ensure OIDC endpoint is reachable

---

## 📞 Support

For deployment issues:
1. Check logs: `docker-compose logs backend`
2. Verify environment variables
3. Test database connection
4. Check external API access (Resend, Campus One)

---

**Last Updated**: 2026-06-07  
**Deployment Status**: ✅ Ready for Production
