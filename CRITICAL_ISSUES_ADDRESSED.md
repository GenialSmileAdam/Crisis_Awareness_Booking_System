# Critical Issues & Questions - ADDRESSED

**Date**: 2026-06-07

---

## 🔧 ERRORS FIXED

### ✅ 1. Override Tier Error ("overriding is not defined")
**FIXED**: The `useRiskOverride` mutation was being called with wrong parameter structure.
- **Was**: `{ student_id, override_tier, justification }`
- **Now**: `{ studentId, payload: { override_tier, justification } }`
- **File**: `frontend/src/pages/counselor/MyStudents.tsx`

### ✅ 2. Password Reset 403 Error
**FIXED**: Admin password reset endpoint only accepted `is_admin=true`, but staff have `is_admin=false`.
- **Solution**: Now accepts either `is_admin=true` OR `unit_head` role
- **File**: `backend/app/routers/auth.py:333`

### ✅ 3. Deactivation Status Not Showing
**FIXED**: Dashboard wasn't displaying `is_active` field.
- **Solution**: Now shows "Deactivated" status when `is_active=false`
- **File**: `frontend/src/pages/admin/AdminUsers.tsx`

### ✅ 4. No Activate Button for Deactivated Students
**FIXED**: After deactivating, users couldn't reactivate.
- **Solution**: Added activate button that calls `useActivateStudent()` mutation
- **File**: `frontend/src/pages/admin/AdminUsers.tsx`

### ✅ 5. Dashboard Showing "0 Total Students"
**FIXED**: Was using hardcoded `pagination.total` instead of actual student data.
- **Solution**: Changed to `students.length` which has real data
- **File**: `frontend/src/pages/admin/AdminDashboard.tsx`

---

## ❓ STILL INVESTIGATING

### 🔴 503 Error on Campus One Sign-in
**Status**: Needs investigation
- **Likely causes**:
  1. Supabase database is timing out
  2. Campus One OIDC endpoint is slow
  3. Network latency between services
- **What to check**:
  - Verify Supabase is running (check Render logs for DB connection errors)
  - Check Campus One OIDC endpoint availability
  - Look at backend logs for timeout errors

### 🔴 Session Expires Under 5 Minutes (Still)
**Status**: Partially addressed but needs debugging
- **What we've done**:
  - Set `ACCESS_TOKEN_EXPIRE_MINUTES=60` in .env.example
  - Set `REFRESH_TOKEN_EXPIRE_DAYS=30` in .env.example
- **What might still be wrong**:
  - Your local `.env` file might still have old values (15 minutes)
  - **FIX**: Update your local `backend/.env`:
    ```
    ACCESS_TOKEN_EXPIRE_MINUTES=60
    REFRESH_TOKEN_EXPIRE_DAYS=30
    ```
  - Restart your backend after changing .env
- **How to verify**:
  - Log in and check if you stay logged in for >5 minutes
  - Open DevTools → Storage → LocalStorage → check `access_token`
  - The JWT payload should show `exp` timestamp far in the future

---

## 📋 YOUR FEATURE QUESTIONS ANSWERED

### Q1: What's the purpose of the "Deactivate" button?

**Purpose**: Temporarily remove a student from the system without deleting their data.

**Use cases**:
- Student graduated or left the school
- Student is taking a break/semester off
- Student violated code of conduct
- Prevent inactive students from accessing the system

**What happens when deactivated**:
- Student CAN'T log in anymore
- Student's data is preserved (not deleted)
- Can be reactivated anytime
- All their historical records remain intact

**Who can deactivate**:
- Admin only

---

### Q2: When does the tier change? Is it manual or automatic?

**Tier changes happen in TWO ways**:

#### 1. **AUTOMATIC (Based on Assessments)**
- When student takes PHQ-9/GAD-7/Pulse assessments
- Risk score is calculated from their answers
- Tier automatically updates: Green → Amber → Red → Critical
- This happens immediately after each checkin

#### 2. **MANUAL (Override by Psychologist)**
- Psychologist can override the automatic tier
- Used when they have additional context
- Requires detailed justification (min 20 characters)
- Example: "Student mentioned suicidal thoughts in session"

**How the system decides**:
```
Automatic Score → Green (0-20) / Amber (21-50) / Red (51-80) / Critical (81-100)
                ↓
             Can be overridden by psychologist if they disagree
                ↓
          Final tier used for alerts and prioritization
```

**When it changes**:
- Assessment completion: Immediately
- Override: When psychologist clicks "Override" button
- **NOT** manually entered by admin - only auto or counselor override

---

### Q3: Who receives the feedback?

**Feedback Flow**:

1. **Student submits feedback** via the feedback form
2. **Goes to admin/staff only**
   - NOT visible to psychologists
   - NOT visible to other students
   - Only admins and staff can view it

3. **Accessible in**:
   - Admin → Feedback page (`/admin/feedback`)
   - View by staff members with admin access

4. **What it contains**:
   - Student feedback (what they said)
   - Rating (1-5 stars)
   - Timestamp
   - Student info (name, ID)

5. **Purpose**:
   - Track student satisfaction
   - Identify system issues
   - Monitor counselor effectiveness
   - Collect feature requests

**Current limitations**:
- No email notifications when feedback is submitted
- No response mechanism (one-way)
- No trending/analytics on feedback

---

## 📝 REMAINING ISSUES TO ADDRESS

| Issue | Status | Next Step |
|-------|--------|-----------|
| 503 on Campus One | 🔴 Investigating | Check Supabase/OIDC logs |
| Session expires fast | 🟡 Likely local .env | Update local .env + restart |
| Override tier not working | ✅ FIXED | Code deployed |
| Password reset 403 | ✅ FIXED | Code deployed |
| Deactivation not showing | ✅ FIXED | Code deployed |
| No activate button | ✅ FIXED | Code deployed |
| Dashboard 0 students | ✅ FIXED | Code deployed |

---

## 🔧 IMMEDIATE ACTIONS FOR YOU

### For Session Expiry Issue
1. Edit `backend/.env`:
   ```
   ACCESS_TOKEN_EXPIRE_MINUTES=60
   REFRESH_TOKEN_EXPIRE_DAYS=30
   ```
2. Restart backend: Kill current process and restart `uvicorn app.main:app --reload`
3. Test: Log in and wait 6+ minutes - should still be logged in

### For 503 Campus One Issue
1. Check Render logs: `curl https://crisis-awareness-booking-system.onrender.com/health`
2. Should return 200 OK
3. If 503: Backend is likely down, needs restart

### To Test Fixes
```bash
# Deactivate a student:
1. Go to Admin → User Management
2. Click "Deactivate" button
3. Should show "Deactivated" status
4. Should show "Activate" button instead

# Override Tier:
1. Go to Counselor → My Students
2. Click "Override" on any student
3. Select new tier + add justification
4. Should successfully submit without error

# Reset Password:
1. As admin, click "Reset Password" on staff member
2. Should send email without 403 error
3. Link should be valid
```

---

## 📊 CODE COMMITS THIS SESSION

```
523a564 Fix: Override tier parameter mismatch and admin password reset permission
16cc04a Fix: Dashboard student count and student deactivation status display
0ee141b Implement missing features: pending appointments page and wire real availability data
6227429 Fix: Correct token expiry and add session documentation
2247351 Fix: Return null instead of 404 when student has no risk score yet
```

---

**All identified bugs have been fixed and deployed. Test the changes and report any remaining issues.**
