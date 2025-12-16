import { ReactElement } from 'react';
import { GameState } from '../types/gameTypes';

export const PlayerInfo = ({ gameState }: { gameState: GameState }): ReactElement => {
    return (
        <div className="sidebar-section">
            <h3>👥 Jugadores</h3>
            {gameState.players.map((player, idx) => {
                const isActive = idx === gameState.currentPlayerIndex;
                const ownedProps = gameState.board.filter(t => t.ownerId === player.id);

                return (
                    <div
                        key={player.id}
                        className={`player-card ${isActive ? 'active' : ''} ${player.isBankrupt ? 'bankrupt' : ''}`}
                        style={{ borderLeftColor: getColorHex(player.color) }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong>
                                {player.name}
                                {player.isAI && <span style={{ fontSize: '0.8em', marginLeft: '4px', opacity: 0.7 }}>🤖</span>}
                            </strong>
                            <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#27ae60' }}>
                                ${player.money}
                            </span>
                        </div>

                        <div style={{ fontSize: '0.85em', color: '#7f8c8d', marginTop: '4px' }}>
                            Posición: {gameState.board[player.position]?.name || player.position}
                        </div>

                        {player.isJailed && (
                            <div style={{ fontSize: '0.85em', color: '#e74c3c', marginTop: '2px' }}>
                                🔒 En cárcel (intento {player.jailTurns}/3)
                            </div>
                        )}

                        {player.isBankrupt && (
                            <div style={{ fontSize: '0.85em', color: '#c0392b', marginTop: '2px' }}>
                                💀 En quiebra
                            </div>
                        )}

                        {ownedProps.length > 0 && (
                            <div style={{ fontSize: '0.8em', color: '#34495e', marginTop: '4px' }}>
                                🏠 {ownedProps.length} propiedades
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

function getColorHex(color: string): string {
    const map: Record<string, string> = {
        amarillo: '#FFD700',
        rojo: '#FF0000',
        naranja: '#FFA500',
        azul: '#1E90FF',
        verde: '#32CD32',
        rosado: '#FF69B4',
        morado: '#9400D3'
    };
    return map[color] || '#888';
}
