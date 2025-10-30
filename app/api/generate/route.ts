// app/api/generate/route.ts
import { NextResponse } from 'next/server';
import { initializeSchema } from '@/lib/db-init';
import { query } from '@/lib/db';

export async function POST() {
    try {
        // 1. Ensure schema
        await initializeSchema();

        // 2. Create game
        const res = await query(
            `INSERT INTO games (title) VALUES ('New Adventure') RETURNING id`
        );

        const gameId = res.rows[0].id;

        // 3. Create starter rooms
        await query(`
      INSERT INTO rooms (game_id, name, description)
      VALUES 
        ($1, 'Misty Forest', 'A foggy woodland with ancient trees.'),
        ($1, 'Dark Cave', 'A damp cavern echoing with distant water.'),
        ($1, 'Crystal Lake', 'A serene lake reflecting starlight.')
    `, [gameId]);

        // 4. Set player location
        await query(`
      INSERT INTO player_state (game_id, location_id)
      SELECT $1, id FROM rooms WHERE game_id = $1 AND name = 'Misty Forest'
      ON CONFLICT (game_id) DO UPDATE SET location_id = EXCLUDED.location_id
    `, [gameId]);

        // 5. Return valid JSON
        return NextResponse.json({ gameId }, { status: 200 });

    } catch (e: any) {
        console.error('Generate error:', e);
        return NextResponse.json(
            { error: e.message || 'Internal server error' },
            { status: 500 }
        );
    }
}