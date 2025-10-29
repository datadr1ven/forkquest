import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
    const { gameId } = await req.json();
    const start = Date.now();

    // Tiger's fast fork (assumes tiger.create_fork function)
    const { rows } = await sql`SELECT tiger_create_fork(${gameId}) AS new_id`;
    const newGameId = rows[0].new_id;
    const timeMs = Date.now() - start;

    // Update parent fork_count
    await sql`UPDATE games SET fork_count = fork_count + 1 WHERE id = ${gameId}`;

    return NextResponse.json({ newGameId, timeMs });
}