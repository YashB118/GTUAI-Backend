-- Run in Supabase SQL Editor
-- Adds program column to distinguish BE vs Diploma subjects

ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS program VARCHAR(10) NOT NULL DEFAULT 'BE';

-- Back-fill existing rows
UPDATE subjects SET program = 'BE' WHERE program IS NULL OR program = '';

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_subjects_program ON subjects(program);
CREATE INDEX IF NOT EXISTS idx_subjects_branch_program ON subjects(branch, program);
CREATE INDEX IF NOT EXISTS idx_subjects_sem_branch_program ON subjects(semester, branch, program);
