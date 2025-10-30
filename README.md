# ForkQuest

Text adventure + Tiger Data (fast forks, hybrid search, agentic SQL via **Google Gemini – FREE!**).

## Setup

1. Get free Gemini API key: [aistudio.google.com](https://aistudio.google.com) → "Get API Key".
2. `pnpm install`
3. `.env.local` → Add `POSTGRES_URL` + `GEMINI_API_KEY`.
4. Enable `pgvector` in Tiger DB (VECTOR(768) for Gemini embeddings).
5. Run initial schema SQL (tables + fork function) in Tiger console.
6. `pnpm dev` → localhost:3000

## Features
- **Agent (Gemini)**: Free chat-to-SQL (1,500 reqs/day).
- **Hybrid Search**: BM25 + Gemini vectors.
- **Fast Forks**: Tiger native.

## Deploy
`vercel --prod` – Free tier scales!

