// app/api/player/route.ts
import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent';

export async function POST(req: Request) {
    const { prompt, gameId } = await req.json();
    const result = await runAgent(prompt, gameId, 'player');
    return NextResponse.json(result);
}