# Crisis Awareness Booking System - Testing Checklist

## ✅ Build & Infrastructure
- [x] Frontend builds without errors
- [x] Backend models import successfully
- [x] 57 API endpoints configured across 8 routers
- [x] Database schema initialized with all required tables
- [x] Configuration: Token expiry (60 min), Refresh token (30 days)

---

## 🔐 Authentication & Authorization
- [ ] Campus One OIDC login flow works
- [ ] Token refresh mechanism works
- [ ] Password reset email sent and link works
- [ ] Admin password reset for staff works
- [ ] Role-based access control enforced
- [ ] Student can only see own data

---

## 👥 User Management
- [x] Student deactivate/activate feature implemented
- [ ] Test: Admin can deactivate student
- [ ] Test: Student appears as inactive in admin view
- [ ] Test: Staff password reset works
- [ ] Test: Override tier functionality works

---

## 📅 Appointment & Session Workflow
- [x] Session request endpoints implemented (request, approve, reject)
- [ ] Test: Student submits appointment request (pending status)
- [ ] Test: Psychologist approves request (changes to confirmed)
- [ ] Test: Psychologist rejects request
- [ ] Test: Student can only book confirmed appointments
- [ ] Test: Availability scheduling works

---

## 📊 Wellness Checkins & Risk Assessment
- [x] 4-week schedule for PHQ-9/GAD-7 implemented
- [x] Daily Pulse checkin configured
- [ ] Test: Pending checkins show correct items
- [ ] Test: PHQ-9 only appears after 4 weeks
- [ ] Test: GAD-7 only appears after 4 weeks
- [ ] Test: Pulse appears daily
- [ ] Test: Crisis logs properly recorded

---

## 📝 Feedback System
- [x] Feedback submission endpoint working
- [x] Admin feedback viewing page created
- [ ] Test: User can submit feedback
- [ ] Test: Admin can view all feedback
- [ ] Test: Star ratings display correctly
- [ ] Test: Pagination works

---

## 📞 Crisis Hotline
- [x] Configurable hotline number
- [x] Public API endpoint created
- [ ] Test: Crisis hotline modal displays correct number
- [ ] Test: Number can be copied to clipboard
- [ ] Test: Configuration loads from environment

---

## 📍 Student Assignment & Dashboard
- [x] Students filtered by assigned psychologist
- [x] Dashboard trends use real analytics
- [ ] Test: Psychologist sees only assigned students
- [ ] Test: MyStudents shows assigned roster only
- [ ] Test: CounselorDashboard displays correct WRS data
- [ ] Test: Risk tier distribution is accurate

---

## 🔄 Data Flows & Integration
- [ ] Test: Complete student signup → assignment → checkin flow
- [ ] Test: Appointment request → approval → booking flow
- [ ] Test: Crisis flag triggers proper notifications
- [ ] Test: Risk score calculations are accurate
- [ ] Test: Session AI workflows complete end-to-end
- [ ] Test: Feedback is properly stored and retrieved

---

## 🚀 Deployment Readiness
- [ ] All environment variables documented
- [ ] Error handling and logging working
- [ ] Rate limiting configured (if needed)
- [ ] CORS properly configured
- [ ] Database backups automated
- [ ] Monitoring/alerting setup

---

## 📋 API Endpoint Verification

### Auth Endpoints (11 total)
- [ ] POST /api/auth/authorize
- [ ] GET /api/auth/callback
- [ ] POST /api/auth/logout
- [ ] POST /api/auth/refresh
- [ ] POST /api/auth/request-password-reset
- [ ] POST /api/auth/reset-password
- [ ] POST /api/auth/admin/reset-staff-password
- [ ] GET /api/public/crisis-hotline

### Appointment Endpoints (11 total)
- [ ] POST /appointments (admin/staff)
- [ ] POST /appointments/book (student)
- [ ] POST /appointments/request (student)
- [ ] GET /appointments (all)
- [ ] GET /appointments/next-available
- [ ] GET /appointments/availability/{id}
- [ ] PATCH /appointments/{id}/approve
- [ ] PATCH /appointments/{id}/reject
- [ ] PATCH /appointments/{id}
- [ ] DELETE /appointments/{id}

### Student Endpoints (10 total)
- [ ] GET /students (all filtered)
- [ ] POST /students/deactivate/{id}
- [ ] POST /students/activate/{id}
- [ ] GET /students/{id}
- [ ] PATCH /students/{id}
- [ ] GET /students/{id}/crisis-logs

### Checkin Endpoints (3 total)
- [ ] GET /checkins/pending
- [ ] POST /checkins/submit
- [ ] GET /checkins/{student_id}

### Availability Endpoints (8 total)
- [ ] POST /availability
- [ ] GET /availability
- [ ] POST /availability/schedule
- [ ] PUT /availability/{id}
- [ ] DELETE /availability/{id}
- [ ] GET /availability/busy-blocks
- [ ] POST /availability/busy-blocks
- [ ] DELETE /availability/busy-blocks/{id}

### Other Endpoints
- [ ] GET /risk-scores/alerts
- [ ] POST /risk-scores/override/{id}
- [ ] POST /feedback
- [ ] GET /feedback

---

## 🔍 Known Limitations & Future Work
- [ ] Dynamic calendar (Outlook-style) not yet implemented
- [ ] SMS notifications not configured
- [ ] Google Calendar integration optional
- [ ] Multi-language support not implemented
- [ ] Mobile app not available

---

## 📞 Support & Troubleshooting

If tests fail:
1. Check backend logs: `journalctl -u crisis-awareness-api`
2. Check frontend console: Browser DevTools > Console
3. Verify database connection: `psql $DATABASE_URL`
4. Check environment variables are loaded
5. Restart services after config changes

---

**Last Updated**: 2026-06-07  
**Status**: ✅ Ready for Testing
