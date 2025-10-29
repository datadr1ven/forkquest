'use client';
import { useState } from 'react';
import { runMCP } from '@/lib/mcp';

interface Props { gameId: string; }

export default function MCPChat({ gameId }: Props) {
    const [messages, setMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);
    const [input, setInput] = useState('');

    const send = async () => {
        setMessages([...messages, { role: 'user', text: input }]);
        const res = await runMCP(input, gameId);
        setMessages(prev => [...prev, { role: 'agent', text: res.explanation }]);
        setInput('');
    };

    return (
        <div className="bg-gray-900 p-4 rounded-lg h-80 overflow-y-auto">
            <div className="space-y-2 mb-4">
                {messages.map((m, i) => (
                    <div key={i} className={`p-2 rounded ${m.role === 'user' ? 'bg-blue-600' : 'bg-green-600'}`}>
                        <strong>{m.role}:</strong> {m.text}
                    </div>
                ))}
            </div>
            <div className="flex">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 p-2 bg-gray-800 text-white rounded-l"
                    placeholder="Agent: Add a dragon boss..."
                />
                <button onClick={send} className="px-4 bg-purple-600 rounded-r">Send</button>
            </div>
        </div>
    );
}