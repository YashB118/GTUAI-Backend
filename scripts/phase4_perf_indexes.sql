-- Performance indexes for shared-KB hot paths
-- Run once in Supabase SQL editor. All CREATE INDEX IF NOT EXISTS — safe to re-run.

-- ── Subject-scoped reads (every list endpoint filters by subject_id) ──────
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_paper ON questions(paper_id);
CREATE INDEX IF NOT EXISTS idx_question_patterns_subject ON question_patterns(subject_id);
CREATE INDEX IF NOT EXISTS idx_question_patterns_score ON question_patterns(subject_id, prediction_score DESC);
CREATE INDEX IF NOT EXISTS idx_material_chunks_subject ON material_chunks(subject_id);
CREATE INDEX IF NOT EXISTS idx_material_chunks_material ON material_chunks(material_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_subject ON study_materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_status ON study_materials(approval_status);
CREATE INDEX IF NOT EXISTS idx_study_materials_uploader ON study_materials(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_question_papers_subject ON question_papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_question_papers_uploader ON question_papers(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_question_papers_status ON question_papers(processing_status);

-- ── Cache lookup (shared-KB hot read on every predict page hit) ──────────
CREATE INDEX IF NOT EXISTS idx_predictions_subject_valid
  ON predictions(subject_id, valid_until DESC);

-- ── Answer cache (one row per pattern, but list/order matters) ───────────
CREATE INDEX IF NOT EXISTS idx_answers_pattern ON answers(pattern_id, generated_at DESC);

-- ── User search (admin uses ILIKE on three columns) ──────────────────────
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch);
-- trigram for fast ILIKE; needs pg_trgm extension (Supabase has it)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON users USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_enrol_trgm ON users USING gin (enrollment_no gin_trgm_ops);

-- ── Analytics buckets (group by date over last N days) ───────────────────
CREATE INDEX IF NOT EXISTS idx_question_papers_created ON question_papers(created_at);
CREATE INDEX IF NOT EXISTS idx_study_materials_created ON study_materials(created_at);
