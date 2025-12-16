import { ReactElement } from 'react';
import { GameState } from '../types/gameTypes';

interface StartRollPanelProps {
    gameState: GameState;
    onRoll: (playerId: number) => void;
    onResolve: () => void;
    onConfirm: () => void;
    myPlayerId: string | null; // e.g. "Player 1" or from gameState
}

export const StartRollPanel = ({ gameState, onRoll, onResolve, onConfirm }: StartRollPanelProps): ReactElement => {
    const players = gameState.players;
    const candidates = players.filter(p => !p.startRollEliminated);
    const allRolled = candidates.every(p => p.startRoll !== undefined);

    // Determine status
    let statusMessage = "Lanzando dados para decidir quién inicia...";
    let showResolveButton = false;
    let showConfirmButton = false;
    let winnerName = "";

    if (allRolled) {
        let max = 0;
        candidates.forEach(p => {
            if ((p.startRollTotal || 0) > max) max = p.startRollTotal || 0;
        });
        const winners = candidates.filter(p => (p.startRollTotal || 0) === max);

        if (winners.length === 1) {
            statusMessage = `¡${winners[0].name} comienza con un ${max}!`;
            winnerName = winners[0].name;
            showConfirmButton = true;
        } else {
            statusMessage = `¡Empate con ${max}! Los empatados deben lanzar de nuevo.`;
            showResolveButton = true;
        }
    }

    // Identify if *I* need to roll (and am active candidate)
    // Simple check: if local game (myPlayerId is generic or null) allow clicking any button
    // If online, check ID.
    // However, the action expects a playerId.
    // Let's just render the list.

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 200,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div style={{
                background: 'white', padding: '30px', borderRadius: '12px',
                width: '90%', maxWidth: '500px', textAlign: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
                <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>🎲 Tirada Inicial</h2>
                <p style={{ marginBottom: '20px', fontSize: '1.1em', color: '#7f8c8d' }}>
                    {statusMessage}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    {players.map(p => {
                        const isEliminated = p.startRollEliminated;
                        const hasRolled = p.startRoll !== undefined;
                        const isCandidate = !isEliminated;

                        return (
                            <div key={p.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px', borderRadius: '6px',
                                background: isEliminated ? '#f0f0f0' : (hasRolled ? '#e8f8f5' : '#fff'),
                                border: '1px solid #ddd',
                                opacity: isEliminated ? 0.6 : 1
                            }}>
                                <span style={{ fontWeight: 'bold', color: p.color === 'amarillo' ? '#f1c40f' : p.color }}>
                                    {p.name} {isEliminated && '(Eliminado)'}
                                </span>

                                {hasRolled ? (
                                    <span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>
                                        🎲 {p.startRoll?.[0]} + {p.startRoll?.[1]} = {p.startRollTotal}
                                    </span>
                                ) : (
                                    isCandidate ? (
                                        <button
                                            onClick={() => onRoll(p.id)}
                                            style={{
                                                padding: '6px 12px', background: '#3498db', color: 'white',
                                                border: 'none', borderRadius: '4px', cursor: 'pointer'
                                            }}
                                            disabled={p.isAI} // Bots auto-roll
                                        >
                                            {p.isAI ? '🤖 Esperando...' : 'Lanzar'}
                                        </button>
                                    ) : (
                                        <span>-</span>
                                    )
                                )}
                            </div>
                        );
                    })}
                </div>

                {showResolveButton && (
                    <button
                        onClick={onResolve}
                        style={{
                            padding: '12px 24px', fontSize: '1.1em', width: '100%',
                            background: '#e67e22', color: 'white', border: 'none',
                            borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        🔄 Desempatar
                    </button>
                )}

                {showConfirmButton && (
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '12px 24px', fontSize: '1.1em', width: '100%',
                            background: '#27ae60', color: 'white', border: 'none',
                            borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        🚀 ¡Comienza {winnerName}!
                    </button>
                )}
            </div>
        </div>
    );
};
