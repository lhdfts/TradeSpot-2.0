-- Migration: Add denied_events column to user table
-- This column will store an array of event IDs that the attendant is NOT allowed to receive.

ALTER TABLE public.user 
ADD COLUMN IF NOT EXISTS denied_events jsonb DEFAULT '[]'::jsonb;

-- Update the column description for clarity
COMMENT ON COLUMN public.user.denied_events IS 'Array of event IDs (UUIDs) that this user is blocked from receiving appointments for.';
