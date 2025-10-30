'use client';
import { useState } from 'react';

interface Props {
    gameId: string;
}

export default function GamePlayArea({ gameId }: Props) {
    const [output, setOutput] = useState<string>(
        'You wake in a misty forest. Paths lead north to a cave, east to a river.'
    );
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCommand = async () => {
        if (!input.trim() || loading) return;

        const command = input.trim();
        setInput('');
        setLoading(true);

        // Append command
        setOutput(prev => `${prev}\n\n> ${command}`);

        try {
            const res = await fetch('/api/mcp-run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: command, gameId }),
            });

            if (!res.ok) throw new Error(await res.text());

            const { response } = await res.json();
            setOutput(prev => `${prev}\n\n${response}`);
        } catch (e: any) {
            setOutput(prev => `${prev}\n\n[Error: ${e.message}]`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-black text-green-400 p-6 rounded-lg font-mono text-sm h-96 overflow-y-auto flex flex-col">
            <div className="flex-1 overflow-y-auto mb-4 whitespace-pre-wrap">
                {output}
                {loading && <span className="animate-pulse"> █</span>}
            </div>
            <div className="flex gap-2">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCommand()}
                    disabled={loading}
                    placeholder="> go north"
                    className="flex-1 bg-transparent text-green-400 border-b border-green-400 outline-none placeholder-green-600"
                    autoFocus
                />
                <button
                    onClick={handleCommand}
                    disabled={loading}
                    className="px-3 text-green-400 hover:text-green-300 disabled:opacity-50"
                >
                    Enter
                </button>
            </div>
        </div>
    );
}