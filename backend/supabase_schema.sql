-- Users table (synced from Clerk via webhook)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,              -- Clerk user ID
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  plan TEXT DEFAULT 'free',         -- free | pro | team
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent runs
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,         -- caption | repurpose | trend
  status TEXT DEFAULT 'completed',  -- running | completed | error
  input JSONB NOT NULL,
  output JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Content items
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  type TEXT NOT NULL,               -- caption | repurposed | trend-based
  content TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  original_content TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agent_runs_user_id ON agent_runs(user_id);
CREATE INDEX idx_content_items_user_id ON content_items(user_id);
CREATE INDEX idx_content_items_platform ON content_items(platform);

-- RLS Policies (enable Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- ── Migrations (run in Supabase SQL editor) ────────────────────────────────

-- 1. Add video fields to pipelines table
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS video_url    TEXT DEFAULT '';
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS video_status TEXT DEFAULT 'none';

-- 3. Add pipeline_id and image_url to content_items
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS image_url  TEXT DEFAULT '';

-- 4. Composite index to speed up "get all content" query (fixes statement timeout)
CREATE INDEX IF NOT EXISTS idx_content_items_user_created ON content_items(user_id, created_at DESC);

-- 2. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,          -- video_ready | pipeline_complete
  title      TEXT NOT NULL,
  body       TEXT DEFAULT '',
  link       TEXT DEFAULT '',
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
-- No RLS needed — notifications are only accessed server-side via service key
-- (service_role bypass is unreliable without explicit policies; disable is safer)
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
