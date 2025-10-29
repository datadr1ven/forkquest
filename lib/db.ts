import { Pool } from 'pg';

export const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

export async function sql(query: string, params?: any[]) {
    const client = await pool.connect();
    try {
        const res = await client.query(query, params);
        return res;
    } finally {
        client.release();
    }
}