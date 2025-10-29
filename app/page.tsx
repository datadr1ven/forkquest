'use client';
import { useState, useEffect } from 'react';

export default function Home() {
    const [gameId, setGameId] = useState<string | null>(null);
    const [forkTime, setForkTime] = useState<number | null>(null);
    const [currentView, setCurrentView] = useState<'play' | 'edit'>('play');

    const generateGame = async () => {
        const res = await fetch('/api/generate', { method: 'POST' });
        const { gameId: id } = await res.json();
        setGameId(id);
    };

    const handleFork = async () => {
        if (!gameId) return;
        const start = performance.now();
        const res = await fetch('/api/fork', {
            method: 'POST',
            body: JSON.stringify({ gameId }),
            headers: { 'Content-Type': 'application/json' }
        });
        const { newGameId, timeMs } = await res.json();
        setForkTime(timeMs);
        setGameId(newGameId);
    };

    useEffect(() => {
        // Load from URL param if shared
        const urlId = new URLSearchParams(window.location.search).get('game');
        if (urlId) setGameId(urlId);
    }, []);

    if (!gameId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
                <div className="text-center">
                    <h1 className="text-6xl font-bold text-white mb-8">ForkQuest</h1>
                    <p className="text-xl text-gray-300 mb-8">Zork, but you fork the universe.</p>
                    <button onClick={generateGame} className="px-8 py-4 bg-green-600 rounded-lg text-white font-bold hover:bg-green-700">
                        Start New Adventure
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Play/Edit Area */}
            <div className="lg:col-span-2">
                <div className="flex justify-between mb-4">
                    <h2 className="text-2xl font-bold">Your Quest: {currentView === 'play' ? 'Play' : 'Edit'}</h2>
                    <button onClick={() => setCurrentView(currentView === 'play' ? 'edit' : 'play')}>
                        Switch to {currentView === 'play' ? 'Edit' : 'Play'}
                    </button>
                </div>
                {currentView === 'play' ? <GamePlayArea gameId={gameId} /> : <EditMode gameId={gameId} />}
                <HybridSearchBar gameId={gameId} />
            </div>

            {/* Sidebar: MCP + Fork + Share */}
            <div className="space-y-4">
                <MCPChat gameId={gameId} />
                <button
                    onClick={handleFork}
                    className="w-full p-4 bg-yellow-600 rounded-lg text-white font-bold hover:bg-yellow-700"
                >
                    ⚡ Fork Universe {forkTime && `(${forkTime}ms)`}
                </button>
                <ShareLink gameId={gameId} />
                <iframe
                    src={`https://cloud.tigerdata.app/embed/${gameId}?theme=dark`}
                    className="w-full h-64 border rounded-lg"
                    title="Tiger Console"
                />
            </div>
        </div>
    );
}
