// components/MapView.tsx
'use client';
import { useState, useEffect } from 'react';

interface Room {
    id: string;
    name: string;
    x: number;
    y: number;
    isCurrent: boolean;
}

interface Connection {
    from: string;
    to: string;
}

interface Props {
    gameId: string;
}

export default function MapView({ gameId }: Props) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMap = async () => {
        try {
            const res = await fetch(`/api/map?gameId=${gameId}`);
            if (res.ok) {
                const data = await res.json();
                setRooms(data.rooms || []);
                setConnections(data.connections || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMap();
        const interval = setInterval(fetchMap, 8000);
        return () => clearInterval(interval);
    }, [gameId]);

    if (loading) {
        return (
            <div className="text-xs text-gray-400 animate-pulse">
                Loading map…
            </div>
        );
    }

    if (rooms.length === 0) {
        return (
            <div className="text-xs text-gray-500">
                No rooms yet.
            </div>
        );
    }

    return (
        <div className="w-full h-48 bg-black/50 rounded-lg overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 300 200">
                {/* Connections */}
                {connections.map((c, i) => {
                    const from = rooms.find(r => r.id === c.from);
                    const to = rooms.find(r => r.id === c.to);
                    if (!from || !to) return null;
                    return (
                        <line
                            key={i}
                            x1={from.x}
                            y1={from.y}
                            x2={to.x}
                            y2={to.y}
                            stroke="#666"
                            strokeWidth="2"
                        />
                    );
                })}

                {/* Rooms */}
                {rooms.map(room => (
                    <g key={room.id}>
                        <circle
                            cx={room.x}
                            cy={room.y}
                            r={room.isCurrent ? 14 : 10}
                            fill={room.isCurrent ? '#10b981' : '#6b7280'}
                            stroke="#fff"
                            strokeWidth="2"
                        />
                        <text
                            x={room.x}
                            y={room.y + 4}
                            textAnchor="middle"
                            className="fill-white text-xs font-medium"
                            style={{ fontSize: '10px' }}
                        >
                            {room.name.slice(0, 12)}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}