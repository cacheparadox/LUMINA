-- Run this in your Supabase SQL Editor

-- 1. Create the table
DROP TABLE IF EXISTS lumina_devices CASCADE;

CREATE TABLE lumina_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ntfy_topic TEXT UNIQUE NOT NULL,
    last_entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    push_frequency INT DEFAULT 24,
    push_start_time TIME DEFAULT '09:00:00',
    push_end_time TIME DEFAULT '21:00:00',
    timezone TEXT DEFAULT 'UTC',
    last_notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Allow anonymous access from the frontend (since users don't "log in" to Supabase in Lumina)
ALTER TABLE lumina_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to lumina_devices" ON lumina_devices
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to lumina_devices" ON lumina_devices
    FOR UPDATE USING (true);

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
  local_time TIME;
  local_date DATE;
BEGIN
  FOR device IN
    SELECT * FROM lumina_devices
  LOOP
    -- Calculate the user's current local date and time
    -- 'CURRENT_TIMESTAMP AT TIME ZONE device.timezone' converts UTC NOW to their local time
    BEGIN
      local_time := (CURRENT_TIMESTAMP AT TIME ZONE device.timezone)::TIME;
      local_date := (CURRENT_TIMESTAMP AT TIME ZONE device.timezone)::DATE;
    EXCEPTION WHEN OTHERS THEN
      -- Fallback to UTC if timezone is invalid
      local_time := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::TIME;
      local_date := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::DATE;
    END;

    -- A. Check if they haven't logged an entry for THEIR today
    IF device.last_entry_date < local_date THEN
      
      -- B. Check if current local time is within their active hours
      IF (device.push_start_time <= device.push_end_time AND local_time >= device.push_start_time AND local_time <= device.push_end_time)
         OR (device.push_start_time > device.push_end_time AND (local_time >= device.push_start_time OR local_time <= device.push_end_time)) THEN
         
         -- C. Check if enough time has passed since last notification
         IF device.last_notified_at IS NULL OR (CURRENT_TIMESTAMP >= device.last_notified_at + (device.push_frequency || ' hours')::interval) THEN
           
           -- Send HTTP POST to ntfy.sh
           PERFORM net.http_post(
             url := 'https://ntfy.sh/' || device.ntfy_topic,
             body := 'Time to log your daily memory! 🌸',
             headers := '{"Click": "https://luminajournal.vercel.app/", "Title": "Lumina Reminder", "Tags": "sparkles"}'::jsonb
           );
           
           -- Update last_notified_at
           UPDATE lumina_devices SET last_notified_at = CURRENT_TIMESTAMP WHERE id = device.id;
           
         END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Schedule the cron job (Runs EVERY HOUR at the top of the hour)
SELECT cron.unschedule('daily-lumina-ntfy-reminders'); -- Remove old schedule if exists
SELECT cron.schedule(
  'hourly-lumina-ntfy-reminders',
  '0 * * * *',
  $$ SELECT send_daily_ntfy_reminders(); $$
);
