// lib/schema.ts
import { query } from './db';

export async function ensureSchema() {
  try {
    // Extensions
    await query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Games
    await query(`
      CREATE TABLE IF NOT EXISTS games (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        fork_count INTEGER DEFAULT 0
      );
    `);

    // Rooms
    await query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        name TEXT,
        description TEXT,
        vector VECTOR(768)
      );
    `);

    // Add desc_tsvector to rooms
    await query(`
      ALTER TABLE rooms 
      ADD COLUMN IF NOT EXISTS desc_tsvector TSVECTOR 
      GENERATED ALWAYS AS (to_tsvector('english', COALESCE(description, ''))) STORED;
    `);

    // Items
    await query(`
      CREATE TABLE IF NOT EXISTS items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        name TEXT,
        description TEXT,
        vector VECTOR(768)
      );
    `);

    // Add desc_tsvector to items
    await query(`
      ALTER TABLE items 
      ADD COLUMN IF NOT EXISTS desc_tsvector TSVECTOR 
      GENERATED ALWAYS AS (to_tsvector('english', COALESCE(description, ''))) STORED;
    `);

    // NPCs
    await query(`
      CREATE TABLE IF NOT EXISTS npcs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        name TEXT,
        description TEXT,
        vector VECTOR(768)
      );
    `);

    // Add desc_tsvector to npcs
    await query(`
      ALTER TABLE npcs 
      ADD COLUMN IF NOT EXISTS desc_tsvector TSVECTOR 
      GENERATED ALWAYS AS (to_tsvector('english', COALESCE(description, ''))) STORED;
    `);

    // Player State
    await query(`
      CREATE TABLE IF NOT EXISTS player_state (
        game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
        location_id UUID REFERENCES rooms(id)
      );
    `);

    // Player Inventory
    await query(`
      CREATE TABLE IF NOT EXISTS player_inventory (
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        PRIMARY KEY (game_id, item_id)
      );
    `);

    // === INDEXES ===
    // Vector (HNSW)
    await query(`CREATE INDEX IF NOT EXISTS idx_rooms_vector ON rooms USING hnsw (vector vector_cosine_ops);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_items_vector ON items USING hnsw (vector vector_cosine_ops);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_npcs_vector ON npcs USING hnsw (vector vector_cosine_ops);`);

    // Full-Text Search (GIN on tsvector)
    await query(`CREATE INDEX IF NOT EXISTS idx_rooms_tsv ON rooms USING GIN (desc_tsvector);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_items_tsv ON items USING GIN (desc_tsvector);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_npcs_tsv ON npcs USING GIN (desc_tsvector);`);

    // === FORK FUNCTION ===
    await query(`
      CREATE OR REPLACE FUNCTION tiger_create_fork(parent_id UUID)
      RETURNS UUID AS $$
      DECLARE new_id UUID;
      BEGIN
        INSERT INTO games (title) 
        SELECT title || ' (fork)' FROM games WHERE id = parent_id 
        RETURNING id INTO new_id;

        INSERT INTO rooms (game_id, name, description, vector) 
        SELECT new_id, name, description, vector FROM rooms WHERE game_id = parent_id;

        INSERT INTO items (game_id, name, description, vector) 
        SELECT new_id, name, description, vector FROM items WHERE game_id = parent_id;

        INSERT INTO npcs (game_id, name, description, vector) 
        SELECT new_id, name, description, vector FROM npcs WHERE game_id = parent_id;

        INSERT INTO player_state (game_id, location_id) 
        SELECT new_id, location_id FROM player_state WHERE game_id = parent_id 
        ON CONFLICT DO NOTHING;

        INSERT INTO player_inventory (game_id, item_id) 
        SELECT new_id, item_id FROM player_inventory WHERE game_id = parent_id 
        ON CONFLICT DO NOTHING;

        UPDATE games SET fork_count = fork_count + 1 WHERE id = parent_id;
        RETURN new_id;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('Schema fully ensured with desc_tsvector and GIN indexes.');
  } catch (e: any) {
    console.error('Schema error:', e.message);
    throw e;
  }
}