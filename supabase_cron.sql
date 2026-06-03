-- Run this in your Supabase SQL Editor

-- 1. Create the table
CREATE TABLE IF NOT EXISTS lumina_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ntfy_topic TEXT UNIQUE NOT NULL,
    last_entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Allow anonymous access from the frontend (since users don't "log in" to Supabase in Lumina)
ALTER TABLE lumina_devices ENABLE ROW LEVEL SECURITY;

-- Allow insert/upsert for anyone
CREATE POLICY "Allow public insert to lumina_devices" ON lumina_devices
    FOR INSERT WITH CHECK (true);

-- Allow updates for anyone
CREATE POLICY "Allow public update to lumina_devices" ON lumina_devices
    FOR UPDATE USING (true);

-- Allow read for anyone
CREATE POLICY "Allow public read to lumina_devices" ON lumina_devices
    FOR SELECT USING (true);

-- 3. Enable Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 4. Create the function
CREATE OR REPLACE FUNCTION send_daily_ntfy_reminders()
RETURNS void AS $$
DECLARE
  device RECORD;
BEGIN
  -- Find devices that haven't logged an entry today
  FOR device IN
    SELECT ntfy_topic 
    FROM lumina_devices
    WHERE last_entry_date < CURRENT_DATE
  LOOP
    -- Send HTTP POST to ntfy.sh
    PERFORM net.http_post(
      url := 'https://ntfy.sh/' || device.ntfy_topic,
      body := 'Time to log your daily memory! 🌸',
      headers := '{"Click": "https://luminajournal.vercel.app/", "Title": "Lumina Reminder", "Tags": "sparkles"}'::jsonb
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Schedule the cron job (Runs every day at 6:00 PM UTC)
-- Change '0 18 * * *' to your preferred UTC time
SELECT cron.schedule(
  'daily-lumina-ntfy-reminders',
  '0 18 * * *',
  $$ SELECT send_daily_ntfy_reminders(); $$
);
