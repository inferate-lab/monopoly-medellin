import { useState } from 'react';
import { PlayerColor, Player } from '../types/gameTypes';

const AVAILABLE_NAMES = ['Esteban', 'Diana H', 'Margarita', 'Diana E', 'Diana S', 'Felipe', 'Alejo', 'Maryori'];
const AVAILABLE_COLORS: PlayerColor[] = ['amarillo', 'rojo', 'naranja', 'azul', 'verde', 'rosado', 'morado'];

interface SetupProps {
    onStartGame: (players: Player[]) => void;
    onCreateRoom: (playerName: string) => Promise<string>;
    onJoinRoom: (id: string, playerName: string) => void;
    onStartOnlineGame?: () => void;
    roomId?: string | null;
    myPeerId: string; // Used for "My ID" display, here we use it for player status
    isHost?: boolean;
    wsError?: string | null;
    onlinePlayers?: Player[]; // To show lobby list
}

export const SetupScreen = ({ onStartGame, onCreateRoom, onJoinRoom, onStartOnlineGame, roomId, isHost, wsError, onlinePlayers }: SetupProps) => {
    const [mode, setMode] = useState<'LOCAL' | 'ONLINE_MENU' | 'LOBBY'>('LOCAL');
    const [joinInput, setJoinInput] = useState('');
    const [myName, setMyName] = useState('Jugador 1');
    const [humanCount, setHumanCount] = useState(2);
    const [botCount, setBotCount] = useState(0);

    // Default to real names to prevent "Jugador 1" regression
    const [configs, setConfigs] = useState<{ name: string, color: PlayerColor }[]>([
        { name: 'Esteban', color: 'amarillo' },
        { name: 'Diana H', color: 'rojo' }
    ]);

    const handleHumanCountChange = (count: number) => {
        setHumanCount(count);
        const newConfigs = [...configs];
        if (count > configs.length) {
            for (let i = configs.length; i < count; i++) {
                newConfigs.push({
                    name: AVAILABLE_NAMES[i] || `Jugador ${i + 1}`,
                    color: AVAILABLE_COLORS[i % AVAILABLE_COLORS.length]
                });
            }
        } else {
            newConfigs.splice(count);
        }
        setConfigs(newConfigs);
        if (count + botCount > 8) setBotCount(8 - count);
    };

    const updateConfig = (idx: number, field: 'name' | 'color', value: string) => {
        const newConfigs = [...configs];
        newConfigs[idx] = { ...newConfigs[idx], [field]: value };
        setConfigs(newConfigs);
    };

    const validateStart = () => {
        if (humanCount < 1) return "Mínimo 1 jugador humano";
        const names = configs.map(c => c.name);
        if (names.some(n => !n || n.trim() === '')) return "Todos los nombres son requeridos";
        if (new Set(names).size !== names.length) return "Nombres duplicados";
        const colors = configs.map(c => c.color);
        if (new Set(colors).size !== colors.length) return "Colores duplicados";
        return null;
    };

    const handleStartLocal = () => {
        const error = validateStart();
        if (error) {
            alert(error);
            return;
        }

        const players: Player[] = [];
        configs.forEach((cfg, i) => {
            players.push({
                id: i,
                name: cfg.name,
                color: cfg.color,
                money: 1500,
                position: 0,
                isJailed: false,
                jailTurns: 0,
                properties: [],
                isAI: false,
                getOutOfJailFreeCards: 0,
                isBankrupt: false,
                heldCards: []
            });
        });

        const botNames = ['Robot 1', 'Robot 2', 'Robot 3', 'Robot 4', 'Robot 5', 'Robot 6'];
        const usedColors = new Set(configs.map(c => c.color));
        const availColors = AVAILABLE_COLORS.filter(c => !usedColors.has(c));

        for (let i = 0; i < botCount; i++) {
            players.push({
                id: players.length,
                name: botNames[i] || `Bot ${i + 1}`,
                color: availColors[i % availColors.length],
                money: 1500,
                position: 0,
                isJailed: false,
                jailTurns: 0,
                properties: [],
                isAI: true,
                getOutOfJailFreeCards: 0,
                isBankrupt: false,
                heldCards: []
            });
        }

        onStartGame(players);
    };

    const handleCreate = () => {
        if (!myName) return alert("Ingresa tu nombre");
        onCreateRoom(myName);
        setMode('LOBBY');
    };

    const handleJoin = () => {
        if (!myName) return alert("Ingresa tu nombre");
        if (joinInput) {
            onJoinRoom(joinInput, myName);
            setMode('LOBBY');
        }
    };

    if (mode === 'LOBBY') {
        return (
            <div className="setup-screen">
                <div className="setup-form">
                    <h1>Sala de Espera</h1>
                    {wsError && <p style={{ color: 'red' }}>{wsError}</p>}
                    <p>Room ID: <strong>{roomId || 'Conectando...'}</strong></p>
                    <hr />
                    <h3>Jugadores en sala:</h3>
                    <ul>
                        {onlinePlayers?.map(p => (
                            <li key={p.id} style={{ color: p.id === 1 ? 'gold' : 'white' }}>
                                {p.name} {p.id === 1 ? '(Host)' : ''}
                            </li>
                        ))}
                    </ul>
                    <hr />
                    {isHost ? (
                        <button onClick={onStartOnlineGame} disabled={!roomId}>Iniciar Partida Online</button>
                    ) : (
                        <p>Esperando al anfitrión...</p>
                    )}
                    <button onClick={() => setMode('LOCAL')}>Salir / Volver</button>
                </div>
            </div>
        );
    }

    if (mode === 'ONLINE_MENU') {
        const wsUrl = import.meta.env.VITE_WS_URL || 'No configurado (usando local)';
        return (
            <div className="setup-screen">
                <div className="setup-form">
                    <h1>Multijugador Online</h1>
                    <p style={{ fontSize: '0.8em', color: '#aaa' }}>Servidor: {wsUrl}</p>

                    <div style={{ marginBottom: '20px' }}>
                        <label>Tu Nombre:</label>
                        <input
                            value={myName}
                            onChange={e => setMyName(e.target.value)}
                            placeholder="Nombre"
                            style={{ padding: '10px', marginLeft: '10px', width: '200px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                        <button onClick={handleCreate}>Crear Nueva Partida</button>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                            <input
                                placeholder="ID de Sala"
                                value={joinInput}
                                onChange={e => setJoinInput(e.target.value)}
                                style={{ padding: '10px', flex: 1 }}
                            />
                            <button onClick={handleJoin} style={{ flex: 1 }}>Unirse a Sala</button>
                        </div>
                    </div>
                    <button onClick={() => setMode('LOCAL')} style={{ marginTop: '20px' }}>Volver</button>
                </div>
            </div>
        );
    }

    const startError = validateStart();

    return (
        <div className="setup-screen">
            <div className="setup-form">
                <h1>Monopoly Medellín - Deployed</h1>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label>Jugadores Humanos:</label>
                        <select value={humanCount} onChange={e => handleHumanCountChange(+e.target.value)}>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>Bots:</label>
                        <select value={botCount} onChange={e => setBotCount(+e.target.value)}>
                            {[0, 1, 2, 3, 4, 5, 6, 7].filter(n => n + humanCount <= 8).map(n =>
                                <option key={n} value={n}>{n}</option>
                            )}
                        </select>
                    </div>
                </div>

                {configs.map((cfg, i) => (
                    <div key={i} style={{ border: '1px solid #555', padding: '10px', marginBottom: '10px' }}>
                        <h4>Jugador {i + 1}</h4>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div>
                                <label>Nombre:</label>
                                <select value={cfg.name} onChange={e => updateConfig(i, 'name', e.target.value)}>
                                    {AVAILABLE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <div>
                                <label>Color:</label>
                                <select value={cfg.color} onChange={e => updateConfig(i, 'color', e.target.value as PlayerColor)}>
                                    {AVAILABLE_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                ))}

                {startError && <div style={{ color: 'red', marginBottom: '10px' }}>{startError}</div>}

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleStartLocal}
                        disabled={!!startError}
                        style={{ flex: 1, padding: '15px', fontSize: '1.2em' }}
                    >
                        Jugar Local
                    </button>
                    <button
                        onClick={() => setMode('ONLINE_MENU')}
                        style={{ flex: 1, padding: '15px', fontSize: '1.2em', background: '#8e44ad' }}
                    >
                        Jugar Online
                    </button>
                </div>
            </div>
        </div>
    );
};
