import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { runMCP } from '@/lib/mcp';

export async function POST() {
    // MCP generates initial schema + sample data
    const result = await runMCP('Create a basic text adventure schema with rooms, items, NPCs. Seed with a fantasy starting world: forest, cave, goblin.', 'new');

    const { rows } = await sql`INSERT INTO games (title, description) VALUES ('New Adventure', 'Generated world') RETURNING id`;
    const gameId = rows[0].id;

    return NextResponse.json({ gameId });
}