// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { QueryResult } from 'pg';

export const dynamic = 'force-dynamic';

export async function GET() {
    const issues: string[] = [];

    try {
        // --------------------------------------------------
        // 1. Extensions (vector + pgcrypto)
        // --------------------------------------------------
        const extRes: QueryResult<{ extname: string }> = await query(
            `SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pgcrypto')`
        );
        const extensions = extRes.rows.map(r => r.extname);
        if (!extensions.includes('vector')) issues.push('vector extension missing');
        if (!extensions.includes('pgcrypto')) issues.push('pgcrypto extension missing');

        // --------------------------------------------------
        // 2. Tables exist
        // --------------------------------------------------
        const tablesRes: QueryResult<{ tablename: string }> = await query(
            `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('games', 'rooms', 'items', 'npcs', 'player_state', 'player_inventory')`
        );
        const tables = tablesRes.rows.map(r => r.tablename);
        const required = ['games', 'rooms', 'items', 'npcs', 'player_state', 'player_inventory'];
        required.forEach(t => {
            if (!tables.includes(t)) issues.push(`${t} table missing`);
        });

        // --------------------------------------------------
        // 3. vector(768) on rooms
        // --------------------------------------------------
        if (tables.includes('rooms')) {
            const vecRes: QueryResult<{ type: string }> = await query(
                `SELECT pg_catalog.format_type(a.atttypid, a.atttypmod) AS type
         FROM pg_attribute a
         JOIN pg_class c ON a.attrelid = c.oid
         WHERE c.relname = 'rooms' AND a.attname = 'embedding'`
            );
            if (vecRes.rowCount === 0 || vecRes.rows[0].type !== 'vector(768)') {
                issues.push('rooms.embedding must be vector(768)');
            }
        }

        // --------------------------------------------------
        // 4. Foreign key: rooms.game_id → games.id
        // --------------------------------------------------
        if (tables.includes('rooms')) {
            const fkRes: QueryResult = await query(
                `SELECT 1 FROM pg_constraint WHERE conrelid = 'rooms'::regclass AND contype = 'f' AND confrelid = 'games'::regclass`
            );
            if ((fkRes.rowCount ?? 0) === 0) issues.push('rooms.game_id FK missing');
        }

        // --------------------------------------------------
        // 5. tiger_create_fork function
        // --------------------------------------------------
        const fnRes: QueryResult = await query(
            `SELECT 1 FROM pg_proc WHERE proname = 'tiger_create_fork'`
        );
        if ((fnRes.rowCount ?? 0) === 0) issues.push('tiger_create_fork function missing');

        // --------------------------------------------------
        // 6. Data counts
        // --------------------------------------------------
        const countRes: QueryResult<{ games: string; rooms: string }> = await query(
            `SELECT 
         COALESCE((SELECT COUNT(*)::text FROM games), '0') AS games,
         COALESCE((SELECT COUNT(*)::text FROM rooms), '0') AS rooms`
        );
        const data = countRes.rows[0] ?? { games: '0', rooms: '0' };

        // --------------------------------------------------
        // Final response
        // --------------------------------------------------
        return NextResponse.json({
            status: issues.length === 0 ? 'OK' : 'ERROR',
            issues,
            data,
            timestamp: new Date().toISOString(),
        });
    } catch (e: any) {
        console.error('Health check failed:', e);
        return NextResponse.json(
            { status: 'ERROR', error: e.message, timestamp: new Date().toISOString() },
            { status: 500 }
        );
    }
}