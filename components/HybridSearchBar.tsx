'use client';
import { useState } from 'react';

interface Props { gameId: string; }

export default function HybridSearchBar({ gameId }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);

    const search = async () => {
        const res = await fetch('/api/search', {
            method: 'POST',
            body: JSON.stringify({ query, gameId }),
        });
        setResults(await res.json());
    };

    return (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full p-2 bg-gray-700 text-white rounded"
                placeholder="Search: 'find sword in cave'"
            />
            <button onClick={search} className="mt-2 px-4 py-2 bg-blue-600 rounded">Search</button>
            <ul className="mt-2 space-y-1">
                {results.map((r, i) => (
                    <li key={i} className="text-sm">{r.type}: {r.name} (Score: {Math.round((1 - r.vector_score) * 100)}%)</li>
                ))}
            </ul>
        </div>
    );
}