'use client';
import { useState, useEffect } from 'react';
import AgentChat from '@/components/AgentChat';
import GamePlayArea from '@/components/GamePlayArea';
import HybridSearchBar from '@/components/HybridSearchBar';
import ShareLink from '@/components/ShareLink';
import InventoryPanel from '@/components/InventoryPanel';
import MapView from '@/components/MapView';

interface HealthData {
    status: 'OK' | 'ERROR';
    issues: string[];
    data: { games: string; rooms: string };
    timestamp: string;
}

interface GameInfo {
    id: string;
    title: string;
    updated_at: string;
}

const RECENT_KEY = 'forkquest_recent_games';
const MAX_RECENT = 5;

export default function Home() {
    const [gameId, setGameId] = useState<string | null>(null);
    const [forkTime, setForkTime] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [health, setHealth] = useState<HealthData | null>(null);
    const [joinInput, setJoinInput] = useState('');
    const [recentGames, setRecentGames] = useState<GameInfo[]>([]);
    const [allGames, setAllGames] = useState<GameInfo[]>([]);
    const [gamesLoading, setGamesLoading] = useState(true);

    // ----- Load recent games -----
    useEffect(() => {
        try {
            const stored = localStorage.getItem(RECENT_KEY);
            if (stored) setRecentGames(JSON.parse(stored).slice(0, MAX_RECENT));
        } catch (e) { }
    }, []);

    const addRecentGame = (id: string, title: string) => {
        const entry = { id, title, updated_at: new Date().toISOString() };
        setRecentGames(prev => {
            const filtered = prev.filter(g => g.id !== id);
            const updated = [entry, ...filtered].slice(0, MAX_RECENT);
            localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    // ----- Health check -----
    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const res = await fetch('/api/health');
                const data = await res.json();
                setHealth(data);
            } catch (err) { }
        };
        fetchHealth();
        const interval = setInterval(fetchHealth, 10000);
        return () => clearInterval(interval);
    }, []);

    // ----- Load game from URL -----
    useEffect(() => {
        const urlId = new URLSearchParams(window.location.search).get('game');
        if (urlId) {
            setGameId(urlId);
            fetchGameTitle(urlId).then(title => title && addRecentGame(urlId, title));
        }
    }, []);

    // ----- Fetch all games (for list) -----
    const fetchAllGames = async () => {
        setGamesLoading(true);
        try {
            const res = await fetch('/api/games');
            if (res.ok) {
                const data = await res.json();
                setAllGames(data.games);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setGamesLoading(false);
        }
    };

    useEffect(() => {
        fetchAllGames();
        const interval = setInterval(fetchAllGames, 15000);
        return () => clearInterval(interval);
    }, []);

    const fetchGameTitle = async (id: string): Promise<string | null> => {
        try {
            const res = await fetch(`/api/game-title?id=${id}`);
            if (res.ok) return (await res.json()).title;
        } catch (e) { }
        return null;
    };

    // app/page.tsx – replace ONLY the generateGame function
    const generateGame = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/generate', { method: 'POST' });

            // ---- DEBUG: Log raw response ----
            console.log('Generate response:', res.status, res.statusText);

            // ---- ALWAYS read body (even on error) ----
            const text = await res.text();
            console.log('Response body:', text);

            if (!res.ok) {
                // ---- Show real error from backend ----
                throw new Error(text || `HTTP ${res.status}`);
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error(`Invalid JSON: ${text}`);
            }

            if (!data.gameId) {
                throw new Error('No gameId in response');
            }

            setGameId(data.gameId);
            addRecentGame(data.gameId, 'New Adventure');
            await fetchAllGames(); // refresh list

            // Update URL
            window.history.replaceState(null, '', `?game=${data.gameId}`);

        } catch (e: any) {
            console.error('Generate failed:', e);
            setError(e.message || 'Failed to create game');
        } finally {
            setLoading(false);
        }
    };

    // ----- Join by input -----
    const joinGame = async () => {
        if (!joinInput.trim()) return;
        let id = joinInput.trim();
        try { const url = new URL(id); const p = url.searchParams.get('game'); if (p) id = p; } catch (_) { }
        if (!/^[0-9a-f-]{36}$/.test(id)) return setError('Invalid ID');
        setGameId(id);
        setJoinInput('');
        const title = await fetchGameTitle(id);
        addRecentGame(id, title || 'Joined Game');
        window.history.replaceState(null, '', `?game=${id}`);
    };

    // ----- Fork -----
    const handleFork = async () => {
        if (!gameId) return;
        const start = performance.now();
        const res = await fetch('/api/fork', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { newGameId, timeMs } = await res.json();
        setForkTime(timeMs);
        setGameId(newGameId);
        addRecentGame(newGameId, 'Forked Adventure');
        await fetchAllGames();
    };

    // ----- Load game (shared) -----
    const loadGame = (id: string) => {
        setGameId(id);
        window.history.replaceState(null, '', `?game=${id}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex flex-col items-center p-6">
            {/* ==== TOP BAR ==== */}
            <div className="w-full max-w-4xl text-center mb-8">
                <h1 className="text-6xl font-bold text-white mb-4">ForkQuest</h1>
                <p className="text-xl text-gray-200 mb-6">Zork, but you fork the universe.</p>

                {/* Join Input */}
                <div className="flex gap-2 justify-center mb-4">
                    <input
                        value={joinInput}
                        onChange={e => setJoinInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && joinGame()}
                        placeholder="Paste game ID or link…"
                        className="px-4 py-2 bg-white/10 text-white placeholder-gray-400 rounded-lg border border-white/20 focus:outline-none focus:border-white/50 w-80"
                        autoFocus={!gameId}
                    />
                    <button onClick={joinGame} className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700">
                        Join
                    </button>
                </div>

                {/* Clickable Game List */}
                <div className="mb-6">
                    <p className="text-sm text-gray-300 mb-2">
                        {gamesLoading ? 'Loading games…' : 'Existing Games:'}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto">
                        {allGames.length === 0 && !gamesLoading && (
                            <p className="text-xs text-gray-500">No games yet. Start one!</p>
                        )}
                        {allGames.map(g => (
                            <button
                                key={g.id}
                                onClick={() => loadGame(g.id)}
                                className="px-3 py-1 bg-white/10 text-white text-xs rounded hover:bg-white/20 transition flex items-center gap-1"
                                title={`Updated: ${new Date(g.updated_at).toLocaleString()}`}
                            >
                                <span className="truncate max-w-32">{g.title}</span>
                                <span className="opacity-50">#{g.id.slice(0, 8)}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Games */}
                {recentGames.length > 0 && (
                    <div className="mb-6">
                        <p className="text-sm text-gray-300 mb-2">Recent:</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {recentGames.map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => loadGame(g.id)}
                                    className="px-3 py-1 bg-white/10 text-white text-xs rounded hover:bg-white/20 transition"
                                >
                                    {g.title} #{g.id.slice(0, 8)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Health */}
                {health && (
                    <div className={`inline-block px-4 py-2 rounded-lg text-sm font-mono ${health.status === 'OK' ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'}`}>
                        <strong>DB:</strong> {health.status}
                        {health.status === 'OK' ? (
                            <> | Games: {health.data.games} | Rooms: {health.data.rooms}</>
                        ) : (
                            <> | Issues: {Array.isArray(health.issues) && health.issues.length ? health.issues.join(', ') : 'Check /api/health'}</>
                        )}
                    </div>
                )}
            </div>

            {/* ==== NO GAME ==== */}
            {!gameId && (
                <div className="text-center">
                    {error && (
                        <div className="mb-4 p-3 bg-red-800 text-red-100 rounded-lg text-sm inline-block">
                            {error}
                        </div>
                    )}
                    <button
                        onClick={generateGame}
                        disabled={loading}
                        className="px-8 py-4 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? 'Creating world…' : 'Start New Adventure'}
                    </button>
                </div>
            )}

            {/* ==== IN‑GAME ==== */}
            {gameId && (
                <div className="w-full max-w-7xl">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <GamePlayArea gameId={gameId} />
                            <HybridSearchBar gameId={gameId} />
                        </div>
                        <div className="space-y-4">
                            <AgentChat gameId={gameId} />
                            <InventoryPanel gameId={gameId} />
                            <MapView gameId={gameId} />
                            <button onClick={handleFork} className="w-full p-4 bg-yellow-600 text-white font-bold rounded-lg hover:bg-yellow-700">
                                Fork Universe {forkTime && `(${forkTime.toFixed(0)}ms)`}
                            </button>
                            <ShareLink gameId={gameId} />
                            <a
                                href={`https://console.tigerdata.com/services/${gameId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full p-3 bg-blue-600 text-white text-center rounded hover:bg-blue-700"
                            >
                                Open Tiger Console
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}