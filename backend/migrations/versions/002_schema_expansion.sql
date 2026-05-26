-- ============================================================
-- Migration 002: Schema Expansion
-- Run once against Supabase. All statements are idempotent.
-- ============================================================

-- ── 1. students — add demographic + academic fields ─────────
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS faculty         VARCHAR(100),
    ADD COLUMN IF NOT EXISTS department      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS program         VARCHAR(100),
    ADD COLUMN IF NOT EXISTS phone_number    VARCHAR(30),
    ADD COLUMN IF NOT EXISTS gender          VARCHAR(20),
    ADD COLUMN IF NOT EXISTS year_of_study   INTEGER;

-- ── 2. appointments — proper approval flag + session details ─
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'sessiontype'
    ) THEN
        CREATE TYPE sessiontype AS ENUM ('in_person', 'virtual');
    END IF;
END $$;

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS pending_approval BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS session_type     VARCHAR(20) NOT NULL DEFAULT 'in_person',
    ADD COLUMN IF NOT EXISTS location         VARCHAR(255);

-- Backfill: student_portal bookings were the "pending" ones
UPDATE appointments
    SET pending_approval = TRUE
    WHERE booking_source = 'student_portal'
      AND status = 'booked'
      AND pending_approval = FALSE;

-- ── 3. staff — profile completeness + work hours ─────────────
ALTER TABLE staff
    ADD COLUMN IF NOT EXISTS office_location  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS bio              TEXT,
    ADD COLUMN IF NOT EXISTS work_start_time  TIME,
    ADD COLUMN IF NOT EXISTS work_end_time    TIME;

-- Default work hours for existing staff
UPDATE staff
    SET work_start_time = '09:00:00',
        work_end_time   = '17:00:00'
    WHERE work_start_time IS NULL;

-- ── 4. notifications — read state + title ────────────────────
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS read  BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 5. psychologist_availability — recurring weekly schedule ─
CREATE TABLE IF NOT EXISTS psychologist_availability (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psychologist_id  UUID NOT NULL REFERENCES staff(user_id) ON DELETE CASCADE,
    day_of_week      INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time       TIME NOT NULL,
    end_time         TIME NOT NULL,
    is_available     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. psychologist_busy_blocks — one-off busy periods ───────
CREATE TABLE IF NOT EXISTS psychologist_busy_blocks (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psychologist_id  UUID NOT NULL REFERENCES staff(user_id) ON DELETE CASCADE,
    block_start      TIMESTAMPTZ NOT NULL,
    block_end        TIMESTAMPTZ NOT NULL,
    reason           VARCHAR(255),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. Indexes for query performance ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_faculty
    ON students (faculty);

CREATE INDEX IF NOT EXISTS idx_students_class_level
    ON students (class_level);

CREATE INDEX IF NOT EXISTS idx_risk_scores_student_computed
    ON risk_scores (student_id, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkins_student_submitted
    ON wellness_checkins (student_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_student_id
    ON appointments (student_id);

CREATE INDEX IF NOT EXISTS idx_appointments_psychologist_time
    ON appointments (psychologist_id, start_time);

CREATE INDEX IF NOT EXISTS idx_appointments_status
    ON appointments (status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
    ON notifications (user_id, read);

CREATE INDEX IF NOT EXISTS idx_availability_psychologist
    ON psychologist_availability (psychologist_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_busy_blocks_psychologist_time
    ON psychologist_busy_blocks (psychologist_id, block_start, block_end);

-- ── 8. Seed default availability for existing psychologists ──
INSERT INTO psychologist_availability (psychologist_id, day_of_week, start_time, end_time)
SELECT user_id, d.day, '09:00:00', '17:00:00'
FROM staff
CROSS JOIN (VALUES (0),(1),(2),(3),(4)) AS d(day)  -- Mon–Fri
WHERE staff_type = 'psychologist'
  AND NOT EXISTS (
    SELECT 1 FROM psychologist_availability pa
    WHERE pa.psychologist_id = staff.user_id
  );
