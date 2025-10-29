import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
    const { query, gameId } = await req.json();

    // Embed query (use OpenAI or pgvector)
    const embedding = await getEmbedding(query); // Implement with OpenAI

    const { rows } = await sql`
    SELECT 
      type, name, description,
      (embedding <=> ${embedding})::float AS vector_score,
      ts_rank(to_tsvector('english', description), plainto_tsquery('english', ${query})) AS bm25_score
    FROM searchable_objects  -- View unioning rooms/items/npcs
    WHERE game_id = ${gameId}
    ORDER BY (vector_score * 0.3 + (1 - bm25_score) * 0.7) ASC  -- Tune weights
    LIMIT 10;
  `;

    return NextResponse.json(rows);
}

// Helper: OpenAI embedding
async function getEmbedding(text: string) {
    // Use openai.embeddings.create({ model: 'text-embedding-3-small', input: text })
    return [0.1, 0.2, ...]; // Placeholder
}