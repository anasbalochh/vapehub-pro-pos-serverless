-- Migration: Add business_name column to users table
-- Run this in Supabase SQL Editor

-- Add business_name column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);

-- Set default value for existing users (use username or 'My Business')
UPDATE users
SET business_name = COALESCE(username, 'My Business')
WHERE business_name IS NULL;

-- Set default value for future inserts
ALTER TABLE users
ALTER COLUMN business_name SET DEFAULT 'My Business';

-- Add comment to column
COMMENT ON COLUMN users.business_name IS 'Business or website name for branding throughout the application';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'business_name';

