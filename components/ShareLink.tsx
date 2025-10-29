'use client';
import { useEffect } from 'react';

interface Props { gameId: string; }

export default function ShareLink({ gameId }: Props) {
    const url = `${window.location.origin}?game=${gameId}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(url);
        alert('Link copied!');
    };

    return (
        <div className="p-4 bg-blue-900 rounded-lg">
            <p className="text-sm text-blue-200 mb-2">Share your quest:</p>
            <div className="flex">
                <input readOnly value={url} className="flex-1 p-2 bg-blue-800 text-white rounded-l" />
                <button onClick={copyToClipboard} className="px-4 bg-blue-600 rounded-r">Copy</button>
            </div>
        </div>
    );
}