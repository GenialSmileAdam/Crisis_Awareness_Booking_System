# Production Deployment Guide

## Overview
This guide covers deploying the Crisis Awareness Booking System to production with full Campus One OIDC integration.

**Deployment Stack:**
- Frontend: Vercel (https://crisis-awareness-booking-system.vercel.app)
- Backend: Render (https://crisis-awareness-booking-system.onrender.com)
- Database: Supabase PostgreSQL
- OAuth Provider: Campus One (https://auth.campusone.com.ng)

---

## 1. Render Backend Deployment

### Environment Variables Setup
The backend requires these environment variables on Render. They are stored in the root `.env` file but NOT committed to git (in `.gitignore`).

**Required variables for production:**

```env
# Database
DATABASE_URL=postgresql+asyncpg://...

# JWT Configuration
JWT_SECRET=<your-secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Supabase
SUPABASE_URL=https://...supabase.co/rest/v1/
SUPABASE_SERVICE_KEY=sb_secret_...

# Campus One OIDC (production credentials)
CAMPUS_ONE_CLIENT_ID=cmpmugojb0002psp7m8ibk458
CAMPUS_ONE_CLIENT_SECRET=931e801f2312b179f549acb690d3e5aece26c04d7c7c9cd041de0ecfd9eac5ba
CAMPUS_ONE_WEBHOOK_SECRET=bbc199fa867da3bbc177a7c6a90fc135773d2caa93203d14f65490e992c54f31
CAMPUS_ONE_ISSUER=https://auth.campusone.com.ng
CAMPUS_ONE_DISCOVERY_URL=https://auth.campusone.com.ng/api/auth/.well-known/openid-configuration
CAMPUS_ONE_JWKS_URL=https://auth.campusone.com.ng/api/auth/jwks
CAMPUS_ONE_SCOPES=openid email profile academic notifications
CAMPUS_ONE_REDIRECT_URI=https://crisis-awareness-booking-system.onrender.com/api/auth/callback

# Deployment URLs
FRONTEND_URL=https://crisis-awareness-booking-system.vercel.app
BACKEND_URL=https://crisis-awareness-booking-system.onrender.com

# Features (adjust as needed)
AI_ENABLED=false
GCAL_ENABLED=false
EMAIL_ENABLED=false
SMS_ENABLED=false
```

### Steps to Update Render Environment

1. **Go to Render Dashboard** → Your Backend Service
2. **Environment → Add Environment Variable**
   - Add each variable from the list above
   - Use the values from the `.env` file
3. **Deploy → Manual Deploy** (or push to trigger auto-deploy)
4. **Wait for deployment** to complete (5-10 minutes)
5. **Verify** at `https://crisis-awareness-booking-system.onrender.com/docs`

### Important: Keep Secrets Safe
- Never commit `.env` to git (it's in `.gitignore`)
- Credentials are stored in Render's environment
- If credentials are compromised, rotate them immediately

---

## 2. Vercel Frontend Deployment

### Environment Variables Setup
Set these in Vercel Dashboard (Project Settings → Environment Variables):

```
VITE_API_BASE_URL=https://crisis-awareness-booking-system.onrender.com
```

### Automatic Deployment
The frontend automatically deploys when you push to main:
1. Push code to main branch
2. Vercel automatically builds and deploys
3. Check deployment status at https://vercel.com/dashboard

### Manual Deployment (if needed)
```bash
# If you have Vercel CLI installed
vercel --prod
```

---

## 3. Campus One OIDC Configuration

### OAuth Redirect URI
Campus One dashboard must have this registered:
```
https://crisis-awareness-booking-system.onrender.com/api/auth/callback
```

### Scopes
The backend requests these scopes:
- `openid` (OIDC required)
- `email` (user email)
- `profile` (user name, picture, etc.)
- `academic` (student info: ID, faculty, department)
- `notifications` (optional)

### ID Token Claims Expected
The backend extracts these from Campus One's ID token:
- `sub` (unique user ID) → used for campus_one_id
- `email` (email address)
- `name` (full name)
- `role` (student/staff)
- `student_id` (if applicable)
- `faculty` (if applicable)
- `department_id` (if applicable)
- `level` (class level for students)
- `year_of_study` (for students)
- `programme` (course program)

---

## 4. Database Migrations

The backend uses Alembic for database migrations. They run automatically on Render during the build phase.

**If manual migration needed:**
```bash
# From backend directory
alembic upgrade head
```

---

## 5. Testing the Deployment

### Test Campus One Login Flow

1. **Go to frontend:** https://crisis-awareness-booking-system.vercel.app
2. **Click "Sign in with Campus One"**
3. **Verify flow:**
   - ✅ Redirected to Campus One login
   - ✅ Login with Campus One credentials
   - ✅ Consent screen appears
   - ✅ Redirected back to your app
   - ✅ Logged in automatically
   - ✅ Redirected to student/staff dashboard

### Test Traditional Login

1. **Go to frontend** and use email/password credentials
2. **Verify:**
   - ✅ Can sign in with email
   - ✅ Can sign up new account
   - ✅ JWT token works

### Test Refresh Token

1. **Wait 15 minutes** or restart browser
2. **Verify:**
   - ✅ Session persists
   - ✅ Refresh token cookie automatically refreshes access token
   - ✅ No re-login required

---

## 6. Troubleshooting

### "State mismatch - possible CSRF attack"
This shouldn't happen in production (different issue in local dev):
- Verify `CAMPUS_ONE_REDIRECT_URI` matches exactly
- Check cookies are being set with `Path=/`
- Clear browser cookies and try again

### Frontend Can't Reach Backend API
- Verify `VITE_API_BASE_URL` is set correctly in Vercel
- Check CORS is enabled in backend
- Verify backend is running and healthy

### User Created but Not Logged In
- Check JWT token is being generated
- Verify token is stored in localStorage
- Check console for errors

### Campus One Redirect Loop
- Verify state/code_verifier cookies aren't being blocked
- Check that `secure=True` in production (not `secure=False`)
- Verify redirect URI matches exactly in Campus One dashboard

---

## 7. Monitoring & Logs

### Render Logs
```
Render Dashboard → Your Service → Logs
```
View real-time backend logs here

### Vercel Logs
```
Vercel Dashboard → Your Project → Deployments
```
View build and runtime logs here

### Email Alerts
Both Render and Vercel can email you on deployment failures

---

## 8. Security Checklist

- ✅ JWT_SECRET is strong and unique
- ✅ CAMPUS_ONE_CLIENT_SECRET never in git
- ✅ Database password never in git
- ✅ All HTTPS (no HTTP in production)
- ✅ CORS properly configured
- ✅ Refresh tokens httponly and secure
- ✅ State/code_verifier CSRF protection enabled
- ✅ Rate limiting enabled on login endpoints

---

## 9. First Deployment Checklist

Before pushing:
- [ ] `.env` file updated with production URLs
- [ ] All secrets stored in `.env` (not committed)
- [ ] Campus One credentials verified
- [ ] Frontend & backend URLs match
- [ ] Code committed and ready to push
- [ ] Render environment variables ready to update
- [ ] Vercel environment variables ready to update

After pushing:
- [ ] Update Render environment variables
- [ ] Wait for Render deployment to complete
- [ ] Update Vercel environment variables (or auto-deployed)
- [ ] Test Campus One login flow
- [ ] Check logs for any errors
- [ ] Monitor for 24 hours

---

## 10. Rollback Procedure

If something goes wrong:

**Render:**
```
Render Dashboard → Deployments → Select previous version → Rollback
```

**Vercel:**
```
Vercel Dashboard → Deployments → Select previous version → Rollback
```

---

## Current Status

✅ **Code is production-ready**
- Campus One integration: complete and tested
- All authentication flows implemented
- Error handling in place
- Both local dev and production configs ready

📝 **Remaining steps:**
1. Update Render environment variables with the values from `.env`
2. Redeploy Render backend
3. Vercel frontend will auto-deploy when you push
4. Test the full flow in production
5. Monitor logs for any issues

---

## Support

For issues, check:
1. Backend logs in Render
2. Frontend console (F12 in browser)
3. Network tab (XHR requests)
4. Campus One OAuth logs (if available)

---

**Last Updated:** 2026-06-01
**System Status:** Ready for Production Deployment 🚀
