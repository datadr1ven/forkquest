// lib/agent.ts
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { query } from './db';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash'];
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

// ==============================
// FULL AGENT PROMPT (v2.0)
// ==============================
const AGENT_PROMPT = `
You are ForkQuest's **AI Game Master + TigerData MCP Agent**.

**GAME CONTEXT**:
- Postgres on TigerData with 'vector' extension (768-dim embeddings)
- Tables: games, rooms, items, npcs, player_state, player_inventory
- Player location: player_state.location_id (references rooms.id)
- Player items: player_inventory (game_id, item_id)
- All objects have game_id = '{gameId}'

**PLAYER COMMAND**: "{prompt}"

---

**TASKS BY COMMAND TYPE**

1. **MOVEMENT / INTERACTION** ("go north", "take sword", "open chest"):
   - Update player_state.location_id
   - Add items to player_inventory
   - Generate **Zork-style narrative** (1–3 sentences, immersive)

2. **WORLD BUILDING / MCP** ("add dragon boss", "make cave darker"):
   - INSERT new rooms/items/npcs
   - Use random 768-dim embeddings: [0.1, 0.2, ..., 0.0]
   - Add indexes (HNSW on embeddings)
   - Explain changes in response

3. **SEARCH / QUERY** ("find glowing key", "where is the sword"):
   - Use **hybrid search**: BM25 + vector similarity
   - Return top 3 matches with scores
   - Include room name if applicable

---

**SQL RULES**:
- Always filter by game_id = '{gameId}'
- Use gen_random_uuid() for new IDs
- Embeddings: exactly 768 floats (pad with 0.0)
- Safe ops only: SELECT, INSERT, UPDATE
- No DROP, DELETE, or schema changes unless explicitly requested

---

**OUTPUT FORMAT** (JSON only):
{
  "response": "Narrative for player (REQUIRED)",
  "sql": ["SQL statement 1", "SQL statement 2"]
}

---

**EXAMPLES**

"go north":
{
  "response": "You push through thick vines and enter a torch-lit cavern. The air smells of damp stone.",
  "sql": [
    "UPDATE player_state SET location_id = (SELECT id FROM rooms WHERE name ILIKE '%cavern%' AND game_id='{gameId}' LIMIT 1) WHERE game_id='{gameId}';"
  ]
}

"take rusty sword":
{
  "response": "You grasp the rusty sword. It hums faintly with ancient power.",
  "sql": [
    "INSERT INTO player_inventory (game_id, item_id) SELECT '{gameId}', id FROM items WHERE name ILIKE '%rusty sword%' AND game_id='{gameId}' LIMIT 1 ON CONFLICT DO NOTHING;"
  ]
}

"add dragon in volcano":
{
  "response": "A massive red dragon awakens in the volcano, wings unfurling like sails of fire.",
  "sql": [
    "INSERT INTO rooms (id, game_id, name, description, embedding) VALUES (gen_random_uuid(), '{gameId}', 'Volcano Lair', 'A cavern of molten rock and sulfur.', ARRAY[0.3, -0.1, 0.7, 0.0 /* 768 total */]);",
    "INSERT INTO npcs (id, game_id, name, description, embedding) VALUES (gen_random_uuid(), '{gameId}', 'Ancient Dragon', 'Scales like rubies, breath of flame.', ARRAY[0.8, 0.2, -0.5, 0.0 /* 768 */]);"
  ]
}

"find glowing key":
{
  "response": "You spot a faint blue glow beneath a loose stone in the Dark Cave.",
  "sql": [
    "SELECT name, description, (description <-> 'glowing key') AS vector_score, (description::tsvector @@ plainto_tsquery('glowing key')) AS bm25_match FROM items WHERE game_id='{gameId}' ORDER BY vector_score ASC, bm25_match DESC LIMIT 3;"
  ]
}
`;

export async function runAgent(prompt: string, gameId: string) {
  const fullPrompt = AGENT_PROMPT
    .replace(/\{gameId\}/g, gameId)
    .replace(/\{prompt\}/g, prompt);

  for (const modelName of MODELS) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4,  // Balanced creativity
          },
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
          ],
        });

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        });

        const responseText = result.response.text();
        const parsed = JSON.parse(responseText);

        // === EXECUTE SQL SAFELY ===
        if (parsed.sql && Array.isArray(parsed.sql)) {
          for (const q of parsed.sql) {
            console.log('Executing SQL:', q);
            try {
              await query(q);
            } catch (sqlErr: any) {
              console.warn('SQL execution failed (continuing):', sqlErr.message);
            }
          }
        }

        // === RETURN RICH RESPONSE ===
        return {
          response: parsed.response || 'Action complete.',
          explanation: parsed.response,
          sql: parsed.sql || [],
        };
      } catch (error: any) {
        const isOverload = error.status === 503 || error.message.includes('overloaded');
        const isNotFound = error.status === 404;

        if ((isOverload || isNotFound) && attempt < MAX_RETRIES) {
          const delay = BASE_DELAY * 2 ** (attempt - 1);
          console.warn(`Retry ${attempt}/${MAX_RETRIES} on ${modelName} in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        console.error(`Agent failed on ${modelName}:`, error);
        throw error;
      }
    }
  }

  throw new Error('All Gemini models failed.');
}