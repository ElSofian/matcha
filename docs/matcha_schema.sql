-- ============================================================
-- MATCHA — Database Schema
-- PostgreSQL
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
CREATE TYPE gender_enum AS ENUM ('male', 'female', 'non_binary', 'other');
CREATE TYPE preference_enum AS ENUM ('male', 'female', 'bisexual');

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(255) UNIQUE NOT NULL,
  username          VARCHAR(50)  UNIQUE NOT NULL,
  serial_number     VARCHAR(16)  UNIQUE NOT NULL,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  password_hash     TEXT NOT NULL,
  birth_date        DATE,
  gender            gender_enum,
  sexual_preference preference_enum DEFAULT 'bisexual',
  bio               TEXT,
  fame_rating       INT NOT NULL DEFAULT 0,
  latitude          FLOAT,
  longitude         FLOAT,
  city              VARCHAR(255),
  location_source   VARCHAR(20) NOT NULL DEFAULT 'unset' CHECK (location_source IN ('unset', 'precise', 'approximate')),
  profile_photo_id  UUID,                          -- FK ajoutée après (circular ref)
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  is_online         BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen         TIMESTAMP,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PHOTOS
-- ============================================================
CREATE TABLE photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  is_profile  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Résolution de la référence circulaire
ALTER TABLE users
  ADD CONSTRAINT fk_profile_photo
  FOREIGN KEY (profile_photo_id) REFERENCES photos(id) ON DELETE SET NULL;

-- Max 5 photos par user
CREATE OR REPLACE FUNCTION check_photo_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM photos WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 photos per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_photo_limit
  BEFORE INSERT ON photos
  FOR EACH ROW EXECUTE FUNCTION check_photo_limit();

-- ============================================================
-- TAGS
-- ============================================================
CREATE TABLE tags (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  VARCHAR(50) UNIQUE NOT NULL        -- ex: 'vegan', 'geek', 'piercing'
);

CREATE TABLE user_tags (
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, tag_id)
);

-- ============================================================
-- LIKES
-- ============================================================
-- Un match = 2 rows croisées dans cette table
-- SELECT * FROM likes WHERE liker_id=A AND liked_id=B
-- + SELECT * FROM likes WHERE liker_id=B AND liked_id=A
CREATE TABLE likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liked_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (liker_id, liked_id),
  CHECK (liker_id <> liked_id)
);

-- ============================================================
-- BLOCKS
-- ============================================================
CREATE TABLE blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason       TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (reporter_id, reported_id),
  CHECK (reporter_id <> reported_id)
);

-- ============================================================
-- PROFILE VIEWS
-- ============================================================
CREATE TABLE profile_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (viewer_id <> viewed_id)
);

-- Index pour "qui a vu mon profil"
CREATE INDEX idx_profile_views_viewed ON profile_views(viewed_id, viewed_at DESC);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (sender_id <> receiver_id)
);

CREATE INDEX idx_messages_conversation ON messages(
  LEAST(sender_id::TEXT, receiver_id::TEXT),
  GREATEST(sender_id::TEXT, receiver_id::TEXT),
  created_at DESC
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TYPE notif_type_enum AS ENUM (
  'like',
  'unlike',
  'view',
  'message',
  'match'
);

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          notif_type_enum NOT NULL,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

CREATE TABLE notification_mutes (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, muted_user_id),
  CHECK (user_id <> muted_user_id)
);

-- ============================================================
-- EMAIL TOKENS (vérification + reset password)
-- ============================================================
CREATE TYPE token_type_enum AS ENUM ('email_verification', 'password_reset');

CREATE TABLE email_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  type        token_type_enum NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REQUÊTES UTILES
-- ============================================================

-- Vérifier si deux users sont matchés
-- SELECT EXISTS (
--   SELECT 1 FROM likes WHERE liker_id = $1 AND liked_id = $2
-- ) AND EXISTS (
--   SELECT 1 FROM likes WHERE liker_id = $2 AND liked_id = $1
-- ) AS is_match;

-- Profils suggérés (proximité + tags communs + fame)
-- SELECT u.*,
--   COUNT(DISTINCT ut2.tag_id) AS common_tags,
--   (
--     6371 * acos(
--       cos(radians($lat)) * cos(radians(u.latitude)) *
--       cos(radians(u.longitude) - radians($lng)) +
--       sin(radians($lat)) * sin(radians(u.latitude))
--     )
--   ) AS distance_km
-- FROM users u
-- LEFT JOIN user_tags ut1 ON ut1.user_id = $current_user_id
-- LEFT JOIN user_tags ut2 ON ut2.tag_id = ut1.tag_id AND ut2.user_id = u.id
-- WHERE u.id <> $current_user_id
--   AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = $current_user_id)
--   AND u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = $current_user_id)
-- GROUP BY u.id
-- ORDER BY distance_km ASC, common_tags DESC, u.fame_rating DESC
-- LIMIT 20 OFFSET $offset;
