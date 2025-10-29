'use client';
import { useState, useEffect } from 'react';

interface Props { gameId: string; }

export default function EditMode({ gameId }: Props) {
    const [objects, setObjects] = useState<any[]>([]);

    useEffect(() => {
        // Fetch rooms/items etc.
        fetchObjects();
    }, [gameId]);

    const fetchObjects = async () => {
        // API call to list game objects
        const res = await fetch(`/api/objects?gameId=${gameId}`);
        setObjects(await res.json());
    };

    return (
        <div className="grid grid-cols-2 gap-4">
            {objects.map(obj => (
                <div key={obj.id} className="p-4 bg-gray-800 rounded">
                    <h3>{obj.name}</h3>
                    <p>{obj.description}</p>
                    <button className="mt-2 text-xs text-red-400">Delete</button>
                </div>
            ))}
        </div>
    );
}