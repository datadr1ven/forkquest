// components/InventoryPanel.tsx
'use client';
import { useState, useEffect } from 'react';

interface Item {
    id: string;
    name: string;
    description: string;
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
                setItems(data.items);
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

    if (loading) return <div className="text-xs text-gray-400">Loading inventory…</div>;

    return (
        <div className="bg-gray-900 p-4 rounded-lg">
            <h3 className="text-sm font-bold text-yellow-400 mb-2">Inventory</h3>
            {items.length === 0 ? (
                <p className="text-xs text-gray-500">Empty</p>
            ) : (
                <ul className="space-y-1">
                    {items.map(item => (
                        <li key={item.id} className="text-xs text-green-400">
                            {item.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}