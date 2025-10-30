// components/InventoryPanel.tsx
'use client';
import { useState, useEffect } from 'react';

interface Item {
    id: string;
    name: string;
}

interface Props {
    gameId: string;
}

export default function InventoryPanel({ gameId }: Props) {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInventory = async () => {
        try {
            const res = await fetch(`/api/inventory?gameId=${gameId}`);
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
        const interval = setInterval(fetchInventory, 5000);
        return () => clearInterval(interval);
    }, [gameId]);

    if (loading) {
        return <div className="text-xs text-gray-400 animate-pulse">Loading…</div>;
    }

    if (items.length === 0) {
        return <div className="text-xs text-gray-500">Empty</div>;
    }

    return (
        <ul className="space-y-1 text-xs text-green-400">
            {items.map(item => (
                <li key={item.id}>• {item.name}</li>
            ))}
        </ul>
    );
}