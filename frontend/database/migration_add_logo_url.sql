-- Migration: Add logo_url column to users table
-- This allows users to upload and store their business logo

-- Add logo_url column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comment to column
COMMENT ON COLUMN public.users.logo_url IS 'URL to the user''s business logo stored in Supabase Storage';

-- Create index for faster queries (optional, but recommended)
CREATE INDEX IF NOT EXISTS idx_users_logo_url ON public.users(logo_url) WHERE logo_url IS NOT NULL;

