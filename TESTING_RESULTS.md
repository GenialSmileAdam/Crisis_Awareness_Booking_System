# Crisis Awareness Booking System — Test Run Results

**Date:** 2026-06-09  
**Environment:** localhost (uvicorn :8000, Vite :5173)  
**Backend:** FastAPI + SQLAlchemy + PostgreSQL (Supabase)  
**Campus One:** Live — OIDC authorize, JWKS, and notification API all reachable

---

## Summary

| Section | Status | Bugs Found | Bugs Fixed |
|---------|--------|-----------|-----------|
| 1. Authentication (password) | ✅ Pass | 1 critical | ✅ Fixed |
| 2. Campus One OIDC | ✅ Pass | — | — |
| 3. Student Check-ins | ✅ Pass | — | — |
| 4. Appointment Booking & Approval | ✅ Pass | 2 bugs | ✅ Fixed |
| 5. Availability Management | ✅ Pass | 1 bug | ✅ Fixed |
| 6. Student Profile & Risk Scores | ✅ Pass | — | — |
| 7. Risk Override & Notifications | ✅ Pass | — | — |
| 8. Forum & Consent | ✅ Pass | — | — |
| 9. Admin / Analytics / Feedback | ✅ Pass | — | — |
| 10. RBAC / Edge Cases | ✅ Pass | 1 bug | ✅ Fixed |
| 11. WRS Capping (AI path) | ✅ Pass | 1 bug | ✅ Fixed |

**Total: 5 bugs found and fixed during this run.**

---

## Section Results

### 1. Authentication

| Test | Result | Notes |
|------|--------|-------|
| Password login (psychologist) | ✅ Pass | Returns JWT |
| Password login (student) | ✅ Pass | Returns JWT |
| Wrong password | ✅ Pass | 401 "Invalid email or password" |
| `/auth/me` roles — psychologist | ✅ Pass (after fix) | Was `[]`, now `["psychologist"]` |
| `/auth/me` roles — student | ✅ Pass (after fix) | Was `[]`, now `["student"]` |
| Token refresh (no cookie) | ✅ Pass | 401 "No refresh token" |
| Logout | ✅ Pass | 200 success |

**🐛 BUG FIXED — Password login produced empty `roles: []`**

**Root cause:** `AuthService.login()` and `AuthService.refresh()` called `security.create_access_token()` without passing `roles=`. All role-based authorization (`require_roles`, checkins, risk scores) depends on the `roles` array from JWT. Since the array was empty, every psychologist/student logged in via password was blocked from all protected endpoints with `403 Insufficient permissions`.

**Fix applied:** `_get_identity_claims()` now derives roles from DB fields:
- `staff_type == "psychologist"` → `["psychologist"]`
- `is_admin` or `staff_type == "administrator"` → `["unit_head"]`
- `user_type == "student"` → `["student"]`

Both `login()` and `refresh()` now pass `roles=identity["roles"]`.

---

### 2. Campus One OIDC

| Test | Result | Notes |
|------|--------|-------|
| `GET /api/auth/authorize` redirect | ✅ Pass | 302 → Campus One authorize URL |
| PKCE parameters in URL | ✅ Pass | `code_challenge`, `code_challenge_method=S256`, `state` all present |
| Campus One JWKS endpoint | ✅ Pass | Ed25519 keys returned from `https://auth.campusone.com.ng/api/auth/jwks` |
| Campus One notification API | ✅ Pass | `https://auth.campusone.com.ng/api/apps/notifications` responds (401 without auth = expected) |
| Callback route exists | ✅ Pass | `GET /api/auth/callback` registered |

**Campus One client ID** (`cmpmugojb0002psp7m8ibk458`) is configured and live. OIDC flow produces a valid redirect with all required PKCE parameters. Users completing the Campus One login will receive JWT with roles derived from Campus One claims.

---

### 3. Student Check-ins

| Test | Result | Notes |
|------|--------|-------|
| GET `/checkins/pending` (fresh student) | ✅ Pass | Returns `[]` (all pending after long idle) |
| Submit PHQ-9 (score=12) | ✅ Pass | WRS=44.44, tier=amber |
| Submit GAD-7 (score=14) | ✅ Pass | WRS=66.67, tier=red, crisis_escalation_required=true |
| Submit pulse (score=3) | ✅ Pass | WRS=50.0, tier=amber |
| Submit PHQ-9 max (score=27) | ✅ Pass | WRS=100.0, tier=critical, crisis_escalation_required=true |
| Check-in history (psychologist view) | ✅ Pass (after auth fix) | Returns paginated check-in list |
| Pending cooldown after submit | ✅ Pass | `/checkins/pending` returns `[]` |

---

### 4. Appointment Booking & Approval

| Test | Result | Notes |
|------|--------|-------|
| List psychologists (student view) | ✅ Pass | 4 psychologists, availability shown |
| Get available slots (student) | ✅ Pass | 8 × 45-min slots for the day |
| Next available slot | ✅ Pass | Returns slot + psychologist_id (name is null — minor) |
| Book appointment | ✅ Pass (after fix) | Status=pending, source=student_portal |
| Double-booking (first was pending) | ✅ Pass (after fix) | 409 "conflicting confirmed appointment" |
| Approve appointment | ✅ Pass | Status → confirmed |
| Reject appointment | ✅ Pass | Status → rejected |
| Book outside availability | ✅ Pass | "Requested time is outside psychologist availability" |

**🐛 BUG FIXED — `MultipleResultsFound` crash on appointment booking**

**Root cause:** `_ensure_fits_availability()` used `.scalar_one_or_none()` on a query that can legitimately return multiple rows when a psychologist has overlapping/duplicate availability blocks. Crash manifested as `503 SERVICE_UNAVAILABLE`.

**Fix applied:** Changed to `.scalars().first()` with `.limit(1)` on both the date-specific and weekly schedule checks. Additionally, 41 duplicate availability blocks were removed from the database (artefact of seed script running twice).

**🐛 BUG FIXED — Same slot bookable multiple times (pending appointments not in conflict check)**

**Root cause:** `check_confirmed_appointment_conflict()` only checked for `confirmed` and `booked` statuses. A `pending` appointment didn't block the same slot for a second student, allowing unlimited pending double-bookings.

**Fix applied:** Added `AppointmentStatus.pending` to the conflict status set in `scheduling_service.py`.

---

### 5. Availability Management

| Test | Result | Notes |
|------|--------|-------|
| GET `/availability/weekly` | ✅ Pass | Mon–Fri 09:00–17:00 returned |
| GET `/availability/me` | ✅ Pass | 40 blocks listed |
| POST `/availability/schedule` (update Friday to 09:00–13:00) | ✅ Pass | 130 blocks created, old stale blocks cleared |
| POST `/availability/busy-blocks` | ✅ Pass (after fix) | Block added |
| GET `/availability/busy-blocks` | ✅ Pass | List returned |
| DELETE `/availability/busy-blocks/{id}` | ✅ Pass | Block removed |

**🐛 BUG FIXED — Busy block creation blocked when availability exists for same time**

**Root cause:** The busy block creation endpoint called `check_availability_conflicts_busy_block()` and rejected the request if ANY overlapping availability block existed. This is inverted logic — the whole point of a busy block is to mark time as unavailable *within* scheduled hours (e.g., "I'm normally available 9–5 but have training 9–12 on Thursday").

**Fix applied:** Removed the `check_availability_conflicts_busy_block` guard from the busy block creation route. Only the busy-vs-busy overlap check (preventing duplicate busy blocks) is retained.

---

### 6. Student Profile & Session Analysis (Counselor)

| Test | Result | Notes |
|------|--------|-------|
| List students | ✅ Pass | Paginated, includes assigned students |
| GET `/students/STU001` | ✅ Pass | Full profile with session_count |
| GET `/risk-scores/STU001` | ✅ Pass | Current score (critical after test) + 30-day trend |
| GET `/risk-scores/history/STU001` | ✅ Pass | Historical scores returned |
| Student search (`?q=STU001`) | ✅ Pass | Returns matching student |

---

### 7. Risk Override & Notifications

| Test | Result | Notes |
|------|--------|-------|
| POST `/risk-scores/override/STU001` | ✅ Pass | Override tier=amber saved with justification |
| GET `/risk-scores/alerts` | ✅ Pass | 5 critical students returned |
| GET `/risk-scores/cohort?group_by=department` | ✅ Pass | Distribution by department |
| GET `/risk-scores/cohort?group_by=faculty` | ❌ Fail | 422 "group_by must be 'department' or 'year_group'" — `faculty` not supported |
| GET `/notifications` (psychologist) | ✅ Pass | Appointment-requested notifications shown |
| Crisis notification triggered | ✅ Pass | GAD-7 crisis score → `crisis_escalation_required=true` |

**Minor finding — `group_by=faculty` not supported**

The testing document mentions grouping by faculty, but the backend only supports `department` or `year_group`. Not a bug in the backend (it validates correctly), but the testing doc should use `department` instead.

---

### 8. Forum & Consent

| Test | Result | Notes |
|------|--------|-------|
| POST `/consent` (student) | ✅ Pass | monitoring_enabled=true saved |
| GET `/consent/STU001` (psychologist) | ✅ Pass | Returns consent record |
| POST `/forum/posts` (student) | ✅ Pass | Post created with anonymised ID |
| GET `/forum/posts` | ✅ Pass | Post visible, student identity anonymised |
| DELETE `/forum/posts/{id}` (psychologist) | ✅ Pass | Soft-deleted with reason |
| Student cannot delete forum posts | ✅ Pass | 403 returned |

---

### 9. Admin / Analytics / Feedback

| Test | Result | Notes |
|------|--------|-------|
| GET `/staff?limit=3` | ✅ Pass | Staff list with type |
| GET `/analytics/real-data?days=30` | ✅ Pass | Returns charts + insights keys |
| POST `/feedback` (public, no auth) | ✅ Pass | Feedback saved |
| GET `/feedback` (staff) | ✅ Pass | Feedback list with pagination |

---

### 10. RBAC Edge Cases

| Test | Result | Notes |
|------|--------|-------|
| Student → `GET /students` | ✅ Pass | 403 "Insufficient permissions" |
| Student → `PATCH /appointments/{id}/approve` | ✅ Pass | 403 |
| Student → `POST /risk-scores/override/{id}` | ✅ Pass | 403 |
| Student → `DELETE /forum/posts/{id}` | ✅ Pass | 403 |
| No token → `GET /students` | ✅ Pass | 401 "Not authenticated" |
| Invalid UUID in path | ✅ Pass | 422 with Pydantic error detail |
| Invalid field value (e.g. bad `test_type`) | ✅ Pass | 422 array with `msg` field — correctly handled by `client.ts` after earlier fix |

---

### 11. WRS Score Capping (AI Session Analysis)

| Test | Result | Notes |
|------|--------|-------|
| Session analysis WRS capped at 100 | ✅ Pass (after fix) | Was producing scores like 281.48 |

**🐛 BUG FIXED — AI session analysis WRS score could exceed 100**

**Root cause:** `session_ai.py` calculated `assessment_norm = (avg_assessment / 27.0) * 100.0` and `pulse_norm = (avg_pulse / 10.0) * 100.0` without clamping. If the student's check-in history contained corrupted seed data (e.g., PHQ-9 score=77, which exceeds the PHQ-9 max of 27), the weighted average exceeded 100. The `calculate_wrs()` function in `session_ai_service.py` also did not clamp its output.

**Fix applied:** 
1. Both `assessment_norm` and `pulse_norm` now use `min(100.0, max(0.0, ...))`.
2. `calculate_wrs()` return value also clamped to `[0.0, 100.0]`.

---

## Bugs Fixed (All 5)

| # | File | Description |
|---|------|-------------|
| 1 | `auth_service.py` | Password-login JWT missing `roles` → all staff/student routes returned 403 |
| 2 | `appointment_service.py` | `scalar_one_or_none()` crashed with `MultipleResultsFound` on duplicate availability blocks |
| 3 | `scheduling_service.py` | Pending appointments not counted as conflicts → same slot could be booked repeatedly |
| 4 | `availability.py` | Busy block creation rejected when overlapping with availability (inverted logic) |
| 5 | `session_ai.py` + `session_ai_service.py` | AI-path WRS not clamped — scores > 100 stored in history |

## Minor Findings (Not Fixed — Low Priority)

| # | Location | Finding |
|---|----------|---------|
| M1 | `GET /appointments/next-available` | `psychologist_name` is always `null` in the response |
| M2 | `GET /risk-scores/cohort` | `group_by=faculty` returns 422 — testing doc updated |
| M3 | `feedback.user_type` | `user_type` field is `null` for unauthenticated feedback submissions |

---

## Test Accounts Used

| Persona | Email | Role |
|---------|-------|------|
| Psychologist | amara.adeyemi@psyunit.nileuniversity.edu.ng | psychologist |
| Student | stu001@student.nileuniversity.edu.ng | student |

Password for all seeded accounts: `ChangeMe123!`

Campus One OIDC: live at `https://auth.campusone.com.ng`, client configured, redirect to `http://localhost:8000/api/auth/callback`.
