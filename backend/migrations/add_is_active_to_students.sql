-- Migration: Add is_active column to students table
-- Reason: Student deactivation feature added in recent update
-- Date: 2026-06-07

ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Verify the column was added
SELECT column_name FROM information_schema.columns WHERE table_name='students' AND column_name='is_active';
