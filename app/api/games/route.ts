// app/api/games/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const res = await query(
            `SELECT id, title, created_at AS updated_at FROM games ORDER BY created_at DESC`
        );
        return NextResponse.json({ games: res.rows });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}