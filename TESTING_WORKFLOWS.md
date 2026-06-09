# Crisis Awareness Booking System — Testing Workflows

> Use this document to manually test every user-facing workflow end-to-end.
> Each section lists the prerequisite state, numbered steps, and the expected outcome.

---

## Test Accounts

Set these up before running any workflow:

| Persona | Role | Credentials |
|---------|------|-------------|
| **Student A** | `student` | Campus One login or local email/password |
| **Student B** | `student` | Second student for multi-user scenarios |
| **Psychologist P** | `psychologist` | Campus One login (staff_type = psychologist) |
| **Admin A** | `unit_head` / `is_admin=true` | Campus One login or local admin account |

> Migakistudios account is available as a test psychologist.

---

## 1. Authentication

### 1.1 Campus One Login (OIDC)

**Steps**
1. Navigate to `/login`.
2. Click **Login with Campus One**.
3. Complete Campus One SSO on the external page.
4. Observe redirect back to the app.

**Expected**
- Redirected to the correct home screen for the role (`/student`, `/counselor`, or `/admin`).
- User's full name appears in the sidebar.
- JWT stored in `localStorage` as `safespace_access_token`.

---

### 1.2 Password Login (Fallback)

**Steps**
1. Navigate to `/login`.
2. Enter email + password for a locally registered account.
3. Click **Sign in**.

**Expected**
- Redirected to role-appropriate dashboard.
- Error shown for wrong password.
- Error shown for unknown email.

---

### 1.3 Token Refresh

**Steps**
1. Log in successfully.
2. Wait for the access token to expire (or manually clear/expire the `safespace_access_token` in DevTools localStorage, keeping the `refresh_token` cookie).
3. Make any API call (e.g., navigate to a page).

**Expected**
- The app silently refreshes the token and retries the request.
- User is **not** redirected to login.

---

### 1.4 Session Expiry

**Steps**
1. Log in successfully.
2. Clear both the `safespace_access_token` from localStorage and the `refresh_token` cookie.
3. Navigate to a protected page.

**Expected**
- User is redirected to `/login`.
- A "session expired" message or similar is displayed.

---

### 1.5 Logout

**Steps**
1. Log in as any user.
2. Click the **logout** button in the sidebar or header.

**Expected**
- Token removed from localStorage.
- Redirected to `/login`.
- Navigating back to a protected route redirects to `/login`.

---

### 1.6 Password Reset

**Steps**
1. Navigate to `/login` and click **Forgot password**.
2. Enter the email address of a registered user.
3. Submit the form.
4. Open the reset email and follow the link.
5. Enter and confirm a new password.

**Expected**
- Success message after step 3.
- Reset link opens a form.
- After step 5, the user can log in with the new password.
- Old password no longer works.

---

## 2. Student — Wellness Check-ins

### 2.1 Submit a PHQ-9

**Pre-condition**: Logged in as Student A. The student has not submitted a PHQ-9 in the last 4 weeks (or this is a fresh test account).

**Steps**
1. Navigate to `/student` or `/student/checkin`.
2. Open the **PHQ-9** check-in card (should show as pending).
3. Answer all 9 questions (score 0–3 each).
4. Submit.

**Expected**
- Submission accepted (no error).
- WRS score and risk tier displayed.
- PHQ-9 card is no longer in the "pending" list.
- Check-in appears in history.

**Edge cases**
- Submit the PHQ-9 again within 4 weeks → expect a "not yet due" state (card not shown as pending).
- Submit all 3s (max score 27) → risk tier should be **Critical**; crisis escalation banner or hotline info should appear.

---

### 2.2 Submit a GAD-7

Same as 2.1, but for the **GAD-7** (7 questions, 0–3 each, max score 21, 4-week cooldown).

**Edge cases**
- All 3s (score 21) → Critical tier, crisis notification sent to assigned psychologist.

---

### 2.3 Submit a Daily Pulse

**Pre-condition**: Logged in as Student A.

**Steps**
1. Navigate to `/student/checkin`.
2. Open the **Pulse** check-in (daily).
3. Select a mood value.
4. Submit.

**Expected**
- Accepted with no error.
- Pulse card resets until next day.

---

### 2.4 View Check-in History

**Steps**
1. Logged in as Student A.
2. Navigate to `/student/history`.
3. Observe listed past check-ins.

**Expected**
- List shows PHQ-9, GAD-7, and pulse entries with timestamps and scores.

---

### 2.5 Crisis Escalation on High Risk Score

**Pre-condition**: Student A has an assigned psychologist (Psychologist P).

**Steps**
1. Submit a PHQ-9 with all answers = 3 (score 27, max).

**Expected**
- WRS score ≥ 85, tier = **Critical**.
- A crisis information banner/modal is displayed to the student.
- Psychologist P receives a **Crisis Alert** notification.
- Student A receives a **"Help is on the way"** notification.
- A `CrisisLog` record is created (visible to the psychologist).

---

## 3. Student — Appointments

### 3.1 Browse Available Psychologists

**Pre-condition**: Logged in as Student A. At least one psychologist has availability set up.

**Steps**
1. Navigate to `/student/appointments`.
2. Open the **Book a Session** tab.
3. Select a date.
4. Select a psychologist from the dropdown.

**Expected**
- Available time slots are shown for the chosen date and psychologist.
- Psychologists showing "Available now" have a green indicator.
- Psychologists showing "Away" have a muted indicator.

---

### 3.2 Book a Standard Appointment

**Pre-condition**: Available time slots exist for a psychologist on the selected date.

**Steps**
1. Navigate to `/student/appointments` → Book a Session.
2. Select a psychologist, pick a date, and choose a time slot.
3. Optionally enter a note.
4. Click **Request**.

**Expected**
- Appointment created with status `pending`.
- Confirmation message shown.
- Appointment appears in the **Upcoming** tab with status "Awaiting approval".

---

### 3.3 View Upcoming Appointments

**Steps**
1. Navigate to `/student/appointments`.
2. View the **Upcoming** tab.

**Expected**
- Shows appointments with status `pending` or `confirmed` where `start_time` is in the future.
- Does **not** show `completed`, `rejected`, or `cancelled` appointments.

---

### 3.4 Crisis (Emergency) Booking

**Pre-condition**: Student A's current WRS tier is Red or Critical.

**Steps**
1. Navigate to appointments.
2. If a crisis booking option is presented (auto-triggered or via emergency button), proceed through it.

**Expected**
- Appointment created with `is_crisis = true` and status `confirmed` (auto-confirmed, no approval needed).
- Crisis alert notification sent to the assigned psychologist.

---

## 4. Psychologist — Managing Availability

### 4.1 Set a Weekly Recurring Schedule

**Pre-condition**: Logged in as Psychologist P.

**Steps**
1. Navigate to `/counselor/availability`.
2. Select the **Weekly Schedule** tab.
3. Enable Monday–Friday with times `09:00–17:00`.
4. Click **Save Schedule**.

**Expected**
- Success toast shown.
- Schedule saved and visible in the weekly schedule view.
- Date-specific availability blocks generated for the next 26 weeks in the database.
- Students can now see slots for this psychologist when booking.

**Edge case**
- Update the schedule (e.g., change Friday to end at 13:00). Old Friday blocks should be replaced — students should no longer see 13:00–17:00 slots on future Fridays.

---

### 4.2 Add a One-Time Availability Block

**Steps**
1. Navigate to `/counselor/availability`.
2. Select a specific date and add a block (e.g., Saturday 10:00–12:00).
3. Save.

**Expected**
- Block appears in the calendar.
- Students can book that slot.

---

### 4.3 Add a Busy Block (Time Off)

**Steps**
1. Navigate to `/counselor/availability`.
2. Add a busy block covering, e.g., tomorrow 09:00–12:00 with reason "Training".
3. Save.

**Expected**
- Block saved.
- Psychologist shows as unavailable for that window.
- Students cannot see those slots.

---

### 4.4 Delete a Busy Block

**Steps**
1. View existing busy blocks.
2. Delete the block created in 4.3.

**Expected**
- Block removed.
- Availability restored for that window.

---

## 5. Psychologist — Managing Appointments

### 5.1 Approve a Pending Appointment

**Pre-condition**: Student A has submitted an appointment request (workflow 3.2).

**Steps**
1. Logged in as Psychologist P.
2. Navigate to `/counselor/pending-appointments`.
3. Find the pending request from Student A.
4. Click **Approve**.

**Expected**
- Appointment status changes to `confirmed`.
- Appointment disappears from the pending list.
- Student A receives an "Appointment Confirmed" notification.
- If this is the student's first appointment with this psychologist, student also receives a "Counselor Assigned" notification.

---

### 5.2 Reject a Pending Appointment

**Pre-condition**: A pending appointment exists.

**Steps**
1. Navigate to `/counselor/pending-appointments`.
2. Click **Reject** on a request.

**Expected**
- Appointment status changes to `rejected`.
- Removed from pending list.
- Student receives a rejection notification.

---

### 5.3 View Pending Appointments Count

**Steps**
1. Navigate to `/counselor/pending-appointments`.

**Expected**
- The count badge in the header shows the correct number of pending requests.
- Empty state shown if there are none.

---

## 6. Psychologist — Student Profiles

### 6.1 View Assigned Students

**Steps**
1. Logged in as Psychologist P.
2. Navigate to `/counselor/students`.

**Expected**
- List of students assigned to Psychologist P.
- Shows WRS tier badge (Green / Amber / Red / Critical) for each student.

---

### 6.2 Open a Student Profile

**Steps**
1. From the student list, click on Student A.

**Expected**
- Profile page opens with:
  - Personal details (name, student ID, faculty, year)
  - Current WRS score and tier
  - Risk score trend chart (last 30 days)
  - Appointment history
  - Check-in history (PHQ-9, GAD-7, pulse)

---

### 6.3 Session Analysis Tabs

**Pre-condition**: Student A has submitted at least one PHQ-9 and one GAD-7.

**Steps**
1. Open Student A's profile.
2. Scroll to the **Session Analysis** section.
3. Click **Overview**, then **PHQ-9**, then **GAD-7** tabs.

**Expected**
- Overview: session count, completion rate, average WRS.
- PHQ-9 tab: bar chart with per-question averages, "Highest concern" callout.
- GAD-7 tab: same structure for GAD-7 questions.
- Bar charts display in original question order (not sorted).

---

### 6.4 Override Risk Tier

**Pre-condition**: Student A has a current risk score.

**Steps**
1. Open Student A's profile.
2. Click **Override Risk**.
3. Select a tier (e.g., Amber) and enter a justification.
4. Submit.

**Expected**
- Override saved.
- Student's displayed tier updates to the overridden value.
- Override record stored (visible in risk history).

---

## 7. Notifications

### 7.1 View Notification Inbox

**Steps**
1. Log in as any user.
2. Navigate to or open the notifications panel.

**Expected**
- List of notifications with title, body, and timestamp.
- Paginated if more than 20 items.

---

### 7.2 Notification Triggers (end-to-end)

Trigger each of the following and verify the corresponding notification appears:

| Action | Recipient | Expected Notification |
|--------|-----------|----------------------|
| Appointment approved | Student | "Appointment Confirmed" |
| Appointment rejected | Student | Rejection message with psychologist name |
| First appointment approved | Student | "Counselor Assigned" |
| PHQ-9/GAD-7 score → Red/Critical | Psychologist | "Crisis Alert" |
| PHQ-9/GAD-7 score → Red/Critical | Student | "Help is on the way" |
| WRS reaches Amber/Red/Critical | Psychologist | WRS alert |

---

## 8. Admin — Staff Management

### 8.1 Create a Psychologist Account

**Pre-condition**: Logged in as Admin A.

**Steps**
1. Navigate to `/admin/users`.
2. Click **Add Staff**.
3. Fill in: name, email, staff_type = `psychologist`, department, password.
4. Save.

**Expected**
- New staff record created.
- Account appears in `/psychologists` list (visible to students for booking).
- New psychologist can log in.

---

### 8.2 Edit a Staff Member

**Steps**
1. Find a staff member in the admin users list.
2. Click **Edit**.
3. Change `specialization` or `max_appointments_per_day`.
4. Save.

**Expected**
- Changes reflected immediately on the staff profile.

---

### 8.3 Send a Password Reset Link

**Steps**
1. Find a staff member.
2. Click **Send Password Reset**.

**Expected**
- Success toast.
- Staff member receives a password reset email.

---

### 8.4 Deactivate / Reactivate a Student

**Steps**
1. Navigate to the student list.
2. Deactivate a student.

**Expected**
- Student can no longer log in.
- Reactivating restores access.

---

## 9. Admin — Forum Moderation

### 9.1 View Forum Posts

**Steps**
1. Logged in as Admin A, navigate to `/admin/forum` (or `/counselor/forum` as Psychologist P).

**Expected**
- All posts listed with anonymised student IDs.
- Search/filter works.

---

### 9.2 Delete a Forum Post

**Steps**
1. Find a post.
2. Click **Delete** and enter a reason.

**Expected**
- Post soft-deleted (hidden from student view).
- Delete reason stored.

---

### 9.3 Student Posts to Forum

**Pre-condition**: Logged in as Student A.

**Steps**
1. Navigate to `/student/forum`.
2. Write a post and submit.

**Expected**
- Post appears in the forum.
- Student's identity is anonymised (encrypted_student_id shown, not name).

---

## 10. Consent Management

### 10.1 Set Consent

**Pre-condition**: Logged in as Student A.

**Steps**
1. Navigate to `/student/consent`.
2. Toggle **monitoring_enabled** on.
3. Save.

**Expected**
- Consent record upserted.
- Psychologist can see consent status on student profile.

---

### 10.2 Withdraw Consent

**Steps**
1. Same page, toggle monitoring off.
2. Save.

**Expected**
- Consent record updated to `monitoring_enabled = false`.

---

## 11. Analytics

### 11.1 Counselor Dashboard Analytics

**Pre-condition**: Logged in as Psychologist P with at least a few appointments and check-ins in the system.

**Steps**
1. Navigate to `/counselor`.

**Expected**
- Appointment trend chart renders.
- Risk distribution (Green / Amber / Red / Critical) chart renders.
- WRS trend visible.
- No blank or error states if data exists.

---

### 11.2 Admin Dashboard Analytics

**Steps**
1. Logged in as Admin A, navigate to `/admin`.

**Expected**
- University-wide metrics shown.
- Department breakdown visible.
- Summary report accessible.

---

## 12. Feedback

### 12.1 Submit Feedback (Any User)

**Steps**
1. Navigate to the feedback page (check sidebar/footer for link).
2. Fill in name, email, message, and rating.
3. Submit.

**Expected**
- Success confirmation shown.
- Feedback appears in admin feedback list (`/admin/feedback`).

---

## 13. Session AI (Recording & Analysis)

### 13.1 Upload and Transcribe a Session

**Pre-condition**: An appointment exists with status `confirmed`.

**Steps**
1. Navigate to the Session Reviewer page.
2. Create a session linked to the appointment.
3. Upload an audio file (`.mp3`, `.wav`, or `.mp4`).
4. Click **Transcribe**.
5. Click **Summarise**.

**Expected**
- Transcript text returned and displayed.
- Summary generated from transcript.

---

### 13.2 Full Session Analysis (End-to-End)

**Steps**
1. On the Session Reviewer page, use the **Analyze** workflow.
2. Provide appointment_id, client_name, and an audio file.
3. Submit.

**Expected**
- Transcript + summary returned.
- WRS score calculated from dynamic factors (PHQ-9 history, attendance, crisis history).
- Risk score saved to student's history.

---

## 14. Edge Cases & Error Handling

### 14.1 Double Booking Prevention

**Steps**
1. Student A books slot X with Psychologist P.
2. Student B attempts to book the same slot X with Psychologist P.

**Expected**
- Student B's request is rejected with an overlap error.

---

### 14.2 Booking When No Availability Exists

**Steps**
1. Select a psychologist with no availability set up.
2. Select any date.

**Expected**
- No time slots shown.
- Appropriate "no availability" message displayed.

---

### 14.3 422 Validation Error Display

**Steps**
1. From any form that sends data to the API, submit invalid data that triggers a server-side validation error (e.g., a missing required field bypassed through DevTools or API client).

**Expected**
- Error message is displayed as a readable string (not `[object Object]`).
- Toast or inline error shows the specific field error from the server.

---

### 14.4 Approve Non-Existent or Already-Processed Appointment

**Steps**
1. Attempt to approve an appointment that has already been approved or rejected (via direct API call or by double-clicking).

**Expected**
- 422 or 400 error returned.
- Error message shown in the UI.
- No duplicate state changes.

---

### 14.5 Concurrent Token Refresh

**Steps**
1. Log in.
2. Open multiple browser tabs and let the token expire on all.
3. Trigger an API call in all tabs simultaneously.

**Expected**
- Only one refresh occurs.
- All tabs recover without being logged out.

---

## 15. Role Access Control

Verify that users cannot access routes outside their role:

| Route | Allowed | Should Fail (403/401) |
|-------|---------|----------------------|
| `/counselor/*` | Psychologist, Admin | Student |
| `/admin/*` | Admin | Student, Psychologist |
| `GET /students` | Admin, Psychologist, Staff | Student |
| `POST /risk-scores/override/{id}` | Psychologist, Admin | Student |
| `DELETE /forum/posts/{id}` | Staff, Admin | Student |
| `PATCH /appointments/{id}/approve` | Psychologist, Admin | Student |

**Test**: Log in as a Student and attempt to call each restricted endpoint directly (via DevTools Network tab or an API client like Postman). Confirm a 401 or 403 is returned.

---

## Test Data Reset Checklist

After a full test run, clean up:

- [ ] Cancel/delete test appointments
- [ ] Remove test forum posts
- [ ] Reset student consent flags
- [ ] Delete test staff accounts created during testing
- [ ] Clear any crisis flags set on test students

---

*Last updated: 2026-06-09*
