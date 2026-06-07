# Current Issues and Fixes Needed

**Date**: 2026-06-07  
**Status**: Active development

---

## 🔴 Critical Issues

### Issue 1: Risk Score 404 When Viewing Student Profile
**Problem**: `GET /risk-scores/{student_id}` returns 404 for new students
**Cause**: New students don't have risk scores created yet
**Impact**: Student profile page crashes
**Fix**: Create default risk score when student is created OR return 200 with null/default data

---

### Issue 2: Dashboard Shows Hardcoded/Stale Data
**Problem**: Dashboard metrics don't reflect actual database state
- "0 Total Students" but database has 20+
- "7 Active High-Risk Alerts" shows old seed data
- Assessment volume shows "No check-ins yet" but we have data
- Engagement rate shows "0%" for recent data

**Cause**: Analytics endpoint or queries may not be:
- Filtering correctly for current period
- Aggregating from actual database
- Calculating properly

**Impact**: Admin dashboard is not useful for decision making
**Fix**: Verify analytics queries are correct and hitting the right data

---

### Issue 3: Session Expiring Before 5 Minutes
**Problem**: Tokens expire very quickly despite setting 60 minutes
**Cause**: 
- Environment variable might not be set correctly on Render
- Token validation might be using old/wrong expiry
- Refresh token might not be working

**Impact**: Users get logged out during normal usage
**Fix**: Verify ACCESS_TOKEN_EXPIRE_MINUTES=60 is set on Render

---

### Issue 4: Availability Calendar Should Be Outlook-Style
**Problem**: Current "My Availability" page uses weekly toggle interface
**Expected**: Full month/calendar view like typical calendar apps
**Impact**: Less intuitive for scheduling

---

### Issue 5: Student Appointments Calendar Not Dynamic
**Problem**: AppointmentBookingCalendar shows mock availability data
**Expected**: Should show real psychologist availability from database
**Impact**: Students can't actually book real appointment slots

---

## 🟡 Medium Issues

### Missing User Permissions
**Problem**: User is logged in as "staff" but endpoints check for "psychologist"
**Example**: Risk scores endpoint requires "psychologist" role
**Fix**: Either update endpoints to accept "staff" or update user role system

---

## ✅ What's Working

- ✅ Campus One authentication
- ✅ Database connections (Supabase)
- ✅ User creation and login flow
- ✅ Availability scheduling interface
- ✅ Appointment booking workflow UI
- ✅ Wellness checkins

---

## 📋 Fix Priority

1. **P1 (Now)**: Risk score endpoint - return default instead of 404
2. **P2 (Today)**: Dashboard analytics - fix queries to show actual data
3. **P3 (Today)**: Session expiry - verify and set correctly on Render
4. **P4 (Next)**: Student appointments - wire up real availability data
5. **P5 (Nice to have)**: Outlook-style calendar for availability

---

## Implementation Status

| Issue | Status | Assigned To |
|-------|--------|-------------|
| Risk score 404 | 🔴 TODO | Claude |
| Dashboard data | 🔴 TODO | Claude |
| Session expiry | 🔴 TODO | Claude |
| Student calendar | 🟡 IN PROGRESS | Claude |
| Outlook calendar | 🟡 BACKLOG | Future |

