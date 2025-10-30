// lib/db.ts — NEVER import in client components!
import { Pool } from 'pg';

if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is missing');
}

export const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    // Optional: for Vercel
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function query(text: string, params?: any[]) {
    const client = await pool.connect();
    try {
        const res = await client.query(text, params);
        return res;
    } finally {
        client.release();
    }
}