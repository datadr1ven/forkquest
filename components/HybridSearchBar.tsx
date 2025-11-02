// components/HybridSearchBar.tsx
'use client';
import { useState } from 'react';

export default function HybridSearchBar({ gameId }: { gameId: string }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Array<{ type: string; name: string; vector_score: number }>>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const search = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setError(null);
        setResults([]);

        try {
            const res = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query.trim(), gameId }),
            });

            if (!res.ok) throw new Error('Search failed');

            const data = await res.json();
            setResults(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-lg mb-3 text-cyan-400 font-bold">Hybrid Search</h2>

            <div className="flex gap-2 mb-3">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && search()}
                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm placeholder-gray-400"
                    placeholder="find glowing key, dragon boss..."
                />
                <button
                    onClick={search}
                    disabled={loading}
                    className="px-4 py-2 bg-cyan-600 text-white rounded text-sm hover:bg-cyan-700 disabled:opacity-50"
                >
                    {loading ? '...' : 'Search'}
                </button>
            </div>

            {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

            {results.length > 0 ? (
                <div className="space-y-2 text-xs">
                    {results.map((r, i) => (
                        <div key={i} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                            <span>
                                <strong className="text-cyan-300">{r.name}</strong>{' '}
                                <span className="text-gray-400">[{r.type}]</span>
                            </span>
                            <span className="text-green-400">score: {r.vector_score.toFixed(4)}</span>
                        </div>
                    ))}
                </div>
            ) : (
                !loading && query && <p className="text-gray-400 text-xs">No results found.</p>
            )}
        </div>
    );
}