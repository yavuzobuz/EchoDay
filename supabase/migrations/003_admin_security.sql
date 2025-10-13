-- Admin Security Tables and Policies
-- Run this in Supabase SQL Editor

-- 1. Admin Activity Logs Table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_user_id ON admin_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action ON admin_activity_logs(action);

-- RLS for admin_activity_logs
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view activity logs
CREATE POLICY "Admins can view all activity logs"
  ON admin_activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- System can insert activity logs
CREATE POLICY "System can insert activity logs"
  ON admin_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 2. Admin Sessions Table (for tracking active sessions)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- RLS for admin_sessions
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
  ON admin_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
  ON admin_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON admin_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
  ON admin_sessions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Function to clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_admin_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add role column to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role VARCHAR(20) DEFAULT 'user';
    CREATE INDEX idx_profiles_role ON profiles(role);
  END IF;
END $$;

-- 5. Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL, -- user_id or IP
  action VARCHAR(100) NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(identifier, action)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action ON rate_limits(identifier, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- RLS for rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- System can manage rate limits
CREATE POLICY "System can manage rate limits"
  ON rate_limits FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier VARCHAR(255),
  p_action VARCHAR(100),
  p_max_attempts INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Clean old entries
  DELETE FROM rate_limits
  WHERE identifier = p_identifier
    AND action = p_action
    AND window_start < v_window_start;
  
  -- Get current count
  SELECT attempt_count INTO v_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND action = p_action
    AND window_start >= v_window_start;
  
  IF v_count IS NULL THEN
    -- First attempt in this window
    INSERT INTO rate_limits (identifier, action, attempt_count, window_start)
    VALUES (p_identifier, p_action, 1, NOW());
    RETURN true;
  ELSIF v_count < p_max_attempts THEN
    -- Increment attempt count
    UPDATE rate_limits
    SET attempt_count = attempt_count + 1
    WHERE identifier = p_identifier AND action = p_action;
    RETURN true;
  ELSE
    -- Rate limit exceeded
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Schedule to clean expired sessions (run every hour)
-- Note: This requires pg_cron extension (available in Supabase)
-- SELECT cron.schedule(
--   'clean-expired-sessions',
--   '0 * * * *', -- Every hour
--   'SELECT clean_expired_admin_sessions();'
-- );

COMMENT ON TABLE admin_activity_logs IS 'Tracks all admin actions for auditing';
COMMENT ON TABLE admin_sessions IS 'Tracks active admin sessions';
COMMENT ON TABLE rate_limits IS 'Rate limiting for API endpoints';
COMMENT ON FUNCTION is_admin IS 'Check if a user has admin role';
COMMENT ON FUNCTION check_rate_limit IS 'Check and enforce rate limits';
