-- Brahmastra (Oracle) — run in Supabase SQL Editor before deploying

CREATE TABLE IF NOT EXISTS oracle_briefs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id   UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  share_id     TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 12),
  brief        JSONB NOT NULL,
  paper_count  INT NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours'
);

CREATE TABLE IF NOT EXISTS oracle_feedback (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oracle_brief_id  UUID NOT NULL REFERENCES oracle_briefs(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES auth.users(id),
  question_text    TEXT NOT NULL,
  appeared         BOOLEAN NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(oracle_brief_id, user_id, question_text)
);

CREATE INDEX IF NOT EXISTS idx_oracle_briefs_subject    ON oracle_briefs(subject_id);
CREATE INDEX IF NOT EXISTS idx_oracle_briefs_valid      ON oracle_briefs(valid_until);
CREATE INDEX IF NOT EXISTS idx_oracle_briefs_share      ON oracle_briefs(share_id);
CREATE INDEX IF NOT EXISTS idx_oracle_feedback_brief    ON oracle_feedback(oracle_brief_id);

ALTER TABLE oracle_briefs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can read a brief (share links are public)
CREATE POLICY "oracle briefs public read"
  ON oracle_briefs FOR SELECT USING (true);

-- Only service role can write briefs (backend uses service key)
CREATE POLICY "oracle briefs service insert"
  ON oracle_briefs FOR INSERT WITH CHECK (true);

-- Students submit their own feedback
CREATE POLICY "oracle feedback student insert"
  ON oracle_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "oracle feedback student read"
  ON oracle_feedback FOR SELECT USING (auth.uid() = user_id);
