'use client';
import { useState } from 'react';

interface Props { gameId: string; }

export default function AgentChat({ gameId }: Props) {
    const [messages, setMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);
    const [input, setInput] = useState('');

    const send = async () => {
        if (!input.trim()) return;
        setMessages(prev => [...prev, { role: 'user', text: input }]);

        const res = await fetch('/api/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: input, gameId }),
        });
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'agent', text: data.explanation || 'Done.' }]);
        setInput('');
    };

    return (
        <div className="bg-gray-900 p-4 rounded-lg">
            <h3 className="text-white font-bold mb-2">Agent (MCP-Style)</h3>
            <div className="h-48 overflow-y-auto mb-2 space-y-1 text-sm">
                {messages.map((m, i) => (
                    <div key={i} className={`p-2 rounded ${m.role === 'user' ? 'bg-blue-600' : 'bg-green-600'} text-white`}>
                        <strong>{m.role}:</strong> {m.text}
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && send()}
                    className="flex-1 p-2 bg-gray-800 text-white rounded"
                    placeholder="Add dragon..."
                />
                <button onClick={send} className="px-4 bg-purple-600 text-white rounded">Send</button>
            </div>
        </div>
    );
}