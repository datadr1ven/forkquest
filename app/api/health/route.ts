// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export async function GET() {
    const issues: string[] = [];
    let data = { games: '0', rooms: '0' };

    try {
        // Ensure schema first — if it fails, catch and report
        await ensureSchema();
    } catch (e: any) {
        issues.push(`Schema init failed: ${e.message}`);
        return NextResponse.json({ status: 'ERROR', issues, data, timestamp: new Date().toISOString() });
    }

    try {
        const counts = await query(`
      SELECT 
        (SELECT COUNT(*)::text FROM games) AS games,
        (SELECT COUNT(*)::text FROM rooms) AS rooms
    `);
        data = counts.rows[0];
    } catch (e: any) {
        issues.push(`Count failed: ${e.message}`);
    }

    try {
        const ext = await query(`SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pgcrypto')`);
        const exts = ext.rows.map((r: any) => r.extname);
        if (!exts.includes('vector')) issues.push('vector extension missing');
        if (!exts.includes('pgcrypto')) issues.push('pgcrypto extension missing');
    } catch (e: any) {
        issues.push(`Extension check failed: ${e.message}`);
    }

    return NextResponse.json({
        status: issues.length === 0 ? 'OK' : 'ERROR',
        issues,
        data,
        timestamp: new Date().toISOString(),
    });
}