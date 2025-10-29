'use client';
import { useState } from 'react';

interface Props { gameId: string; }

export default function GamePlayArea({ gameId }: Props) {
    const [output, setOutput] = useState('You wake in a misty forest. Paths lead north to a cave, east to a river.');
    const [input, setInput] = useState('');

    const handleCommand = async () => {
        // Simulate game logic + MCP for responses
        const res = await fetch('/api/mcp-run', {  // Extend API for game moves
            method: 'POST',
            body: JSON.stringify({ prompt: `Player says: ${input}`, gameId }),
        });
        const { response } = await res.json();
        setOutput(response);
        setInput('');
    };

    return (
        <div className="bg-black text-green-400 p-6 rounded-lg font-mono h-96 overflow-y-auto">
            <div>{output}</div>
            <div className="mt-4 flex">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-black text-green-400 border-b border-green-400 outline-none"
                    placeholder="> go north"
                />
                <button onClick={handleCommand} className="ml-2 text-green-400">Enter</button>
            </div>
        </div>
    );
}