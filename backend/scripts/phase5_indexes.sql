-- Phase 5 performance indexes — run once in Supabase SQL Editor

CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_paper ON questions(paper_id);
CREATE INDEX IF NOT EXISTS idx_patterns_subject_score ON question_patterns(subject_id, prediction_score DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_last_asked ON question_patterns(last_asked_year DESC);
CREATE INDEX IF NOT EXISTS idx_materials_subject_status ON study_materials(subject_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_materials_status ON study_materials(approval_status);
CREATE INDEX IF NOT EXISTS idx_papers_subject_year ON question_papers(subject_id, year DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_subject ON predictions(subject_id, valid_until);
CREATE INDEX IF NOT EXISTS idx_chunks_material ON material_chunks(material_id);
CREATE INDEX IF NOT EXISTS idx_chunks_subject ON material_chunks(subject_id);

-- Phase 5 RLS policies — run AFTER the indexes above

-- Users: own data only; admins read all
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "admin_read_users" ON users
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Study materials: approved visible to all; uploader sees own
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved_materials_public" ON study_materials
  FOR SELECT USING (approval_status = 'approved');

CREATE POLICY "own_materials" ON study_materials
  FOR ALL USING (uploaded_by = auth.uid());

-- Question papers: anyone reads, uploader modifies
ALTER TABLE question_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "papers_read_all" ON question_papers
  FOR SELECT USING (true);

CREATE POLICY "papers_own_modify" ON question_papers
  FOR ALL USING (uploaded_by = auth.uid());
