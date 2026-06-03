# Handoff Summary: Campus One Integration & Backend Stability Improvements

This document provides an overview of the backend updates for the frontend team and the team lead. It details the integration requirements for Nile University's Campus One identity platform and the stability fixes implemented across core backend services.

---

## Part 1: Campus One SSO & Notifications Integration

### 1. Unified Notification Dispatch
SafeSpace now supports dual notification delivery paths. When alerts (like crisis notifications) are triggered, they can be processed:
- **Natively**: Saved locally to the SafeSpace database and queued for email.
- **Campus One**: Pushed directly to the user's central Campus One app shell/dashboard.

### 2. Mandatory Scopes for the Frontend
To allow the backend to dispatch notifications to Campus One (especially when a user is offline), the authentication flow **must request the correct scopes**. 

If you are using the backend's authorize redirect endpoint (`/auth/campus-one/authorize`), it will automatically request these. If the frontend is initiating the OIDC authentication flow directly, please ensure the following scopes are requested:

| Scope | Purpose |
| :--- | :--- |
| `notifications` | Grants SafeSpace permission to post notifications to the student's/psychologist's Campus One dashboard. |
| `offline_access` | **Mandatory** for background actions. It returns a `refresh_token`, which allows our backend to refresh access credentials and send notifications (e.g., notifying a psychologist of a student crisis) even if the target user is currently logged out. |

**Required Scopes String**:
```
openid email profile academic notifications offline_access
```

### 3. Notification Control Toggles
We have added two switches to the `.env` file to make it easy to toggle notification paths on and off:
```bash
# Enable/disable native database & email notifications inside SafeSpace
SAFESPACE_NOTIF=True

# Enable/disable pushing notifications to the user's Campus One dashboard
SAFESPACE_CAMPUS_ONE_NOTIF=True
```

---

## Part 2: Backend Stability & Feature Refactors

We have resolved several shaky implementations, mocks, and potential failure points to ensure the app is production-ready.

### 1. AI Session Storage: In-Memory to DB Persistence
- **Change**: AI session details (audio metadata, transcripts, summaries, statuses) are now stored in a persistent `sessions` database table mapped via the SQLAlchemy `Session` model.
- **Frontend Impact**: Session notes, transcripts, and metadata will no longer vanish if the server restarts.

### 2. Standardized Risk Tier Casing
- **Change**: Standardized all WRS calculator return values to lowercase (`green`, `amber`, `red`, `critical`) to match the `RiskTier` DB enum.
- **Frontend Impact**: Ensures consistent casing in API responses and prevents database insertion crashes.

### 3. Dynamic AI WRS Assessment & Analysis
- **Change**: The `/ai/sessions/analyze` endpoint no longer uses hardcoded dummy scores. It dynamically calculates the student's Wellness Risk Score (WRS) by querying their actual database history (PHQ-9/GAD-7 averages, pulse check-in trends, crisis history, and appointment attendance rate).
- **Frontend Impact**: Analyzing a session now returns a real, dynamically calculated WRS score and risk tier for the student.

### 4. Dynamic "Pending Check-ins" Endpoint
- **Change**: The `/checkins/pending` endpoint is no longer hardcoded. It now dynamically checks if a student has submitted check-ins in the last 24 hours (returning a "pulse" request if not) and checks their latest risk tier (returning a "phq9" assessment suggestion if their risk is elevated and they haven't been assessed in 7 days).
- **Frontend Impact**: The pending check-in list on the student dashboard is now live and personalized.

### 5. Filtered Departmental and Summary Analytics
- **Change**: The `/analytics/department/{dept_id}` endpoint now correctly joins the student records and filters charts and statistics by the department ID instead of returning global cached data.
- **Frontend Impact**: Department reports will now correctly reflect department-specific metrics.

### 6. Graceful DB Failure Handler
- **Change**: Registered a global exception handler for `SQLAlchemyError` in the FastAPI app.
- **Frontend Impact**: If the database goes offline or connection drops, the API now returns a clean `503 Service Unavailable` JSON response instead of a raw unhandled 500 error page.
