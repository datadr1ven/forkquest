// app/api/search/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { query: searchTerm, gameId } = await req.json();

    if (!searchTerm || !gameId) {
      return NextResponse.json([], { status: 400 });
    }

    const vectorStr = `[${Array.from({ length: 768 }, () => (Math.random() - 0.5).toFixed(6)).join(',')}]`;

    const sql = `
      WITH bm25 AS (
        SELECT 'item' AS type, name, 'BM25' AS source, 0.0 AS vector_score
        FROM items
        WHERE game_id = $1 AND desc_tsvector @@ plainto_tsquery($2)

        UNION ALL

        SELECT 'room' AS type, name, 'BM25' AS source, 0.0
        FROM rooms
        WHERE game_id = $1 AND desc_tsvector @@ plainto_tsquery($2)

        UNION ALL

        SELECT 'npc' AS type, name, 'BM25' AS source, 0.0
        FROM npcs
        WHERE game_id = $1 AND desc_tsvector @@ plainto_tsquery($2)
      ),
      bm25_count AS (SELECT COUNT(*) AS cnt FROM bm25)

      -- Return BM25 results
      (SELECT * FROM bm25)

      UNION ALL

      -- Vector fallback only if BM25 found nothing
      (SELECT * FROM (
        SELECT 'item' AS type, name, 'vector' AS source, (vector <-> $3::VECTOR)::float AS vector_score
        FROM items
        WHERE game_id = $1
        ORDER BY vector_score ASC
        LIMIT 5
      ) AS v_items
      WHERE (SELECT cnt FROM bm25_count) = 0)

      UNION ALL

      (SELECT * FROM (
        SELECT 'room' AS type, name, 'vector' AS source, (vector <-> $3::VECTOR)::float AS vector_score
        FROM rooms
        WHERE game_id = $1
        ORDER BY vector_score ASC
        LIMIT 5
      ) AS v_rooms
      WHERE (SELECT cnt FROM bm25_count) = 0)

      UNION ALL

      (SELECT * FROM (
        SELECT 'npc' AS type, name, 'vector' AS source, (vector <-> $3::VECTOR)::float AS vector_score
        FROM npcs
        WHERE game_id = $1
        ORDER BY vector_score ASC
        LIMIT 5
      ) AS v_npcs
      WHERE (SELECT cnt FROM bm25_count) = 0)

      LIMIT 5;
    `;

    const res = await query(sql, [gameId, searchTerm, vectorStr]);
    return NextResponse.json(res.rows);
  } catch (e: any) {
    console.error('Search error:', e.message);
    return NextResponse.json([], { status: 500 });
  }
}