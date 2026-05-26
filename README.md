# Crisis Awareness Booking Management System

**SafeSpace – Psychology Unit Management Platform**
Nile University of Nigeria Buildathon 2026

---

## Overview

A full-stack web platform for the university Psychology Unit that replaces manual, paper-based counselling administration with a digital system. Students complete evidence-based wellness self-assessments (PHQ-9, GAD-7, Pulse), book counselling sessions with crisis-priority flagging, and track their progress over time. Counsellors view real-time risk scores, manage appointments, and access full student profiles with WRS trend charts. Admins oversee the entire system with deployment KPIs.

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
| Charts | Recharts |
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
│   │   │   ├── AppSidebar.tsx
│   │   │   ├── CrisisBanner.tsx
│   │   │   ├── FeedbackButton.tsx
│   │   │   └── OnboardingSlides.tsx
│   │   ├── context/           # AuthContext, WrsContext
│   │   ├── pages/
│   │   │   ├── admin/         # AdminDashboard, AdminUsers, AdminForum, AdminResources, AdminSettings
│   │   │   ├── counselor/     # CounselorDashboard, MyStudents, CounselorStudent, SessionReviewer
│   │   │   └── student/       # StudentPortal, StudentAppointments, StudentHistory, StudentConsent, StudentForum
│   │   └── main.tsx
│   └── package.json
│
├── backend/                   # FastAPI application
│   ├── app/
│   │   ├── core/              # config.py, database.py, security.py
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── routers/           # One file per resource group
│   │   ├── schemas/           # Pydantic request/response models
│   │   └── services/          # Business logic layer
│   ├── migrations/            # Alembic migration files
│   ├── seed.py                # Semester seed script (20 students, 17 weeks of data)
│   ├── create_admin.py        # One-time admin bootstrap script
│   └── requirements.txt
│
├── Makefile                   # Dev shortcuts (install, dev, migrate, seed-data)
├── dev.sh                     # Starts both servers with pre-flight checks
├── .env                       # Project-root env (loaded by config.py)
└── README.md
```

---

## Authentication & Roles

### Login

All users log in at `POST /auth/login` with their **email address** and password.
The endpoint uses `OAuth2PasswordRequestForm` — requests must use `Content-Type: application/x-www-form-urlencoded` with fields `username` (email) and `password`.

On success the API returns a short-lived **access token** (JWT, 15 min) in the response body and sets an HTTP-only **refresh token** cookie (7 days).

### Roles

| Role | `role` value in JWT | Access |
|---|---|---|
| Student | `student` | Own profile, appointments, checkins, consent, forum |
| Counsellor / Psychologist | `psychologist` | Assigned students, risk scores, appointments, analytics |
| Admin | `admin` | Everything — user management, all staff, all students |

Admins are staff users with `is_admin = true`. The effective role is determined at login from the user's `is_admin` flag and `staff_type`.

---

## Wellness Risk Score (WRS)

The WRS is a 0–100 score computed from PHQ-9 and GAD-7 submissions:

```
WRS = round((raw_score / 27) × 100)
```

| Tier | WRS Range | Colour |
|---|---|---|
| Green | 0–39 | Low concern |
| Amber | 40–64 | Monitor closely |
| Red | 65–84 | Escalate soon |
| Critical | 85–100 | Immediate intervention |

Counsellors can override a student's tier with a written justification. Overrides are logged.

---

## Frontend Pages & Routes

| Route | Component | Access |
|---|---|---|
| `/` | `Landing.tsx` | Public |
| `/login` | `Login.tsx` | Public |
| `/student` | `StudentPortal.tsx` | Student |
| `/student/checkin` | `StudentPortal.tsx` (check-in view) | Student |
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

A floating **Feedback & Support** button is available on all authenticated pages.

---

## Backend API Reference

Base URL (local): `http://localhost:8000`  
Swagger UI: `http://localhost:8000/docs`

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a student or staff user |
| `POST` | `/auth/login` | Log in; returns access token + sets refresh cookie |
| `POST` | `/auth/refresh` | Rotate tokens |
| `POST` | `/auth/logout` | Revoke refresh token |

### Students

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/students` | Psychologist / Admin | List students (psychologist sees only assigned) |
| `GET` | `/students/search?student_id=` | Psychologist / Admin | Search by student ID |
| `GET` | `/students/{student_id}` | Psychologist / Admin | Full student profile |
| `PATCH` | `/students/{student_id}` | Psychologist / Admin | Update student record |
| `DELETE` | `/students/{student_id}` | Admin | Delete student |
| `GET` | `/students/{student_id}/sessions` | Psychologist / Admin | Session summaries |
| `GET` | `/students/{student_id}/crisis-logs` | Psychologist / Admin | Crisis log history |
| `POST` | `/students/upload-csv` | Admin | Bulk import from CSV |

### Wellness Check-ins

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/checkins/submit` | Student | Submit PHQ-9, GAD-7, or Pulse check-in |
| `GET` | `/checkins/pending` | Student | Get pending check-in prompts |
| `GET` | `/checkins/student/{student_id}` | Student (own) / Psychologist / Admin | Paginated check-in history |

**Submission payload:**
```json
{
  "student_id": "STU001",
  "test_type": "phq9",
  "responses": { "q1": 1, "q2": 0, "q3": 2, "q4": 1, "q5": 0, "q6": 0, "q7": 1, "q8": 0, "q9": 0 },
  "score": 5
}
```

### Risk Scores

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/risk-scores/alerts` | Psychologist / Admin | Students in amber/red/critical |
| `GET` | `/risk-scores/cohort` | Psychologist / Admin | Risk breakdown by cohort |
| `GET` | `/risk-scores/history/{student_id}?days=180` | Psychologist / Admin | WRS history for trend chart |
| `GET` | `/risk-scores/{student_id}` | Psychologist / Admin | Latest risk score + override |
| `POST` | `/risk-scores/override/{student_id}` | Psychologist / Admin | Manually override tier |

**Override payload:** `{ "override_tier": "amber", "justification": "Reason" }`

### Appointments

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/appointments` | Psychologist / Student | List appointments (scoped to caller) |
| `GET` | `/appointments/availability/{psych_id}?date=` | Any | Get available slots |
| `POST` | `/appointments/book` | Student | Book an appointment |
| `PATCH` | `/appointments/{id}` | Psychologist / Admin | Update appointment |
| `DELETE` | `/appointments/{id}` | Psychologist / Admin | Cancel appointment |

### Analytics

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/analytics/real-data` | Psychologist / Admin | Chart data from live DB |
| `GET` | `/analytics/university` | Admin | University-wide analytics |
| `GET` | `/analytics/summary-report` | Admin | Summary report |

### Forum & Feedback

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/forum/posts` | Any authenticated | List forum posts |
| `POST` | `/forum/posts` | Student | Create a forum post |
| `DELETE` | `/forum/posts/{post_id}` | Staff / Admin | Remove a post |
| `POST` | `/feedback` | None | Submit feedback or support request |

---

## Setup & Running Locally

### Prerequisites

- Node.js 18+
- Python 3.11+
- A Supabase project (PostgreSQL)

### 1. Clone & install dependencies

```bash
git clone <repo-url>
cd Crisis_Awareness_Booking_System
make install
```

`make install` creates a Python virtualenv, installs backend requirements, and runs `npm install` for the frontend.

### 2. Configure environment

```bash
cp backend/.env.example .env
```

Edit `.env` at the **project root**:

```env
DATABASE_URL=postgresql+asyncpg://user:password@host:port/dbname

SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>

JWT_SECRET=<long-random-string>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Optional – leave false to run without external APIs
AI_ENABLED=false
GROQ_API_KEY=

EMAIL_ENABLED=false
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_TO=

GCAL_ENABLED=false
SMS_ENABLED=false
```

### 3. Run migrations

```bash
make migrate
```

### 4. Seed demo data (optional)

Populates the database with a full semester of realistic data — 20 students across all risk tiers, 17 weeks of PHQ-9/GAD-7/Pulse check-ins with midterm and finals stress peaks, appointments, and crisis logs.

```bash
make seed-data
```

**Demo credentials** (password: `ChangeMe123!` for all):

| ID | Name | Email | Risk |
|---|---|---|---|
| PSY001 | Dr. Amara Adeyemi | amara.adeyemi@psyunit.nileuniversity.edu.ng | — |
| PSY002 | Dr. Kelechi Ibrahim | kelechi.ibrahim@psyunit.nileuniversity.edu.ng | — |
| PSY003 | Dr. Bola Okonkwo | bola.okonkwo@psyunit.nileuniversity.edu.ng | — |
| STU001 | Chioma Okafor | stu001@student.nileuniversity.edu.ng | Green |
| STU002 | Emeka Nwosu | stu002@student.nileuniversity.edu.ng | Amber |
| STU008 | Kemi Obaseki | stu008@student.nileuniversity.edu.ng | Critical |
| STU013 | Zainab Musa | stu013@student.nileuniversity.edu.ng | Red |
| STU015 | Precious Ejefu | stu015@student.nileuniversity.edu.ng | Critical |
| STU018 | Hassan Abdullahi | stu018@student.nileuniversity.edu.ng | Red |

All 20 student emails follow the pattern `stu001@student.nileuniversity.edu.ng` through `stu020@...`

To bootstrap the first admin account, edit `backend/create_admin.py` with the desired credentials and run:
```bash
cd backend && ../venv/bin/python create_admin.py
```

### 5. Start the dev servers

```bash
make dev
```

Starts both servers in one terminal with pre-flight checks:

| Service | URL |
|---|---|
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| Frontend | http://localhost:5173 |

Press `Ctrl+C` to stop both. Run separately if needed:

```bash
make backend    # FastAPI only (port 8000)
make frontend   # Vite only   (port 5173)
```

---

## Key Design Decisions

- **Psychologist scoping**: Counsellors only see students assigned to them via `assigned_psychologist_id`. Admins see everyone.
- **Dual-token auth**: Short-lived JWT access tokens (15 min) with rotating HTTP-only refresh tokens (7 days). Refresh token reuse triggers full revocation.
- **WRS calculation**: Submitting a PHQ-9 or GAD-7 automatically computes a 0–100 Wellness Risk Score and places the student in a risk tier. Counsellors can override with a written justification.
- **WRS trend tracking**: The `/risk-scores/history/{student_id}` endpoint returns the full semester's WRS history, rendered as an AreaChart with tier reference lines in the counsellor's student profile view.
- **Semester seed**: `seed.py` generates 17 weeks of data with Gaussian stress bumps at midterms (week 7) and finals (week 15), four risk profiles, and realistic appointment/crisis log patterns. Re-running is idempotent.
- **Optional integrations**: AI insights (Groq), email (Resend), Google Calendar, and SMS are feature-flagged and default to disabled.
- **Feedback & support**: A floating button on all authenticated pages allows users to submit feedback (1–5 stars) or contact support at andreekunwe@gmail.com with defined SLAs.

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
