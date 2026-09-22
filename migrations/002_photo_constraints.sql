-- Enforce a single primary photo per user and speed up profile photo retrieval.
CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_one_profile_per_user
  ON photos (user_id)
  WHERE is_profile = TRUE;

CREATE INDEX IF NOT EXISTS idx_photos_user_created
  ON photos (user_id, created_at);
