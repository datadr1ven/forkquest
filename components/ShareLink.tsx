'use client';
import { useState } from 'react';

export default function ShareLink({ gameId }: { gameId: string }) {
    const [copied, setCopied] = useState(false);
    const url = `${window.location.origin}/?game=${gameId}`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            alert('Copy failed');
        }
    };

    return (
        <div className="p-4 bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-300 mb-2">Share Game:</p>
            <div className="flex gap-2">
                <input
                    readOnly
                    value={url}
                    className="flex-1 bg-gray-700 text-gray-300 px-3 py-2 rounded text-xs font-mono truncate"
                />
                <button
                    onClick={copy}
                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
        </div>
    );
}