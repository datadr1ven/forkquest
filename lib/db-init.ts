// lib/db-init.ts
import { query } from './db';

export async function initializeSchema() {
    const initSQL = `
-- ========================================
-- 1. EXTENSIONS
-- ========================================
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========================================
-- 2. CORE TABLES
-- ========================================
CREATE TABLE IF NOT EXISTS games (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  fork_count  INTEGER DEFAULT 0
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_games_timestamp') THEN
    CREATE TRIGGER update_games_timestamp
      BEFORE UPDATE ON games
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- ========================================
-- 3. WORLD OBJECTS
-- ========================================
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL,
  name        TEXT,
  description TEXT,
  embedding   VECTOR(768)
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rooms_game_id_fkey') THEN
    ALTER TABLE rooms ADD CONSTRAINT rooms_game_id_fkey
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
  END IF;
END;
$$;
CREATE INDEX IF NOT EXISTS idx_rooms_embedding ON rooms USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL,
  name        TEXT,
  description TEXT,
  embedding   VECTOR(768)
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'items_game_id_fkey') THEN
    ALTER TABLE items ADD CONSTRAINT items_game_id_fkey
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
  END IF;
END;
$$;
CREATE INDEX IF NOT EXISTS idx_items_embedding ON items USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS npcs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL,
  name        TEXT,
  description TEXT,
  embedding   VECTOR(768)
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'npcs_game_id_fkey') THEN
    ALTER TABLE npcs ADD CONSTRAINT npcs_game_id_fkey
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
  END IF;
END;
$$;
CREATE INDEX IF NOT EXISTS idx_npcs_embedding ON npcs USING hnsw (embedding vector_cosine_ops);

-- ========================================
-- 4. PLAYER STATE & INVENTORY
-- ========================================
CREATE TABLE IF NOT EXISTS player_state (
  game_id       UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  location_id   UUID REFERENCES rooms(id),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_inventory (
  game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  acquired_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (game_id, item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_player_inventory_game ON player_inventory(game_id);
CREATE INDEX IF NOT EXISTS idx_player_inventory_item ON player_inventory(item_id);

-- Seed player_state for all games
INSERT INTO player_state (game_id, location_id)
SELECT g.id, (
  SELECT r.id FROM rooms r WHERE r.game_id = g.id ORDER BY random() LIMIT 1
)
FROM games g
ON CONFLICT (game_id) DO NOTHING;

-- ========================================
-- 5. FAST FORK FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION tiger_create_fork(parent_id UUID)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Copy game
  INSERT INTO games (title, description)
  SELECT title || ' (fork)', description
  FROM games WHERE id = parent_id
  RETURNING id INTO new_id;

  -- Copy world
  INSERT INTO rooms (game_id, name, description, embedding)
  SELECT new_id, name, description, embedding
  FROM rooms WHERE game_id = parent_id;

  INSERT INTO items (game_id, name, description, embedding)
  SELECT new_id, name, description, embedding
  FROM items WHERE game_id = parent_id;

  INSERT INTO npcs (game_id, name, description, embedding)
  SELECT new_id, name, description, embedding
  FROM npcs WHERE game_id = parent_id;

  -- Copy player state
  INSERT INTO player_state (game_id, location_id)
  SELECT new_id, location_id
  FROM player_state WHERE game_id = parent_id
  ON CONFLICT (game_id) DO NOTHING;

  -- Copy inventory
  INSERT INTO player_inventory (game_id, item_id, acquired_at)
  SELECT new_id, item_id, acquired_at
  FROM player_inventory WHERE game_id = parent_id
  ON CONFLICT (game_id, item_id) DO NOTHING;

  -- Update fork count
  UPDATE games SET fork_count = fork_count + 1 WHERE id = parent_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;
  `;

    try {
        await query(initSQL);
        console.log('Database schema initialized successfully');
    } catch (error: any) {
        console.error('Schema init failed:', error.message);
        throw error;
    }
}