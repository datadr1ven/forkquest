'use client';
import { useState, useEffect } from 'react';
import GamePlayArea from '@/components/GamePlayArea';
import ShareLink from '@/components/ShareLink';

interface HealthData {
    status: 'OK' | 'ERROR' | 'INITIALIZING';
    data?: { games: string; rooms: string };
}

export default function Home() {
    const [gameId, setGameId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [health, setHealth] = useState<HealthData | null>(null);
    const [joinInput, setJoinInput] = useState('');

    // Health
    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const res = await fetch('/api/health');
                const data = await res.json();
                setHealth(data);
            } catch { }
        };
        fetchHealth();
        const interval = setInterval(fetchHealth, 10000);
        return () => clearInterval(interval);
    }, []);

    // Load from URL
    useEffect(() => {
        const urlId = new URLSearchParams(window.location.search).get('game');
        if (urlId) setGameId(urlId);
    }, []);

    // Generate
    const generateGame = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/generate', { method: 'POST' });
            const text = await res.text();
            if (!res.ok) throw new Error(text);
            const { gameId } = JSON.parse(text);
            setGameId(gameId);
            window.history.replaceState(null, '', `?game=${gameId}`);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // Join
    const joinGame = () => {
        let id = joinInput.trim();
        try { const url = new URL(id); const p = url.searchParams.get('game'); if (p) id = p; } catch { }
        if (/^[0-9a-f-]{36}$/.test(id)) {
            setGameId(id);
            setJoinInput('');
            window.history.replaceState(null, '', `?game=${id}`);
        } else {
            setError('Invalid ID');
        }
    };

    // Fork
    const handleFork = async () => {
        if (!gameId) return;
        const res = await fetch('/api/fork', {
            method: 'POST',
            body: JSON.stringify({ gameId }),
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) return setError(await res.text());
        const { newGameId } = await res.json();
        setGameId(newGameId);
        window.history.replaceState(null, '', `?game=${newGameId}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white font-sans">

            {/* ===== HEADER ===== */}
            <header className="p-6 text-center">
                <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
                    ForkQuest
                </h1>
                <p className="mt-2 text-sm text-gray-400">Zork + TigerData = Forkable Worlds</p>

                {/* Join Bar */}
                <div className="mt-6 flex justify-center gap-2 max-w-md mx-auto">
                    <input
                        value={joinInput}
                        onChange={e => setJoinInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && joinGame()}
                        placeholder="Paste game link…"
                        className="flex-1 px-4 py-2 bg-white/5 backdrop-blur border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                    <button onClick={joinGame} className="px-4 py-2 bg-cyan-600 rounded-lg text-sm font-medium hover:bg-cyan-500 transition">
                        Join
                    </button>
                </div>
            </header>

            {/* ===== NO GAME ===== */}
            {!gameId && (
                <main className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        {error && (
                            <p className="mb-4 text-red-400 text-sm">{error}</p>
                        )}
                        <button
                            onClick={generateGame}
                            disabled={loading}
                            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition disabled:opacity-50"
                        >
                            {loading ? 'Creating…' : 'Start New Adventure'}
                        </button>
                    </div>
                </main>
            )}

            {/* ===== IN-GAME ===== */}
            {gameId && (
                <>
                    {/* Gameplay */}
                    <section className="p-6">
                        <div className="max-w-4xl mx-auto glass-panel p-6 rounded-2xl">
                            <GamePlayArea gameId={gameId} />
                        </div>
                    </section>

                    {/* Controls */}
                    <section className="px-6 pb-6">
                        <div className="max-w-4xl mx-auto flex flex-wrap gap-3 justify-center">
                            <button
                                onClick={handleFork}
                                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold rounded-xl shadow hover:shadow-lg transform hover:scale-105 transition"
                            >
                                Fork Universe
                            </button>
                            <div className="px-6 py-3 bg-white/5 backdrop-blur border border-white/10 rounded-xl">
                                <ShareLink gameId={gameId} />
                            </div>
                            <a
                                href={`https://console.tigerdata.com/services/${gameId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow hover:shadow-lg transform hover:scale-105 transition"
                            >
                                Tiger Console
                            </a>
                        </div>
                    </section>

                    {/* Debug Bar */}
                    <footer className="px-6 pb-8">
                        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs font-mono">
                            <div className={`px-3 py-1 rounded-full ${health?.status === 'OK' ? 'bg-green-900/50 text-green-300' :
                                    health?.status === 'INITIALIZING' ? 'bg-yellow-900/50 text-yellow-300' :
                                        'bg-red-900/50 text-red-300'
                                }`}>
                                DB: {health?.status === 'OK' ? `OK • ${health.data?.games}G • ${health.data?.rooms}R` : health?.status}
                            </div>
                            <div className="text-gray-500">
                                Game ID: <span className="font-mono">{gameId.slice(0, 8)}</span>
                            </div>
                        </div>
                    </footer>
                </>
            )}
        </div>
    );
}