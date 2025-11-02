// lib/agent.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from './db';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function runAgent(prompt: string, gameId: string, mode: 'player' | 'mcp') {
    const isMCP = mode === 'mcp';
    const system = isMCP
        ? `You are MCP. Only respond to "add X", "spawn X". Return: { response: "X added!" }`
        : `You are game narrator. Respond to "go X", "take X". Return: { response: "You went north." }`;

    try {
        const result = await model.generateContent([system, prompt]);
        const text = result.response.text();

        if (isMCP && prompt.toLowerCase().includes('add')) {
            const name = prompt.split('add')[1]?.trim() || 'Unknown';
            const vec = `[${Array(768).fill(0).map(() => (Math.random() - 0.5).toFixed(6)).join(',')}]`;
            await query(
                `INSERT INTO npcs (game_id, name, description, vector) VALUES ($1, $2, $3, $4::VECTOR)`,
                [gameId, name, `A ${name} added by MCP.`, vec]
            );
            return { response: `${name} added!` };
        }

        return { response: text };
    } catch (e: any) {
        return { response: `Error: ${e.message}` };
    }
}