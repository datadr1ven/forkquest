import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export async function POST(req: Request) {
    await ensureSchema();
    const { gameId } = await req.json();
    const start = Date.now();
    const res = await query(`SELECT tiger_create_fork($1) AS new_game_id`, [gameId]);
    const time = Date.now() - start;
    return NextResponse.json({ newGameId: res.rows[0].new_game_id, time });
}