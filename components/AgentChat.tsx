// components/AgentChat.tsx
'use client';
import { useState } from 'react';

export default function AgentChat({ gameId }: { gameId: string }) {
    const [input, setInput] = useState('');
    const [status, setStatus] = useState<string | null>(null);

    // components/AgentChat.tsx
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cmd = input.trim();
        if (!cmd) return;
        setInput('');
        setStatus('Sending...');

        try {
            const res = await fetch('/api/mcp', {  // ← CHANGED
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: cmd, gameId }),
            });
            const data = await res.json();
            setStatus(data.response || 'Done.');
        } catch {
            setStatus('MCP failed.');
        }
    };
    return (
        <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-lg mb-2 text-purple-400">MCP Chat</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    className="bg-gray-700 text-green-400 px-3 py-2 rounded text-sm"
                    placeholder="add dragon boss..."
                />
                <button type="submit" className="px-3 py-2 bg-purple-600 rounded text-sm hover:bg-purple-700">
                    Send MCP
                </button>
            </form>
            {status && <p className="mt-2 text-xs text-yellow-300">{status}</p>}
            <p className="mt-2 text-xs text-gray-400">
                Use: <code>add dragon boss</code>, <code>find glowing key</code>
            </p>
        </div>
    );
}