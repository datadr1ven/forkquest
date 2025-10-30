import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const { query: text, gameId } = await req.json();

  // Generate embedding with Google's dedicated model
  const embedModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });  // 2025 embedding model, 768 dims
  const embedResult = await embedModel.generateContent(text);  // Simple text input → vector
  const embedding = embedResult.response.candidates[0].content.parts[0].embedding.values;  // Extract 768-dim vector

  const res = await query(`
    SELECT 
      'room' as type, name, description,
      (embedding <=> $1::vector) AS vector_score,
      ts_rank(to_tsvector('english', description), plainto_tsquery('english', $2)) AS bm25_score
    FROM rooms WHERE game_id = $3
    UNION ALL
    SELECT 'item', name, description, (embedding <=> $1::vector), ts_rank(to_tsvector('english', description), plainto_tsquery('english', $2)) AS bm25_score FROM items WHERE game_id = $3
    ORDER BY (vector_score * 0.4 + bm25_score * 0.6) ASC
    LIMIT 10
  `, [embedding, text, gameId]);

  return NextResponse.json(res.rows);
}