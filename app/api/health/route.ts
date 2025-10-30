// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { QueryResult } from 'pg';

export const dynamic = 'force-dynamic';

export async function GET() {
    const issues: string[] = [];

    try {
        // 1. Check if any core table exists (fast check)
        const tableCheck: QueryResult<{ exists: boolean }> = await query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'games'
      ) AS exists
    `);

        const schemaExists = tableCheck.rows[0]?.exists === true;

        // Only return INITIALIZING if schema doesn't exist
        if (!schemaExists) {
            return NextResponse.json({
                status: 'INITIALIZING' as const,  // ← 'as const' for literal type
                message: 'Database schema is being initialized...',
                timestamp: new Date().toISOString(),
            });
        }

        // 2. Full health checks (only if schema exists)
        const extRes: QueryResult<{ extname: string }> = await query(
            `SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pgcrypto')`
        );
        const extensions = extRes.rows.map(r => r.extname);
        if (!extensions.includes('vector')) issues.push('vector extension missing');
        if (!extensions.includes('pgcrypto')) issues.push('pgcrypto extension missing');

        const tablesRes: QueryResult<{ tablename: string }> = await query(
            `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('games', 'rooms', 'items', 'npcs', 'player_state', 'player_inventory')`
        );
        const tables = tablesRes.rows.map(r => r.tablename);
        const required = ['games', 'rooms', 'items', 'npcs', 'player_state', 'player_inventory'];
        required.forEach(t => {
            if (!tables.includes(t)) issues.push(`${t} table missing`);
        });

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

        if (tables.includes('rooms')) {
            const fkRes: QueryResult = await query(
                `SELECT 1 FROM pg_constraint WHERE conrelid = 'rooms'::regclass AND contype = 'f' AND confrelid = 'games'::regclass`
            );
            if ((fkRes.rowCount ?? 0) === 0) issues.push('rooms.game_id FK missing');
        }

        const fnRes: QueryResult = await query(
            `SELECT 1 FROM pg_proc WHERE proname = 'tiger_create_fork'`
        );
        if ((fnRes.rowCount ?? 0) === 0) issues.push('tiger_create_fork function missing');

        const countRes: QueryResult<{ games: string; rooms: string }> = await query(
            `SELECT 
         COALESCE((SELECT COUNT(*)::text FROM games), '0') AS games,
         COALESCE((SELECT COUNT(*)::text FROM rooms), '0') AS rooms`
        );
        const data = countRes.rows[0] ?? { games: '0', rooms: '0' };

        const status = issues.length === 0 ? 'OK' : 'ERROR';

        return NextResponse.json({
            status,
            issues,
            data,
            timestamp: new Date().toISOString(),
        });

    } catch (e: any) {
        // If query fails due to missing tables, treat as initializing
        if (e.message.includes('relation') && e.message.includes('does not exist')) {
            return NextResponse.json({
                status: 'INITIALIZING',
                message: 'Database schema is being initialized...',
                timestamp: new Date().toISOString(),
            });
        }

        return NextResponse.json(
            { status: 'ERROR', error: e.message, timestamp: new Date().toISOString() },
            { status: 500 }
        );
    }
}