-- ============================================================
-- Streak & Coin System Migration
-- Run this in Supabase SQL Editor before deploying backend
-- ============================================================

-- 1. Coin balances
CREATE TABLE IF NOT EXISTS user_coins (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance     INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned INTEGER NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Full audit trail of every coin movement
CREATE TABLE IF NOT EXISTS coin_transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount      INTEGER NOT NULL,
    type        TEXT NOT NULL CHECK (type IN (
                    'login', 'challenge_correct', 'challenge_attempt',
                    'brahmastra', 'admin_grant', 'coupon', 'spend_ai',
                    'spend_freeze', 'streak_bonus'
                )),
    note        TEXT,
    ref_id      UUID,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Daily login streaks
CREATE TABLE IF NOT EXISTS user_streaks (
    user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak       INTEGER NOT NULL DEFAULT 0,
    longest_streak       INTEGER NOT NULL DEFAULT 0,
    last_active_date     DATE,
    streak_freeze_count  INTEGER NOT NULL DEFAULT 0,
    updated_at           TIMESTAMPTZ DEFAULT now()
);

-- 4. Daily challenge pool (admin creates, one per day)
CREATE TABLE IF NOT EXISTS daily_challenges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id      UUID REFERENCES subjects(id) ON DELETE SET NULL,
    question_text   TEXT NOT NULL,
    options         JSONB NOT NULL,
    correct_option  INTEGER NOT NULL CHECK (correct_option BETWEEN 0 AND 3),
    explanation     TEXT,
    coin_reward     INTEGER NOT NULL DEFAULT 15,
    active_date     DATE NOT NULL UNIQUE,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 5. One attempt per user per challenge
CREATE TABLE IF NOT EXISTS challenge_attempts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id    UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
    selected_option INTEGER NOT NULL,
    is_correct      BOOLEAN NOT NULL,
    coins_earned    INTEGER NOT NULL DEFAULT 0,
    attempted_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, challenge_id)
);

-- 6. Admin-generated coupons
CREATE TABLE IF NOT EXISTS coupons (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code         TEXT UNIQUE NOT NULL,
    coin_value   INTEGER NOT NULL CHECK (coin_value > 0),
    max_uses     INTEGER,
    used_count   INTEGER NOT NULL DEFAULT 0,
    expires_at   TIMESTAMPTZ,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    note         TEXT,
    created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- 7. Who redeemed which coupon
CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id    UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coins_awarded INTEGER NOT NULL,
    redeemed_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(coupon_id, user_id)
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_coin_tx_user     ON coin_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_tx_type     ON coin_transactions(type);
CREATE INDEX IF NOT EXISTS idx_challenge_date   ON daily_challenges(active_date);
CREATE INDEX IF NOT EXISTS idx_attempt_user     ON challenge_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_code      ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_redemption_user  ON coupon_redemptions(user_id);

-- ── RLS Policies ─────────────────────────────────────────────
ALTER TABLE user_coins           ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges     ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_attempts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions   ENABLE ROW LEVEL SECURITY;

-- Service role (backend) bypasses RLS — all writes go through service key
-- Authenticated users can read their own rows only
CREATE POLICY "users_read_own_coins"         ON user_coins           FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_read_own_transactions"  ON coin_transactions    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_read_own_streak"        ON user_streaks         FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_read_challenges"        ON daily_challenges     FOR SELECT USING (true);
CREATE POLICY "users_read_own_attempts"      ON challenge_attempts   FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_read_active_coupons"    ON coupons              FOR SELECT USING (is_active = true);
CREATE POLICY "users_read_own_redemptions"   ON coupon_redemptions   FOR SELECT USING (auth.uid() = user_id);

-- ── Seed today's challenge (optional example) ─────────────────
-- INSERT INTO daily_challenges (question_text, options, correct_option, explanation, active_date)
-- VALUES (
--   'Which data structure uses LIFO order?',
--   '["Queue","Stack","Heap","Linked List"]',
--   1,
--   'Stack uses Last-In First-Out (LIFO). Queue uses FIFO.',
--   CURRENT_DATE
-- );
