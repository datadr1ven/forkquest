'use client';
import { useState, useEffect } from 'react';
import AgentChat from '@/components/AgentChat';
import GamePlayArea from '@/components/GamePlayArea';
import HybridSearchBar from '@/components/HybridSearchBar';
import ShareLink from '@/components/ShareLink';

interface HealthData {
    status: 'OK' | 'ERROR';
    issues: string[];
    data: { games: string; rooms: string };
    timestamp: string;
}

export default function Home() {
    const [gameId, setGameId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [health, setHealth] = useState<HealthData | null>(null);

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

    useEffect(() => {
        const urlId = new URLSearchParams(window.location.search).get('game');
        if (urlId) setGameId(urlId);
    }, []);

    const generateGame = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/generate', { method: 'POST' });
            if (!res.ok) throw new Error(await res.text());
            const { gameId } = await res.json();
            setGameId(gameId);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFork = async () => {
        if (!gameId) return;
        try {
            const res = await fetch('/api/fork', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Fork failed');
            alert(`Forked in ${data.time}ms! New ID: ${data.newGameId}`);
            window.location.href = `/?game=${data.newGameId}`;
        } catch (err: any) {
            alert(`Fork failed: ${err.message}`);
        }
    };

    if (!gameId) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex flex-col items-center justify-center p-6">
                <div className="text-center max-w-2xl">
                    <h1 className="text-6xl font-bold text-white mb-6">ForkQuest</h1>
                    <p className="text-xl text-gray-200 mb-8">Zork, but you fork the universe.</p>

                    {health && (
                        <div className={`mb-6 p-3 rounded-lg text-sm font-mono ${health.status === 'OK' ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'}`}>
                            <strong>DB:</strong> {health.status}
                            {health.status === 'OK' ? (
                                <> | Games: {health.data.games} | Rooms: {health.data.rooms}</>
                            ) : (
                                <> | Issues: {health.issues.join(', ')}</>
                            )}
                        </div>
                    )}

                    {error && <div className="mb-4 p-3 bg-red-800 text-red-100 rounded-lg text-sm">{error}</div>}

                    <button
                        onClick={generateGame}
                        disabled={loading}
                        className="px-8 py-4 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Start New Adventure'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            {health && (
                <div className="mb-6 p-3 bg-gray-800 rounded-lg text-sm text-gray-300 font-mono flex justify-between">
                    <span>
                        <strong>DB:</strong> {health.status} | Games: {health.data.games} | Rooms: {health.data.rooms}
                    </span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <GamePlayArea gameId={gameId} />
                    <HybridSearchBar gameId={gameId} />
                </div>

                <div className="space-y-4">
                    <AgentChat gameId={gameId} />
                    <button
                        onClick={handleFork}
                        className="w-full p-4 bg-yellow-600 text-white font-bold rounded-lg hover:bg-yellow-700"
                    >
                        Fork Universe
                    </button>
                    <ShareLink gameId={gameId} />
                </div>
            </div>
        </div>
    );
}