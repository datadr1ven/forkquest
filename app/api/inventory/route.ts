// app/api/inventory/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('gameId');
    if (!gameId) return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });

    const res = await query(`
    SELECT i.id, i.name, i.description
    FROM player_inventory pi
    JOIN items i ON pi.item_id = i.id
    WHERE pi.game_id = $1
  `, [gameId]);

    return NextResponse.json({ items: res.rows });
}