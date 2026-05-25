# Crisis Awareness Booking Management System

**PsyUnit – Psychology Unit Management Platform**
Nile University of Nigeria Buildathon 2026

---

## Overview

A full-stack web platform for the university Psychology Unit that replaces manual, paper-based counselling administration with a digital system. Students can book counselling sessions (with crisis priority flagging), complete evidence-based wellness self-assessments, and manage their consent settings. Counsellors view risk scores, manage appointments, and document sessions. Admins oversee the entire system.

**Live Frontend:** [crisis-awareness-booking-system.vercel.app](https://crisis-awareness-booking-system.vercel.app)

---

## Problem Solved

The Psychology Unit operated with no digital system — scheduling was manual, session notes were disconnected, crisis cases had no priority pathway, and counsellors spent most of their time on admin instead of student care. This platform automates that workflow end-to-end.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui (Radix UI) |
| State / Data Fetching | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| Routing | React Router v6 |
| Backend | Python 3.12 + FastAPI (async) |
| ORM | SQLAlchemy 2.0 (async) |
| Database | PostgreSQL via Supabase |
| Migrations | Alembic |
| Auth | JWT (access) + HTTP-only refresh cookie |
| Rate Limiting | SlowAPI |
| AI / Insights | Groq API (optional) |
| Notifications | Resend (email, optional) |
| Hosting | Railway (backend) + Vercel (frontend) |

---

## Project Structure

```
/
├── frontend/                  # React + Vite SPA
│   ├── src/
│   │   ├── api/               # API client functions (per resource)
│   │   ├── components/        # Reusable UI components
│   │   ├── context/           # AuthContext (JWT + session state)
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── admin/         # AdminDashboard, AdminUsers, AdminForum, AdminResources, AdminSettings
│   │   │   ├── counselor/     # CounselorDashboard, MyStudents, CounselorStudent, SessionReviewer, CounselorForum
│   │   │   └── student/       # StudentPortal, StudentAppointments, StudentHistory, StudentConsent, StudentForum, StudentResources
│   │   └── main.tsx
│   └── package.json
│
├── backend/                   # FastAPI application
│   ├── app/
│   │   ├── core/              # config.py, database.py, security.py, limiter.py
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── routers/           # One file per resource group
│   │   ├── schemas/           # Pydantic request/response models
│   │   ├── services/          # Business logic layer
│   │   └── utils/             # Pagination helpers, response helpers
│   ├── migrations/            # Alembic migration files
│   ├── create_admin.py        # One-time script to seed the first admin user
│   └── requirements.txt
│
├── .env                       # Project-root env (loaded by config.py)
└── README.md
```

---

## Authentication & Roles

### Login

All users (students, counsellors, admins) log in at `POST /auth/login` with their **email address** and password.
The endpoint uses `OAuth2PasswordRequestForm` — requests must use `Content-Type: application/x-www-form-urlencoded` with fields `username` (email) and `password`.

On success the API returns a short-lived **access token** (JWT, 15 min) in the response body and sets an HTTP-only **refresh token** cookie (7 days).

### Roles

| Role | `role` value in JWT | Access |
|---|---|---|
| Student | `student` | Own profile, appointments, checkins, consent, forum |
| Counsellor / Psychologist | `psychologist` | Assigned students, risk scores, appointments, analytics, forum |
| Admin | `admin` | Everything — user management, all staff, all students |

Admins are staff users with `is_admin = true`. The effective role (`admin` vs `psychologist`) is determined at login from the user's `is_admin` flag and `staff_type`.

### JWT Payload

```json
{
  "id": "<uuid>",
  "name": "Full Name",
  "role": "psychologist",
  "user_type": "staff",
  "is_admin": false,
  "staff_type": "psychologist",
  "staff_id": "PSY001",
  "student_id": null
}
```

---

## Frontend Pages & Routes

| Route | Component | Access |
|---|---|---|
| `/` | `Landing.tsx` | Public |
| `/login` | `Login.tsx` | Public |
| `/student` | `StudentPortal.tsx` | Student |
| `/student/appointments` | `StudentAppointments.tsx` | Student |
| `/student/history` | `StudentHistory.tsx` | Student |
| `/student/consent` | `StudentConsent.tsx` | Student |
| `/student/forum` | `StudentForum.tsx` | Student |
| `/student/resources` | `StudentResources.tsx` | Student |
| `/counselor` | `CounselorDashboard.tsx` | Psychologist |
| `/counselor/students` | `MyStudents.tsx` | Psychologist |
| `/counselor/student/:id` | `CounselorStudent.tsx` | Psychologist |
| `/counselor/sessions` | `SessionReviewer.tsx` | Psychologist |
| `/counselor/forum` | `CounselorForum.tsx` | Psychologist |
| `/admin` | `AdminDashboard.tsx` | Admin |
| `/admin/users` | `AdminUsers.tsx` | Admin |
| `/admin/forum` | `AdminForum.tsx` | Admin |
| `/admin/resources` | `AdminResources.tsx` | Admin |
| `/admin/settings` | `AdminSettings.tsx` | Admin |

The frontend stores the access token in `localStorage` under the key `safespace_access_token` and the decoded user object under `ss_user`. The `AuthContext` attempts a silent token refresh on mount.

---

## Backend API Reference

Base URL (local): `http://localhost:8000`

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Register a student or staff user |
| `POST` | `/auth/login` | None (form-urlencoded) | Log in; returns access token + sets refresh cookie |
| `POST` | `/auth/refresh` | Refresh cookie | Rotate tokens |
| `POST` | `/auth/logout` | Bearer | Revoke refresh token |

**Register payload (JSON):**
```json
{
  "email": "user@university.edu",
  "password": "SecurePass1!",
  "full_name": "Full Name",
  "user_type": "staff",
  "staff_id": "PSY001",
  "staff_type": "psychologist"
}
```
For students: `user_type: "student"`, `student_id`, `class_level`, `emergency_contact`, `emergency_phone`.

---

### Users (Admin only)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/users` | Admin | List all users |
| `POST` | `/users` | Admin | Create a user |
| `GET` | `/users/{id}` | Admin | Get user by ID |
| `PATCH` | `/users/{id}` | Admin | Update user |
| `DELETE` | `/users/{id}` | Admin | Soft-delete user |

---

### Students

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/students` | Psychologist / Admin | List students (psychologist sees only assigned) |
| `GET` | `/students/search?q=` | Psychologist / Admin | Search by student ID |
| `GET` | `/students/{student_id}` | Psychologist / Admin | Get student profile |
| `GET` | `/students/{student_id}/sessions` | Psychologist / Admin | List session summaries |
| `GET` | `/students/{student_id}/crisis-logs` | Psychologist / Admin | List crisis events |
| `POST` | `/students/upload-csv` | Psychologist / Admin | Bulk import from CSV |

> Psychologists only see students where `assigned_psychologist_id` matches their user ID.

---

### Staff

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/psychologists` | All authenticated | List all psychologists |
| `GET` | `/staff` | Admin | List all staff |
| `POST` | `/staff` | Admin | Create staff member |
| `GET` | `/staff/{id}` | Admin | Get staff member |
| `PATCH` | `/staff/{id}` | Admin | Update staff member |
| `DELETE` | `/staff/{id}` | Admin | Remove staff member |

---

### Appointments

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/appointments` | Psychologist / Student | List appointments (scoped to caller) |
| `GET` | `/appointments/availability/{psych_id}?date=` | Any authenticated | Get available slots |
| `POST` | `/appointments` | Psychologist / Admin | Create appointment (admin/counsellor flow) |
| `POST` | `/appointments/book` | Student | Book an appointment (student flow) |
| `PATCH` | `/appointments/{id}` | Psychologist / Admin | Update appointment |
| `DELETE` | `/appointments/{id}` | Psychologist / Admin | Cancel appointment |

**Student booking payload (JSON):**
```json
{
  "psychologist_id": "<uuid>",
  "start_time": "2026-06-20T10:00:00",
  "end_time": "2026-06-20T11:00:00",
  "is_crisis": false,
  "crisis_note": null
}
```

---

### Consent

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/consent` | Student | Set monitoring consent |
| `GET` | `/consent/{student_id}` | Student (own) / Psychologist / Admin | Get consent record |

**Consent payload:** `{ "monitoring_enabled": true }`

---

### Wellness Check-ins

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/checkins/submit` | Student | Submit PHQ-9, GAD-7, or pulse check |
| `GET` | `/checkins/pending` | Student | Get pending check-in prompts |
| `GET` | `/checkins/student/{student_id}` | Student (own) / Psychologist / Admin | Get check-in history |

**Submission payload (JSON):**
```json
{
  "student_id": "STU001",
  "test_type": "phq9",
  "responses": { "q1": 1, "q2": 0, "q3": 2, "q4": 1, "q5": 0, "q6": 0, "q7": 1, "q8": 0, "q9": 0 },
  "score": 5
}
```
Supported `test_type` values: `phq9`, `gad7`, `pulse`.
Submitting PHQ-9 or GAD-7 automatically calculates and stores a Wellness Risk Score (WRS).

---

### Risk Scores

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/risk-scores/cohort` | Psychologist / Admin | Aggregated risk by cohort |
| `GET` | `/risk-scores/alerts` | Psychologist / Admin | Students in amber/red/critical tier |
| `GET` | `/risk-scores/{student_id}` | Psychologist / Admin | Latest risk score for a student |
| `POST` | `/risk-scores/override/{student_id}` | Psychologist / Admin | Manually override tier |

**Override payload:** `{ "override_tier": "amber", "justification": "Reason" }`
Valid tiers: `green`, `amber`, `red`, `critical`.

---

### Analytics

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/analytics/real-data` | Psychologist / Admin | Chart data from live DB |
| `GET` | `/analytics/department/{dept_id}` | Psychologist / Admin | Department-scoped analytics |
| `GET` | `/analytics/university` | Admin | University-wide analytics |
| `GET` | `/analytics/summary-report` | Admin | Summary report |

---

### Forum

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/forum/posts` | Any authenticated | List forum posts |
| `POST` | `/forum/posts` | Student | Create a forum post |
| `DELETE` | `/forum/posts/{post_id}` | Staff / Admin | Soft-delete a post |

---

### Feedback

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/feedback` | None | Submit feedback |
| `GET` | `/feedback/health` | None | Health check |

**Feedback payload:** `{ "name": "Jane", "email": "jane@uni.edu", "message": "Great app!", "rating": 5 }`

---

## Setup & Running Locally

### Prerequisites

- Node.js 18+
- Python 3.11+
- A Supabase project (PostgreSQL)

### 1. Clone & configure environment

```bash
git clone <repo-url>
cd Crisis_Awareness_Booking_System

# Copy the example env and fill in your values
cp backend/.env.example .env
```

**Required environment variables (in `.env` at project root):**

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@host:port/dbname

# Supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>

# JWT
JWT_SECRET=<long-random-string>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Optional features (set to false to disable)
AI_ENABLED=false
GROQ_API_KEY=

EMAIL_ENABLED=false
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_TO=

GCAL_ENABLED=false
SMS_ENABLED=false
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed first admin user (edit email/password in create_admin.py first)
python create_admin.py

# Start the server
uvicorn app.main:app --reload --port 8000
```

API docs are available at `http://localhost:8000/docs` (Swagger UI).

### 3. Frontend

```bash
cd frontend
npm install

# Optional: set API base URL (defaults to http://localhost:8000)
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local

npm run dev
# Opens at http://localhost:5173
```

---

## Key Design Decisions

- **Psychologist scoping**: Counsellors only see students assigned to them (`assigned_psychologist_id`). Admins see everyone.
- **Dual-token auth**: Short-lived JWT access tokens (15 min) with rotating HTTP-only refresh tokens (7 days). Refresh token reuse triggers full revocation (security violation).
- **WRS calculation**: Submitting a PHQ-9 or GAD-7 automatically computes a 0–100 Wellness Risk Score and places the student in a risk tier (`green` → `amber` → `red` → `critical`).
- **Idempotency keys**: POST/PATCH endpoints accept an `Idempotency-Key` header to prevent duplicate submissions on network retry.
- **Optional integrations**: AI insights (Groq), email (Resend), Google Calendar, and SMS are all feature-flagged and default to disabled, so the system runs without external API keys in development.

---

## Team

| Role | Name |
|---|---|
| Team Leader / Product | Jason Oladipo Hughes |
| Frontend Developer | Akinpelu Oluwafemi-David |
| Backend Developer | Sodiq Abdulwaris |
| Backend Developer | Ridwan Olateju |
| Data / AI Engineer | Daniel Olugbule |
| Frontend Developer | Odosa Enarureo |

---

## License

Academic project – Nile University of Nigeria Buildathon 2026
