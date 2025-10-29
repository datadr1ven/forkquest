import { MCP } from '@tigerdata/mcp';
import { sql } from './db';

const mcp = new MCP({
    connectionString: process.env.POSTGRES_URL!,
    apiKey: process.env.MCP_API_KEY!,
    model: 'gpt-4o'
});

export async function runMCP(prompt: string, gameId: string) {
    const result = await mcp.execute(prompt, {
        context: { gameId },
        openai: { apiKey: process.env.OPENAI_API_KEY }
    });

    // Execute returned SQL safely
    if (result.sql) {
        for (const q of result.sql) {
            await sql(q);
        }
    }

    return result;
}