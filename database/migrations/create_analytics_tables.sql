-- =============================================
-- TASK ANALYTICS TABLES
-- Created: 2025-10-10
-- Purpose: Store user task patterns and habits for AI analysis
-- =============================================

-- 1. User Task Patterns Table
-- Stores detected patterns in user tasks (recurring, time-based, category-based, etc.)
CREATE TABLE IF NOT EXISTS user_task_patterns (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL CHECK (pattern_type IN ('recurring', 'time_based', 'category_based', 'priority_based')),
    description TEXT NOT NULL,
    frequency INTEGER NOT NULL DEFAULT 0,
    confidence REAL NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for user_task_patterns
CREATE INDEX IF NOT EXISTS idx_user_task_patterns_user_id ON user_task_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_task_patterns_pattern_type ON user_task_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_user_task_patterns_confidence ON user_task_patterns(confidence);
CREATE INDEX IF NOT EXISTS idx_user_task_patterns_updated_at ON user_task_patterns(updated_at);

-- 2. User Habits Table
-- Stores learned user habits (completion times, active hours, category preferences, etc.)
CREATE TABLE IF NOT EXISTS user_habits (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    habit_type TEXT NOT NULL CHECK (habit_type IN ('completion_time', 'active_hours', 'category_preference', 'priority_style')),
    habit_data JSONB NOT NULL DEFAULT '{}',
    strength REAL NOT NULL DEFAULT 0 CHECK (strength >= 0 AND strength <= 1),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for user_habits
CREATE INDEX IF NOT EXISTS idx_user_habits_user_id ON user_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_habits_habit_type ON user_habits(habit_type);
CREATE INDEX IF NOT EXISTS idx_user_habits_strength ON user_habits(strength);
CREATE INDEX IF NOT EXISTS idx_user_habits_last_updated ON user_habits(last_updated);

-- 3. Analytics Metadata Table
-- Stores metadata about analytics runs and system info
CREATE TABLE IF NOT EXISTS analytics_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    run_type TEXT NOT NULL CHECK (run_type IN ('daily_archive', 'manual_analysis', 'scheduled_analysis')),
    run_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tasks_analyzed INTEGER NOT NULL DEFAULT 0,
    patterns_detected INTEGER NOT NULL DEFAULT 0,
    habits_updated INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')) DEFAULT 'success',
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for analytics_metadata
CREATE INDEX IF NOT EXISTS idx_analytics_metadata_user_id ON analytics_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metadata_run_timestamp ON analytics_metadata(run_timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_metadata_status ON analytics_metadata(status);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE user_task_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_metadata ENABLE ROW LEVEL SECURITY;

-- Policies for user_task_patterns
DROP POLICY IF EXISTS "Users can view their own task patterns" ON user_task_patterns;
CREATE POLICY "Users can view their own task patterns"
    ON user_task_patterns FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own task patterns" ON user_task_patterns;
CREATE POLICY "Users can insert their own task patterns"
    ON user_task_patterns FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own task patterns" ON user_task_patterns;
CREATE POLICY "Users can update their own task patterns"
    ON user_task_patterns FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own task patterns" ON user_task_patterns;
CREATE POLICY "Users can delete their own task patterns"
    ON user_task_patterns FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for user_habits
DROP POLICY IF EXISTS "Users can view their own habits" ON user_habits;
CREATE POLICY "Users can view their own habits"
    ON user_habits FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own habits" ON user_habits;
CREATE POLICY "Users can insert their own habits"
    ON user_habits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own habits" ON user_habits;
CREATE POLICY "Users can update their own habits"
    ON user_habits FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own habits" ON user_habits;
CREATE POLICY "Users can delete their own habits"
    ON user_habits FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for analytics_metadata
DROP POLICY IF EXISTS "Users can view their own analytics metadata" ON analytics_metadata;
CREATE POLICY "Users can view their own analytics metadata"
    ON analytics_metadata FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analytics metadata" ON analytics_metadata;
CREATE POLICY "Users can insert their own analytics metadata"
    ON analytics_metadata FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_task_patterns
DROP TRIGGER IF EXISTS update_user_task_patterns_updated_at ON user_task_patterns;
CREATE TRIGGER update_user_task_patterns_updated_at
    BEFORE UPDATE ON user_task_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE user_task_patterns IS 'Stores detected patterns in user task behavior for AI analysis';
COMMENT ON TABLE user_habits IS 'Stores learned user habits and preferences from task history';
COMMENT ON TABLE analytics_metadata IS 'Stores metadata about analytics runs and system performance';

COMMENT ON COLUMN user_task_patterns.confidence IS 'Confidence score (0-1) indicating how reliable this pattern is';
COMMENT ON COLUMN user_habits.strength IS 'Strength of the habit (0-1) based on data volume and consistency';
