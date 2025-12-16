import { Component, ErrorInfo, ReactNode, useEffect, useState, useCallback } from 'react';
import { useGameState } from './hooks/useGameState';
import { SetupScreen } from './components/SetupScreen';
import { Board } from './components/Board';
import { PlayerInfo } from './components/PlayerInfo';
import { Controls } from './components/Controls';
import { CardModal } from './components/CardModal';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: string }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: '' };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error: error.toString() };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Error de ejecución:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: '#1a1a2e', color: '#fff',
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center',
                    padding: '20px', zIndex: 9999
                }}>
                    <h1 style={{ color: '#e74c3c', marginBottom: '20px' }}>Error de Ejecución</h1>
                    <p style={{ maxWidth: '600px', textAlign: 'center', marginBottom: '20px', color: '#bdc3c7' }}>
                        {this.state.error}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '12px 24px', fontSize: '1em',
                            background: '#3498db', border: 'none',
                            color: 'white', cursor: 'pointer', borderRadius: '6px'
                        }}
                    >
                        Recargar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

function ToastContainer({ toasts, clearToast }: { toasts: { id: number, message: string, type: string }[], clearToast: (id: number) => void }) {
    useEffect(() => {
        toasts.forEach(toast => {
            const timer = setTimeout(() => clearToast(toast.id), 3000);
            return () => clearTimeout(timer);
        });
    }, [toasts, clearToast]);

    if (toasts.length === 0) return null;

    return (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
            {toasts.slice(-3).map(toast => (
                <div
                    key={toast.id}
                    className={`toast ${toast.type}`}
                    onClick={() => clearToast(toast.id)}
                    style={{ marginBottom: '8px', cursor: 'pointer' }}
                >
                    {toast.message}
                </div>
            ))}
        </div>
    );
}

function GameContent() {
    const {
        gameState,
        setupGame,
        createRoom,
        joinRoom,
        startOnlineGame,
        myPeerId,
        roomId,
        isHost,
        wsError,
        rollDice,
        buyProperty,
        passProperty,
        nextTurn,
        payToLeaveJail,
        useJailCard,
        buildHouse,
        mortgageProperty,
        unmortgageProperty,
        payDebt,
        declareBankruptcy,
        confirmCard,
        clearToast,
        onPayRent
    } = useGameState();

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);

    if (gameState.uiError) {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.95)', zIndex: 9999, color: '#e74c3c',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center',
                padding: '20px'
            }}>
                <h2>Error del Estado de Juego</h2>
                <p style={{ maxWidth: '500px', textAlign: 'center', marginBottom: '20px' }}>
                    {gameState.uiError}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '12px 24px', fontSize: '1em',
                        background: '#c0392b', border: 'none',
                        color: 'white', cursor: 'pointer', borderRadius: '6px'
                    }}
                >
                    Reiniciar Juego
                </button>
            </div>
        );
    }

    if (gameState.gameStatus === 'SETUP' || gameState.gameStatus === 'LOBBY') {
        return (
            <SetupScreen
                onStartGame={setupGame}
                onCreateRoom={createRoom}
                onJoinRoom={joinRoom}
                onStartOnlineGame={startOnlineGame}
                roomId={roomId}
                myPeerId={myPeerId}
                isHost={isHost}
                wsError={wsError}
                onlinePlayers={gameState.players}
            />
        );
    }

    if (gameState.gameStatus === 'GAME_OVER') {
        const winner = gameState.players.find(p => !p.isBankrupt);
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center',
                color: 'white'
            }}>
                <h1 style={{ fontSize: '3em', marginBottom: '20px' }}>🏆 ¡Fin del Juego!</h1>
                <h2 style={{ fontSize: '2em', color: '#f39c12' }}>
                    Ganador: {winner?.name || 'Nadie'}
                </h2>
                <p style={{ marginTop: '20px', fontSize: '1.2em', color: '#bdc3c7' }}>
                    {winner ? `${winner.name} termina con $${winner.money}` : ''}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        marginTop: '30px', padding: '15px 30px', fontSize: '1.2em',
                        background: '#27ae60', border: 'none',
                        color: 'white', cursor: 'pointer', borderRadius: '8px'
                    }}
                >
                    Nueva Partida
                </button>
            </div>
        );
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    return (
        <div className={`game-container ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
            {/* Toasts */}
            <ToastContainer toasts={gameState.toasts} clearToast={clearToast} />

            {/* Card Modal */}
            {gameState.drawnCard && gameState.turnPhase === 'CARD_DRAWN' && currentPlayer && (
                <CardModal
                    card={gameState.drawnCard}
                    onConfirm={confirmCard}
                    playerName={currentPlayer.name}
                />
            )}

            <div className="board-container">
                <Board gameState={gameState} />
            </div>

            <button
                className="sidebar-toggle"
                onClick={toggleSidebar}
                title={isSidebarOpen ? "Ocultar panel" : "Mostrar panel"}
            >
                {isSidebarOpen ? '→' : '←'}
            </button>

            <div className={`sidebar ${!isSidebarOpen ? 'hidden' : ''}`}>
                <Controls
                    gameState={gameState}
                    onRollDice={rollDice}
                    onBuyProperty={buyProperty}
                    onPass={passProperty}
                    onNextTurn={nextTurn}
                    onPayJailFine={payToLeaveJail}
                    onUseJailCard={useJailCard}
                    onBuildHouse={buildHouse}
                    mortgageProperty={mortgageProperty}
                    unmortgageProperty={unmortgageProperty}
                    payDebt={payDebt}
                    declareBankruptcy={declareBankruptcy}
                    onPayRent={onPayRent}
                />
                <PlayerInfo gameState={gameState} />
            </div>
        </div>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <GameContent />
        </ErrorBoundary>
    );
}

export default App;
