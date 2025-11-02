'use client';
import { useState } from 'react';

export default function GamePlayArea({ gameId }: { gameId: string }) {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState<string[]>(['> Welcome to ForkQuest.']);

    // components/GamePlayArea.tsx
    const send = async (cmd: string) => {
        setOutput(p => [...p, `> ${cmd}`, 'Thinking...']);
        try {
            const res = await fetch('/api/player', {  // ← CHANGED
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: cmd, gameId }),
            });
            const { response } = await res.json();
            setOutput(p => {
                const n = [...p];
                n[n.length - 1] = response;
                return n;
            });
        } catch {
            setOutput(p => {
                const n = [...p];
                n[n.length - 1] = 'Agent error.';
                return n;
            });
        }
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            send(input.trim());
            setInput('');
        }
    };

    return (
        <div className="bg-black p-4 rounded h-96 overflow-y-auto mb-4 font-mono text-sm">
            {output.map((line, i) => (
                <div key={i} className="text-green-400">{line}</div>
            ))}
            <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    className="flex-1 bg-gray-800 text-green-400 px-4 py-2 rounded"
                    placeholder="go north, take sword..."
                />
                <button type="submit" className="px-4 py-2 bg-green-600 rounded">Send</button>
            </form>
        </div>
    );
}