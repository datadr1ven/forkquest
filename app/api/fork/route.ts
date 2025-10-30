// app/api/fork/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: Request) {
    const { gameId } = await req.json();
    const start = Date.now();

    try {
        const res = await query(`SELECT tiger_create_fork($1) AS new_id`, [gameId]);
        const newGameId = res.rows[0].new_id;
        const timeMs = Date.now() - start;

        await query(`UPDATE games SET fork_count = fork_count + 1 WHERE id = $1`, [gameId]);

        return NextResponse.json({ newGameId, timeMs });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}