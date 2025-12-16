import { useState, useEffect, useReducer, useRef, useCallback } from 'react';
import { GameState, Player } from '../types/gameTypes';
import { initialBoardData } from '../data/boardData';
import { gameReducer, initialGameState } from '../state/reducer';
import { NetworkActionType, ActionPayload } from '../net/protocol';
import { WebSocketClient } from '../net/wsClient';

// Singleton WS Client
let wsClient: WebSocketClient | null = null;

const WS_URL = import.meta.env.VITE_WS_URL || 'wss://monopoly-server.onrender.com'; // Default or Env

export const useGameState = () => {
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [myPlayerId, setMyPlayerId] = useState<number | null>(null);
    const [wsError, setWsError] = useState<string | null>(null);
    const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [state, reactDispatch] = useReducer((s: GameState, a: { type: string; payload?: unknown }) => {
        if (a.type === '__SYNC__') return a.payload as GameState;
        if (typeof a.type === 'string') {
            return gameReducer(s, a.type as NetworkActionType, a.payload as ActionPayload | undefined);
        }
        return s;
    }, { ...initialGameState, board: initialBoardData, toasts: [] });

    const stateRef = useRef(state);
    stateRef.current = state;

    // Initialize WS Client once
    useEffect(() => {
        if (!wsClient && WS_URL) {
            wsClient = new WebSocketClient(
                (newState) => {
                    reactDispatch({ type: '__SYNC__', payload: newState });
                },
                (errorMsg) => {
                    setWsError(errorMsg);
                    console.error("WS Error:", errorMsg);
                },
                (rId, pId) => {
                    setRoomId(rId);
                    setMyPlayerId(pId);
                    // If I created the room (player 1), I am host
                    setIsHost(pId === 1);
                }
            );
            // Auto connect if URL is present? Or wait for user action? 
            // Better to connect on load or when entering online menu.
            // For now, let's connect on init to be ready.
            try {
                wsClient.connect(WS_URL);
            } catch (e) {
                console.error("Failed to connect WS", e);
            }
        }
    }, []);

    const dispatch = useCallback((type: NetworkActionType, payload?: ActionPayload) => {
        if (roomId && wsClient) {
            // Online Mode
            wsClient.sendGameAction(type, payload);
        } else {
            // Local Mode
            reactDispatch({ type, payload });
        }
    }, [roomId]);

    // Bot automation (Local only or Host only)
    useEffect(() => {
        if (botTimeoutRef.current) {
            clearTimeout(botTimeoutRef.current);
            botTimeoutRef.current = null;
        }

        if (state.gameStatus !== 'PLAYING') return;
        if (state.players.length === 0) return;

        // Bots run if:
        // 1. Local game (!roomId)
        // 2. Online game AND I am host (isHost)
        if (roomId && !isHost) return;

        const currentPlayer = state.players[state.currentPlayerIndex];
        if (!currentPlayer || !currentPlayer.isAI) return;

        const getDelay = () => {
            if (state.turnPhase === 'CARD_DRAWN' || state.turnPhase === 'RESOLVING_RENT') return 1500;
            if (state.turnPhase === 'ROLLING') return 800;
            return 600;
        };

        botTimeoutRef.current = setTimeout(() => {
            const s = stateRef.current;
            const player = s.players[s.currentPlayerIndex];
            if (!player || !player.isAI || s.gameStatus !== 'PLAYING') return;

            // ... Bot logic (kept same as before) ...
            if (s.turnPhase === 'CARD_DRAWN' && s.drawnCard) {
                dispatch('CONFIRM_CARD');
                return;
            }

            if (s.turnPhase === 'RESOLVING_RENT') {
                dispatch('PAY_RENT');
                return;
            }

            if (s.pendingDebt && s.pendingDebt.debtorId === player.id) {
                if (player.money >= s.pendingDebt.amount) {
                    dispatch('PAY_DEBT');
                } else {
                    const unmortgagedProp = s.board.find(t =>
                        t.ownerId === player.id && !t.isMortgaged && !t.houseCount
                    );
                    if (unmortgagedProp) {
                        dispatch('MORTGAGE_TILE', { tileId: unmortgagedProp.index });
                    } else {
                        dispatch('DECLARE_BANKRUPTCY');
                    }
                }
                return;
            }

            if (s.turnPhase === 'ROLLING') {
                if (player.isJailed && player.heldCards?.some(c => c.text.includes('cárcel'))) {
                    dispatch('USE_JAIL_CARD');
                    return;
                }
                dispatch('ROLL_DICE');
            } else if (s.turnPhase === 'BUY_DECISION') {
                const tile = s.board[player.position];
                if (tile.price && player.money >= tile.price * 1.5) {
                    dispatch('BUY_TILE');
                } else {
                    dispatch('PASS_BUY');
                }
            } else if (s.turnPhase === 'ENDED') {
                dispatch('END_TURN');
            }
        }, getDelay());

        return () => {
            if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
        };
    }, [state.version, state.gameStatus, state.currentPlayerIndex, state.turnPhase, roomId, isHost, dispatch]);

    // Actions
    const canAct = useCallback(() => {
        if (!state.players || state.players.length === 0) return false;

        // Online: can only act if it's my turn
        if (roomId && myPlayerId !== null) {
            const currentPlayer = state.players[state.currentPlayerIndex];
            if (currentPlayer.id !== myPlayerId) return false;
        }

        return true;
    }, [state.players, state.currentPlayerIndex, roomId, myPlayerId]);

    const setupGame = useCallback((players: Player[]) => {
        // Local setup
        const playersWithCards = players.map(p => ({ ...p, heldCards: [] }));
        reactDispatch({ type: 'SET_PLAYERS', payload: { players: playersWithCards } });
        setTimeout(() => reactDispatch({ type: 'START_GAME' }), 50);
    }, []);

    const createRoom = useCallback(async (playerName: string) => {
        if (wsClient) wsClient.createRoom(playerName);
        return Promise.resolve(""); // WS is async, we wait for callback
    }, []);

    const joinRoom = useCallback(async (id: string, playerName: string) => {
        if (wsClient) wsClient.joinRoom(id, playerName);
    }, []);

    // Start Online Game (Host only)
    const startOnlineGame = useCallback(() => {
        if (wsClient && isHost) {
            wsClient.sendGameAction('START_GAME');
        }
    }, [isHost]);

    return {
        gameState: state,
        myPeerId: myPlayerId ? `Player ${myPlayerId}` : '',
        roomId,
        isHost,
        wsError,
        createRoom,
        joinRoom,
        setupGame,
        startOnlineGame,
        rollDice: () => { if (canAct()) dispatch('ROLL_DICE'); },
        buyProperty: () => { if (canAct()) dispatch('BUY_TILE'); },
        passProperty: () => { if (canAct()) dispatch('PASS_BUY'); },
        nextTurn: () => { if (canAct()) dispatch('END_TURN'); },
        payToLeaveJail: () => { if (canAct()) dispatch('PAY_JAIL_FINE'); },
        useJailCard: () => { if (canAct()) dispatch('USE_JAIL_CARD'); },
        buildHouse: (tileId: number) => { if (canAct()) dispatch('BUILD_HOUSE', { tileId }); },
        mortgageProperty: (tileId: number) => { if (canAct()) dispatch('MORTGAGE_TILE', { tileId }); },
        unmortgageProperty: (tileId: number) => { if (canAct()) dispatch('UNMORTGAGE_TILE', { tileId }); },
        payDebt: () => { if (canAct()) dispatch('PAY_DEBT'); },
        declareBankruptcy: () => { if (canAct()) dispatch('DECLARE_BANKRUPTCY'); },
        confirmCard: () => { dispatch('CONFIRM_CARD'); },
        clearToast: (id: number) => { dispatch('CLEAR_TOAST', { toastId: id }); },
        onPayRent: () => { dispatch('PAY_RENT'); }
    };
};
