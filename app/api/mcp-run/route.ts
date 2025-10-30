// app/api/mcp-run/route.ts
import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent';
import { query } from '@/lib/db';

export async function POST(req: Request) {
    const { prompt, gameId } = await req.json();

    if (!prompt || !gameId) {
        return NextResponse.json({ error: 'Missing prompt or gameId' }, { status: 400 });
    }

    try {
        // Agent generates narrative + optional SQL
        const result = await runAgent(
            `Game ID: ${gameId}

Player command: "${prompt}"

Current world state: SELECT * FROM rooms, items, npcs WHERE game_id = '${gameId}';

Respond with immersive narrative (1–3 sentences). Use Zork-style tone.

If the command changes state (move, take, use), include safe SQL.

Return ONLY JSON:
{
  "response": "Narrative text for player",
  "sql": ["UPDATE rooms SET player_here = true WHERE name = 'Dark Cave';"]
}
`,
            gameId
        );

        // Execute SQL if present
        if (result.sql && Array.isArray(result.sql)) {
            for (const q of result.sql) {
                console.log('Executing:', q);
                await query(q);
            }
        }

        // Return only the narrative
        const narrative = result.response || result.explanation || 'You stand still.';
        return NextResponse.json({ response: narrative });
    } catch (e: any) {
        console.error('MCP run error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}