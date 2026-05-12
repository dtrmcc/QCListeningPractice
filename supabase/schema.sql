-- ============================================================
-- QC TOEFL Practice Tool — Supabase Schema
-- Run this in your Supabase project SQL Editor
-- ============================================================

-- Listening Materials table
CREATE TABLE IF NOT EXISTS listening_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('conversation', 'lecture')),
  subject TEXT,

  -- Conversation-specific
  conversation_setting TEXT CHECK (conversation_setting IN (
    'office_hours', 'student_services', 'library', 'advising', 'housing', 'other'
  )),

  -- Lecture-specific
  academic_field TEXT CHECK (academic_field IN (
    'arts_humanities', 'life_sciences', 'physical_sciences', 'social_sciences'
  )),
  lecture_style TEXT CHECK (lecture_style IN ('monologue', 'interactive')),

  -- Content
  transcript TEXT NOT NULL,
  speaker_notes TEXT,

  -- Metadata
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  word_count INTEGER,
  estimated_duration INTEGER,  -- seconds
  source_type TEXT DEFAULT 'manual' CHECK (source_type IN (
    'manual', 'adapted', 'ai_generated'
  )),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS listening_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES listening_materials(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL DEFAULT 1,

  question_type TEXT NOT NULL CHECK (question_type IN (
    'gist_content', 'gist_purpose', 'detail', 'function',
    'attitude', 'organization', 'connecting_content', 'inference'
  )),

  question_text TEXT NOT NULL,
  options JSONB,           -- [{"id": "A", "text": "..."}, ...]
  correct_answer TEXT,     -- "A" or "A,C" for multiple
  allows_multiple BOOLEAN DEFAULT FALSE,
  explanation TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_listening_questions_material_id
  ON listening_questions(material_id);

CREATE INDEX IF NOT EXISTS idx_listening_materials_type
  ON listening_materials(material_type);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON listening_materials;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON listening_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security — permissive for teacher tool
-- (relies on app-level auth; tighten with Supabase Auth if needed)
ALTER TABLE listening_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_listening_materials" ON listening_materials;
CREATE POLICY "allow_all_listening_materials"
  ON listening_materials FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_listening_questions" ON listening_questions;
CREATE POLICY "allow_all_listening_questions"
  ON listening_questions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Sample data (optional — delete if not needed)
-- ============================================================

INSERT INTO listening_materials (
  title, material_type, academic_field, lecture_style, subject,
  transcript, speaker_notes, difficulty, word_count, estimated_duration, source_type
) VALUES (
  'Professor discusses the symbiotic relationship of mycorrhizal fungi',
  'lecture',
  'life_sciences',
  'interactive',
  'Mycorrhizal Fungi and Plant Symbiosis',
  E'Professor: Good morning, everyone. Today we''re going to explore one of nature''s most fascinating partnerships — the relationship between plants and mycorrhizal fungi. Now, most of you probably think of fungi as, well, mushrooms. But the mycorrhizal fungi we''re discussing today spend most of their lives underground, intertwined with plant roots.\n\nLet me start with the basics. The word "mycorrhiza" comes from the Greek words for fungus and root. And that''s exactly what this is — a fungus that lives in close association with a plant''s root system. But what makes this relationship so remarkable is that it''s mutually beneficial. Both organisms gain something from the arrangement.\n\nThe plant provides the fungus with sugars — the products of photosynthesis. The fungus, in turn, dramatically extends the plant''s ability to absorb water and nutrients, especially phosphorus, from the soil. The fungal network, called mycelium, can extend many meters beyond the root zone, effectively acting as a secondary root system.\n\nStudent: Professor, does this mean all plants have this relationship with fungi?\n\nProfessor: Great question! Actually, it''s estimated that about 90 percent of land plants form some kind of mycorrhizal association. In fact, the fossil record suggests this relationship is ancient — possibly dating back 450 million years, to when plants first colonized land. Some scientists believe mycorrhizal fungi may have been essential for that colonization.\n\nNow, what''s particularly interesting from an ecological standpoint is what researchers have called the "wood wide web." Trees in a forest aren''t isolated individuals. Through the mycorrhizal network, they can actually transfer carbon and nutrients to neighboring trees — even trees of different species. Older, larger trees, sometimes called "mother trees," appear to support younger seedlings through these underground networks.',
  'Professor is enthusiastic but measured; pause slightly after introducing "mycorrhiza" and "mycelium" to allow students to process.',
  'medium',
  420,
  194,
  'manual'
);
