-- ========================================
-- FORKQUEST: FULL SCHEMA INITIALIZATION
-- TigerData 2025 (vector extension, not pgvector)
-- Run ONCE in SQL Editor
-- ========================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;      -- Modern vector type
CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- For gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS vectorscale; -- Optional: scaling (TigerData)
CREATE EXTENSION IF NOT EXISTS ai;          -- Optional: AI helpers

-- 2. Core tables
DROP TABLE IF EXISTS npcs, items, rooms, games CASCADE;

-- Games: root of each world
CREATE TABLE games (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  fork_count  INTEGER DEFAULT 0
);

-- Rooms: locations in the game
CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name        TEXT,
  description TEXT,
  embedding   VECTOR(768),  -- Gemini 2.5 / text-embedding-004
  INDEX (game_id),
  INDEX (embedding vector_cosine_ops)  -- For <=> search
);

-- Items: objects in the world
CREATE TABLE items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name        TEXT,
  description TEXT,
  embedding   VECTOR(768),
  INDEX (game_id),
  INDEX (embedding vector_cosine_ops)
);

-- NPCs: characters
CREATE TABLE npcs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name        TEXT,
  description TEXT,
  embedding   VECTOR(768),
  INDEX (game_id),
  INDEX (embedding vector_cosine_ops)
);

-- 3. Fast-fork function (zero-copy clone)
CREATE OR REPLACE FUNCTION tiger_create_fork(parent_id UUID)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Copy game metadata
  INSERT INTO games (title, description)
  SELECT title || ' (fork)', description
  FROM games WHERE id = parent_id
  RETURNING id INTO new_id;

  -- Copy all world objects
  INSERT INTO rooms (game_id, name, description, embedding)
  SELECT new_id, name, description, embedding
  FROM rooms WHERE game_id = parent_id;

  INSERT INTO items (game_id, name, description, embedding)
  SELECT new