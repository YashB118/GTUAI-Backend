-- Community Feature Migration
-- Run this in Supabase SQL editor before using the Community feature.

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_rooms (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name               VARCHAR(100) NOT NULL,
    subject            VARCHAR(100) NOT NULL,
    description        TEXT,
    is_public          BOOLEAN      NOT NULL DEFAULT true,
    room_code          VARCHAR(20)  NOT NULL UNIQUE,
    max_participants   INTEGER      NOT NULL DEFAULT 50,
    expires_at         TIMESTAMPTZ,
    created_by         UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_activity_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    status             VARCHAR(20)  NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'expired', 'deleted')),
    message_retention  VARCHAR(20)  NOT NULL DEFAULT 'ephemeral'
                           CHECK (message_retention IN ('ephemeral', 'timed', 'permanent')),
    retention_hours    INTEGER      DEFAULT 24,
    participant_count  INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS community_participants (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id      UUID        NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pseudonym    VARCHAR(60) NOT NULL,
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (room_id, user_id)
);

-- Stores only encrypted ciphertext — server never holds plaintext.
CREATE TABLE IF NOT EXISTS community_messages (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id          UUID        NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE,
    sender_pseudonym VARCHAR(60) NOT NULL,
    ciphertext       TEXT        NOT NULL,
    iv               VARCHAR(128) NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_reports (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id          UUID         NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE,
    reporter_user_id UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason           VARCHAR(500) NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (room_id, reporter_user_id)
);

CREATE TABLE IF NOT EXISTS community_match_queue (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    subject       VARCHAR(100) NOT NULL,
    session_token VARCHAR(100) NOT NULL,
    queued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cr_subject        ON community_rooms(subject);
CREATE INDEX IF NOT EXISTS idx_cr_status         ON community_rooms(status);
CREATE INDEX IF NOT EXISTS idx_cr_public         ON community_rooms(is_public);
CREATE INDEX IF NOT EXISTS idx_cr_last_activity  ON community_rooms(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_cr_code           ON community_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_cp_room           ON community_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_cp_user           ON community_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_cm_room           ON community_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_cm_room_created   ON community_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cmq_subject       ON community_match_queue(subject, queued_at);

-- ─── Auto-expire trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION community_expire_rooms()
RETURNS void
LANGUAGE sql
AS $$
    UPDATE community_rooms
    SET    status = 'expired'
    WHERE  expires_at < NOW()
    AND    status    = 'active';
$$;
