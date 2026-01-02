-- Update sector from 'Leads' to 'SDR' in the 'user' table
UPDATE "user"
SET sector = 'SDR'
WHERE sector = 'Leads';
