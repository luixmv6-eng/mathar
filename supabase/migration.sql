-- ═══════════════════════════════════════════════
-- AR Vision — Full Supabase SQL Migration
-- Run this in Supabase SQL Editor (Project > SQL Editor)
-- ═══════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES (extends auth.users) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'superadmin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── AR PROJECTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ar_projects_updated_at
  BEFORE UPDATE ON ar_projects
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─── IMAGE TARGETS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS image_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ar_projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  reference_image_url TEXT NOT NULL,
  mind_file_url TEXT,
  width FLOAT DEFAULT 0.2,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── AR OVERLAYS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_overlays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID REFERENCES image_targets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('image', 'video', 'gif', 'model3d', 'text')) NOT NULL,
  content_url TEXT,
  content_text TEXT,
  position JSONB DEFAULT '{"x":0,"y":0,"z":0}',
  rotation JSONB DEFAULT '{"x":0,"y":0,"z":0}',
  scale JSONB DEFAULT '{"x":1,"y":1,"z":1}',
  opacity FLOAT DEFAULT 1.0,
  loop_video BOOLEAN DEFAULT true,
  autoplay BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── PROJECT COLLABORATORS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ar_projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('viewer', 'editor', 'admin')) DEFAULT 'viewer',
  invited_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- ─── ROW LEVEL SECURITY (RLS) ─────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_overlays ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service can insert profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- AR_PROJECTS
CREATE POLICY "Owner can CRUD own projects" ON ar_projects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Collaborators can view projects" ON ar_projects
  FOR SELECT USING (
    is_public = true OR
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = ar_projects.id AND user_id = auth.uid())
  );

-- IMAGE_TARGETS
CREATE POLICY "Owner can CRUD own targets" ON image_targets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Collaborators/public can view targets" ON image_targets
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM ar_projects p
      LEFT JOIN project_collaborators c ON c.project_id = p.id
      WHERE p.id = image_targets.project_id
        AND (p.is_public = true OR c.user_id = auth.uid())
    )
  );

-- AR_OVERLAYS
CREATE POLICY "Owner can CRUD own overlays" ON ar_overlays
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Collaborators/public can view overlays" ON ar_overlays
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM image_targets t
      JOIN ar_projects p ON p.id = t.project_id
      LEFT JOIN project_collaborators c ON c.project_id = p.id
      WHERE t.id = ar_overlays.target_id
        AND (p.is_public = true OR c.user_id = auth.uid())
    )
  );

-- PROJECT_COLLABORATORS
CREATE POLICY "Project owners can manage collaborators" ON project_collaborators
  FOR ALL USING (
    EXISTS (SELECT 1 FROM ar_projects WHERE id = project_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can view their own collaborations" ON project_collaborators
  FOR SELECT USING (auth.uid() = user_id);

-- ─── DELETE USER FUNCTION ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── STORAGE BUCKETS ──────────────────────────────────────────────────────────
-- Run these in Supabase Dashboard > Storage, or via Storage API

-- Create buckets (these are idempotent via the dashboard):
-- 1. "reference-images"  (public: false)
-- 2. "ar-overlays"       (public: true  — so overlays load in AR viewer)
-- 3. "mind-files"        (public: true  — so .mind files load in AR viewer)

-- Storage Policies (add via Dashboard > Storage > [Bucket] > Policies):
-- reference-images: authenticated users can upload to {user_id}/{project_id}/*
-- ar-overlays: authenticated users can upload to {user_id}/{target_id}/*; public SELECT
-- mind-files: authenticated users can upload; public SELECT

-- ════════════════════════════════════════════════
-- SUPERADMIN: To make a user superadmin, run:
-- UPDATE profiles SET role = 'superadmin' WHERE email = 'your@email.com';
-- ════════════════════════════════════════════════
