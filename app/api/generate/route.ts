import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export async function POST() {
    await ensureSchema();
    const gameRes = await query(`INSERT INTO games (title) VALUES ('Demo') RETURNING id`);
    const gameId = gameRes.rows[0].id;
    const vec = `[${Array(768).fill(0).map(() => Math.random().toFixed(6)).join(',')}]`;

    await query(`INSERT INTO rooms (game_id, name, description, vector) VALUES ($1, 'Dark Cave', 'A damp cave.', $2::VECTOR)`, [gameId, vec]);
    await query(`INSERT INTO items (game_id, name, description, vector) VALUES ($1, 'Glowing Key', 'A key.', $2::VECTOR)`, [gameId, vec]);
    await query(`INSERT INTO player_state (game_id, location_id) SELECT $1, id FROM rooms WHERE game_id = $1`, [gameId]);

    return NextResponse.json({ gameId });
}