-- Add end_time column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS end_time time with time zone;
