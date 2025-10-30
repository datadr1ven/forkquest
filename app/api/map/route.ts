// app/api/map/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// --------------------------------------------------
// Types – fix "Cannot find name 'Connection'"
// --------------------------------------------------
interface Room {
    id: string;
    name: string;
    x: number;
    y: number;
    isCurrent: boolean;
}

interface Connection {
    from: string;
    to: string;
}

// --------------------------------------------------
// GET /api/map?gameId=...
// --------------------------------------------------
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('gameId');

    if (!gameId) {
        return NextResponse.json(
            { error: 'Missing gameId' },
            { status: 400 }
        );
    }

    try {
        // 1. Fetch rooms + player location
        const roomsRes = await query(
            `
      SELECT 
        r.id, 
        r.name,
        ps.location_id = r.id AS is_current
      FROM rooms r
      LEFT JOIN player_state ps ON ps.game_id = $1
      WHERE r.game_id = $1
      `,
            [gameId]
        );

        // 2. Type the result – fix "rows does not exist"
        const rows = roomsRes.rows as Array<{
            id: string;
            name: string;
            is_current: boolean;
        }>;

        // 3. Layout + current room
        const rooms: Room[] = rows.map((row, i) => ({
            id: row.id,
            name: row.name,
            x: 60 + (i % 3) * 100,
            y: 60 + Math.floor(i / 3) * 80,
            isCurrent: row.is_current,
        }));

        // 4. Mock connections
        const connections: Connection[] = [];
        for (let i = 0; i < rooms.length - 1; i++) {
            connections.push({
                from: rooms[i].id,
                to: rooms[i + 1].id,
            });
        }

        return NextResponse.json({ rooms, connections });
    } catch (e: any) {
        console.error('Map API error:', e);
        return NextResponse.json(
            { error: e.message || 'Internal server error' },
            { status: 500 }
        );
    }
}