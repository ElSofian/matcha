-- Profile fields needed for age-based discovery and consent-aware location.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS location_source VARCHAR(20) NOT NULL DEFAULT 'unset'
    CHECK (location_source IN ('unset', 'precise', 'approximate'));

UPDATE users
SET sexual_preference = 'bisexual'
WHERE sexual_preference IS NULL;

ALTER TABLE users
  ALTER COLUMN sexual_preference SET DEFAULT 'bisexual',
  ALTER COLUMN sexual_preference SET NOT NULL,
  ADD CONSTRAINT users_fame_rating_nonnegative CHECK (fame_rating >= 0);
