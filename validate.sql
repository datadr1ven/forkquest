DO $$
DECLARE
  err TEXT := '';
  tbl TEXT;
  tables TEXT[] := ARRAY['games', 'rooms', 'items', 'npcs'];
BEGIN
  -- 1. Extensions
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    err := err || 'vector extension missing; ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    err := err || 'pgcrypto extension missing; ';
  END IF;

  -- 2. Tables exist
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = tbl
    ) THEN
      err := err || tbl || ' table missing; ';
    END IF;
  END LOOP;

  -- 3. embedding = vector(768)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'rooms') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_attribute a
      JOIN pg_class c ON a.attrelid = c.oid
      WHERE c.relname = 'rooms'
        AND a.attname = 'embedding'
        AND pg_catalog.format_type(a.atttypid, a.atttypmod) = 'vector(768)'
    ) THEN
      err := err || 'rooms.embedding must be vector(768); ';
    END IF;
  END IF;

  -- 4. FK: game_id → games.id
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'rooms') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'rooms'::regclass
        AND contype = 'f'
        AND confrelid = 'games'::regclass
    ) THEN
      err := err || 'rooms.game_id FK missing; ';
    END IF;
  END IF;

  -- 5. Fork function
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'tiger_create_fork') THEN
    err := err || 'tiger_create_fork function missing; ';
  END IF;

  -- Final result
  IF err = '' THEN
    RAISE NOTICE 'ALL SCHEMA CHECKS PASSED!';
  ELSE
    RAISE EXCEPTION 'Schema issues: %', err;
  END IF;
END;
$$;