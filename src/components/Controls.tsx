import { ReactElement, useState } from 'react';
import { GameState, Player, Tile } from '../types/gameTypes';
import { DicePair } from './Dice3D';

interface ControlsProps {
    gameState: GameState;
    onRollDice: () => void;
    onBuyProperty: () => void;
    onPass: () => void;
    onNextTurn: () => void;
    onBuildHouse: (tileIdx: number) => void;
    mortgageProperty: (tileIdx: number) => void;
    unmortgageProperty: (tileIdx: number) => void;
    payDebt: () => void;
    declareBankruptcy: () => void;
    onPayJailFine: () => void;
    onUseJailCard: () => void;
    onPayRent: () => void;
}

export const Controls = ({
    gameState,
    onRollDice,
    onBuyProperty,
    onPass,
    onNextTurn,
    onBuildHouse,
    mortgageProperty,
    unmortgageProperty,
    payDebt,
    declareBankruptcy,
    onPayJailFine,
    onUseJailCard,
    onPayRent
}: ControlsProps): ReactElement => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const currentTile = currentPlayer ? gameState.board[currentPlayer.position] : null;
    const isMyTurn = currentPlayer && !currentPlayer.isAI;
    const hasDebt = !!gameState.pendingDebt && gameState.pendingDebt.debtorId === currentPlayer?.id;

    if (!currentPlayer) {
        return <div className="sidebar-section controls">Cargando jugadores...</div>;
    }

    const hasJailCard = currentPlayer.heldCards?.some(c =>
        c.text.toLowerCase().includes('cárcel') || c.text.toLowerCase().includes('jail')
    );

    // Rent resolution
    if (gameState.turnPhase === 'RESOLVING_RENT' && gameState.rentDetails) {
        const { tileName, ownerName, totalRent, calculation } = gameState.rentDetails;
        return (
            <div className="sidebar-section controls error">
                <h3>🔔 Pago de Renta</h3>
                <div style={{ marginBottom: '10px' }}>
                    Has caído en <strong>{tileName}</strong>
                </div>
                <div style={{ marginBottom: '10px' }}>
                    Propiedad de: <strong>{ownerName}</strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '4px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.9em', opacity: 0.9 }}>{calculation}</div>
                    <div style={{ fontSize: '1.4em', fontWeight: 'bold' }}>Total: ${totalRent}</div>
                </div>

                {isMyTurn ? (
                    <button onClick={onPayRent} className="danger">
                        Pagar Renta
                    </button>
                ) : (
                    <div>Esperando a que {currentPlayer.name} pague...</div>
                )}
            </div>
        );
    }

    // Debt resolution mode
    if (hasDebt && gameState.pendingDebt) {
        const canPayNow = currentPlayer.money >= gameState.pendingDebt.amount;
        return (
            <div className="sidebar-section controls error">
                <h3>💸 ¡DEUDA PENDIENTE!</h3>
                <p><strong>Debe:</strong> ${gameState.pendingDebt.amount}</p>
                <p><strong>Razón:</strong> {gameState.pendingDebt.reason}</p>
                <p><strong>Dinero de {currentPlayer.name}:</strong> ${currentPlayer.money}</p>

                {isMyTurn && (
                    <>
                        <button onClick={payDebt} disabled={!canPayNow} className="success">
                            {canPayNow ? 'Pagar Deuda' : 'Sin Fondos Suficientes'}
                        </button>

                        <div style={{ fontSize: '0.85em', margin: '8px 0', opacity: 0.9 }}>
                            Hipoteca propiedades para obtener fondos.
                        </div>

                        <button onClick={declareBankruptcy} className="danger">
                            Declararse en Bancarrota
                        </button>
                    </>
                )}

                <PropertiesPanel
                    player={currentPlayer}
                    board={gameState.board}
                    mortgage={mortgageProperty}
                    unmortgage={unmortgageProperty}
                    showBuild={false}
                />
            </div>
        );
    }

    return (
        <div className="sidebar-section controls">
            <h3>
                🎲 Turno de {currentPlayer.name}
                {currentPlayer.isAI && <span style={{ fontSize: '0.75em', marginLeft: '6px', opacity: 0.7 }}>(Bot)</span>}
            </h3>

            {/* Doubles indicator */}
            {gameState.rolledDoubles && (
                <div className="doubles-badge">
                    ⚡ ¡Sacaste pares! Vuelve a lanzar.
                </div>
            )}

            {gameState.consecutiveDoubles > 0 && gameState.consecutiveDoubles < 3 && (
                <div style={{ background: '#f39c12', color: 'white', padding: '4px 8px', borderRadius: '4px', marginBottom: '8px', fontSize: '0.85em', textAlign: 'center' }}>
                    Pares consecutivos: {gameState.consecutiveDoubles}
                </div>
            )}

            <DicePair dice={gameState.dice} isRolling={false} />

            <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '0.95em' }}>
                Total: <strong style={{ fontSize: '1.2em' }}>{gameState.lastDiceTotal}</strong>
            </div>

            {/* Jail actions */}
            {currentPlayer.isJailed && isMyTurn && gameState.turnPhase === 'ROLLING' && (
                <div style={{ background: '#7f8c8d', padding: '10px', borderRadius: '6px', marginBottom: '10px', color: 'white' }}>
                    <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>🔒 {currentPlayer.name} está en la cárcel</div>
                    <div style={{ fontSize: '0.9em', marginBottom: '8px' }}>Intento {currentPlayer.jailTurns + 1} de 3</div>
                    <button onClick={onRollDice}>Intentar Sacar Pares</button>
                    {currentPlayer.money >= 50 && (
                        <button onClick={onPayJailFine} className="success">Pagar $50 de Fianza</button>
                    )}
                    {hasJailCard && (
                        <button onClick={onUseJailCard} style={{ background: '#9b59b6' }}>
                            🎟️ Usar Carta de Libertad
                        </button>
                    )}
                </div>
            )}

            {/* Normal roll */}
            {!currentPlayer.isJailed && isMyTurn && gameState.turnPhase === 'ROLLING' && (
                <button onClick={onRollDice} style={{ fontSize: '1.1em', padding: '12px' }}>
                    🎲 Lanzar Dados
                </button>
            )}

            {/* Card drawn - waiting for confirmation */}
            {gameState.turnPhase === 'CARD_DRAWN' && (
                <div style={{ background: '#8e44ad', color: 'white', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                    Esperando confirmación de carta...
                </div>
            )}

            {/* Buy decision */}
            {isMyTurn && gameState.turnPhase === 'BUY_DECISION' && currentTile && (
                <div style={{ border: '2px solid #3498db', padding: '12px', borderRadius: '8px', marginTop: '10px', background: '#ecf0f1' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '1.05em' }}>
                        ¿Comprar {currentTile.name}?
                    </div>
                    {renderTileStats(currentTile)}
                    <div style={{ marginBottom: '10px', marginTop: '10px' }}>Tu dinero: <strong>${currentPlayer.money}</strong></div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={onBuyProperty}
                            disabled={currentPlayer.money < (currentTile.price || 0)}
                            className="success"
                            style={{ flex: 1 }}
                        >
                            Comprar
                        </button>
                        <button onClick={onPass} className="danger" style={{ flex: 1 }}>
                            Pasar
                        </button>
                    </div>
                </div>
            )}

            {/* End turn */}
            {isMyTurn && gameState.turnPhase === 'ENDED' && (
                <button onClick={onNextTurn} style={{ marginTop: '10px' }}>
                    ➡️ Terminar Turno
                </button>
            )}

            {/* Player's held cards */}
            {isMyTurn && currentPlayer.heldCards && currentPlayer.heldCards.length > 0 && (
                <div className="cards-panel">
                    <h4>🎴 Mis Cartas ({currentPlayer.heldCards.length})</h4>
                    {currentPlayer.heldCards.map((card, i) => (
                        <div key={i} className="card-item">
                            {card.text}
                        </div>
                    ))}
                </div>
            )}

            {/* Properties management */}
            {isMyTurn && currentPlayer.properties.length > 0 && gameState.turnPhase !== 'CARD_DRAWN' && (
                <PropertiesPanel
                    player={currentPlayer}
                    board={gameState.board}
                    mortgage={mortgageProperty}
                    unmortgage={unmortgageProperty}
                    onBuild={onBuildHouse}
                    showBuild={true}
                />
            )}

            {/* Message log */}
            <div className="message-log">
                {gameState.messages.slice(0, 12).map((msg, i) => (
                    <div key={i} className="message">{msg}</div>
                ))}
            </div>
        </div>
    );
};

const renderTileStats = (t: Tile) => {
    if (!t.price) return null;
    return (
        <div style={{ fontSize: '0.85em', background: 'rgba(0,0,0,0.05)', padding: '6px', borderRadius: '4px' }}>
            <div>Precio: <strong>${t.price}</strong></div>
            {t.rent && <div>Renta Base: ${t.rent}</div>}
            {t.rentLevels && (
                <div style={{ marginTop: '4px', fontSize: '0.9em' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>1 Casa:</span> <span>${t.rentLevels[1]}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>2 Casas:</span> <span>${t.rentLevels[2]}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>3 Casas:</span> <span>${t.rentLevels[3]}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>4 Casas:</span> <span>${t.rentLevels[4]}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>HOTEL:</span> <span>${t.rentLevels[5]}</span></div>
                    <div style={{ borderTop: '1px solid #ccc', marginTop: '2px', paddingTop: '2px', fontStyle: 'italic' }}>
                        Costo Casa/Hotel: ${t.houseCost}
                    </div>
                </div>
            )}
        </div>
    );
};

interface PropertiesPanelProps {
    player: Player;
    board: Tile[];
    mortgage: (idx: number) => void;
    unmortgage: (idx: number) => void;
    onBuild?: (idx: number) => void;
    showBuild: boolean;
}

const PropertiesPanel = ({ player, board, mortgage, unmortgage, onBuild, showBuild }: PropertiesPanelProps): ReactElement | null => {
    const [expandedIds, setExpandedIds] = useState<number[]>([]);

    const toggleExpand = (id: number) => {
        setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    if (player.properties.length === 0) return null;

    return (
        <div style={{ marginTop: '12px' }}>
            <h4>🏠 Propiedades ({player.properties.length})</h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.82em' }}>
                {player.properties.map((idx: number) => {
                    const t = board[idx];
                    if (!t) return null;
                    const isExpanded = expandedIds.includes(idx);
                    const houseLabel = t.houseCount
                        ? (t.houseCount === 5 ? '🏨 Hotel' : `🏠 x${t.houseCount}`)
                        : '';
                    return (
                        <div
                            key={idx}
                            style={{
                                marginBottom: '5px',
                                padding: '6px',
                                background: t.isMortgaged ? '#e74c3c' : '#ecf0f1',
                                color: t.isMortgaged ? 'white' : '#2c3e50',
                                border: '1px solid #bdc3c7',
                                borderRadius: '4px'
                            }}
                        >
                            <div
                                style={{ fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                                onClick={() => toggleExpand(idx)}
                            >
                                <span>{t.name} {houseLabel}</span>
                                <span>{isExpanded ? '▼' : '▶'}</span>
                            </div>

                            {t.isMortgaged && <div style={{ fontSize: '0.8em', fontStyle: 'italic' }}>[Hipotecada]</div>}

                            {isExpanded && (
                                <div style={{ marginTop: '6px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '4px' }}>
                                    {renderTileStats(t)}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                {t.isMortgaged ? (
                                    <button onClick={() => unmortgage(idx)} style={{ fontSize: '0.75em', padding: '3px 6px', flex: 1 }}>
                                        Levantar Hipoteca
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={() => mortgage(idx)} style={{ fontSize: '0.75em', padding: '3px 6px', background: '#e67e22', flex: 1 }}>
                                            Hipotecar
                                        </button>
                                        {showBuild && onBuild && t.type === 'PROPERTY' && (t.houseCount || 0) < 5 && (
                                            <button
                                                onClick={() => onBuild(idx)}
                                                style={{ fontSize: '0.75em', padding: '3px 6px', background: '#8e44ad', flex: 1 }}
                                                title={`Costo: $${t.houseCost}`}
                                            >
                                                {(t.houseCount || 0) === 4 ? `+Hotel ($${t.houseCost})` : `+Casa ($${t.houseCost})`}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
