# Render Deployment Troubleshooting

## 🚨 Current Issue: Backend Returns 503 Service Unavailable

Your frontend is logged in successfully but backend API calls fail with **503 (Service Unavailable)**.

---

## 🔍 Diagnosis Steps

### 1. Check Backend Status on Render Dashboard
1. Go to https://dashboard.render.com
2. Click your service: `crisis-awareness-booking-system`
3. Check **Logs** tab for errors
4. Look for:
   - Database connection failures
   - Python import errors
   - Port binding issues

### 2. Check Database Connection
```bash
# Test if DATABASE_URL is correct
psql $DATABASE_URL -c "SELECT 1"
```

### 3. Check Backend Health Endpoint
```bash
curl https://crisis-awareness-booking-system.onrender.com/health
```

Should return `200 OK` with status message.

---

## 🛠️ Common Fixes

### Issue 1: Service Crashed/Stopped
**Symptoms**: Logs show errors, service in "crashed" state

**Fix**:
1. Go to Render dashboard
2. Click "Redeploy"
3. Or push to your branch: `git push`

### Issue 2: Database Connection Failed
**Symptoms**: `psycopg` or `sqlalchemy` connection error in logs

**Fix**:
1. Verify `DATABASE_URL` in Render environment variables
2. Check database is running in Supabase
3. Verify credentials are correct
4. Redeploy

### Issue 3: Memory/Dyno Limit
**Symptoms**: Service suddenly becomes unresponsive

**Fix**: 
1. Check Render plan limits
2. Upgrade if needed
3. Or optimize backend (reduce memory usage)

### Issue 4: Python Dependencies Not Installed
**Symptoms**: `ModuleNotFoundError` in logs

**Fix**:
1. Ensure `requirements.txt` exists in `backend/`
2. Verify all imports are in `requirements.txt`
3. Redeploy

---

## ✅ Proper Deployment Steps

### 1. Prepare Code Locally
```bash
cd /home/work/Programming\ Project/Crisis_Awareness_Booking_System

# Test backend builds
cd backend
pip install -r requirements.txt
python -m pytest  # If tests exist

# Test frontend builds
cd ../frontend
npm install
npm run build
```

### 2. Commit and Push to GitHub
```bash
git add .
git commit -m "Fix availability query endpoints"
git push origin main
```

### 3. Redeploy on Render
Option A (Automatic):
- Push to GitHub main branch
- Render auto-redeploys

Option B (Manual):
1. Go to Render dashboard
2. Click service
3. Click "Redeploy"

### 4. Verify Deployment
```bash
# Wait 2-3 minutes for deployment
curl https://crisis-awareness-booking-system.onrender.com/health

# Should return:
# {"status": "ok", "timestamp": "2026-06-07T..."}
```

---

## 📊 Environment Variables Checklist

Verify these are set in Render:

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - Generated random string
- [ ] `CAMPUS_ONE_CLIENT_ID` - From Campus One
- [ ] `CAMPUS_ONE_CLIENT_SECRET` - From Campus One
- [ ] `CAMPUS_ONE_REDIRECT_URI` - Should be `https://yourdomain.com/api/auth/callback`
- [ ] `RESEND_API_KEY` - For email delivery
- [ ] `EMAIL_FROM` - Sender email address
- [ ] `GROQ_API_KEY` - For AI features (optional)
- [ ] `FRONTEND_URL` - Frontend domain
- [ ] `BACKEND_URL` - Backend domain

---

## 🔗 Useful Links

- [Render Dashboard](https://dashboard.render.com)
- [Render Logs](https://dashboard.render.com) → Service → Logs tab
- [Render Environment Variables Guide](https://render.com/docs/environment-variables)

---

## 📝 Quick Redeploy Command

If you have Render CLI:
```bash
render deploy --service=crisis-awareness-booking-system
```

---

## ⚠️ If Nothing Works

1. **Check Render Service Status**: https://status.render.com
2. **Check GitHub Actions**: Verify code pushed successfully
3. **Check Logs for last 50 lines**: 
   ```bash
   # On Render dashboard, Logs tab
   ```
4. **Restart service**: Render dashboard → Restart button
5. **Check network**: Verify you can access the frontend

---

## 🎯 What Should Work After Fix

Once backend is running:
1. ✅ Login works (you can do this)
2. ✅ Dashboard loads students list
3. ✅ Availability calendar (if integrated)
4. ✅ All API endpoints return proper responses
5. ✅ Email password reset works
6. ✅ Feedback submission works

---

**Last Updated**: 2026-06-07
**Status**: 🔴 Backend is down - needs redeploy
