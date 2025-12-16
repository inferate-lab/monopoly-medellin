import type { GameState, Toast } from '../types/gameTypes';
import { NetworkActionType, ActionPayload } from '../net/protocol';
import { getRent, getMortgageValue, getUnmortgageCost, canBuildHouse } from './economy';
import { fortunaCards, arcaComunalCards, Card } from '../data/cardData';

let toastId = 0;

export const initialGameState: GameState = {
    version: 0,
    players: [],
    currentPlayerIndex: 0,
    board: [],
    dice: [1, 1],
    lastDiceTotal: 0,
    turnPhase: 'ROLLING',
    gameStatus: 'SETUP',
    messages: [],
    consecutiveDoubles: 0,
    rolledDoubles: false,
    chanceDeck: [],
    communityChestDeck: [],
    toasts: [],
    rentDetails: undefined
};

function rollDie(): number {
    return Math.floor(Math.random() * 6) + 1;
}

function shuffleDeck(cards: Card[]): number[] {
    const ids = cards.map(c => c.id);
    for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids;
}

function addToast(state: GameState, message: string, type: Toast['type']) {
    state.toasts = [...state.toasts, { id: ++toastId, message, type }];
}

function createDebt(state: GameState, debtorId: number, creditorId: number | null, amount: number, reason: string) {
    const debtor = state.players.find(p => p.id === debtorId);
    if (!debtor) return;

    if (debtor.money >= amount) {
        state.players = state.players.map(p =>
            p.id === debtorId ? { ...p, money: p.money - amount } : p
        );
        if (creditorId !== null) {
            const creditor = state.players.find(p => p.id === creditorId);
            state.players = state.players.map(p =>
                p.id === creditorId ? { ...p, money: p.money + amount } : p
            );
            state.messages = [`💵 ${debtor.name} pagó $${amount} a ${creditor?.name || 'acreedor'} (${reason}).`, ...state.messages];
            addToast(state, `${debtor.name} pagó $${amount} a ${creditor?.name}`, 'info');
        } else {
            state.messages = [`💵 ${debtor.name} pagó $${amount} al banco (${reason}).`, ...state.messages];
            addToast(state, `${debtor.name} pagó $${amount}`, 'info');
        }
        // Should we change turn phase? No, usually function caller decides, but here we persist simplicity
        // Wait, the original createDebt updated turnPhase?
        // Let's check original logic. Yes: state.turnPhase = state.rolledDoubles ? 'ROLLING' : 'ENDED';
        // But only if successful payment. If failed, it went to BANKRUPTCY_RESOLUTION.
        state.turnPhase = state.rolledDoubles ? 'ROLLING' : 'ENDED';
    } else {
        state.pendingDebt = { debtorId, creditorId, amount, reason };
        state.messages = [`⚠️ ${debtor.name} debe $${amount} (${reason}) pero no tiene suficiente.`, ...state.messages];
        addToast(state, `${debtor.name} no tiene suficiente dinero`, 'error');
        state.turnPhase = 'BANKRUPTCY_RESOLUTION';
    }
}

export const gameReducer = (state: GameState, actionType: NetworkActionType, payload?: ActionPayload): GameState => {
    let newState: GameState = { ...state, version: state.version + 1, uiError: undefined };

    if (newState.toasts.length > 3) {
        newState.toasts = newState.toasts.slice(-3);
    }

    const log = (msg: string) => {
        newState.messages = [msg, ...newState.messages].slice(0, 50);
    };

    if (actionType === 'CLEAR_TOAST') {
        if (payload?.toastId !== undefined) {
            newState.toasts = newState.toasts.filter(t => t.id !== payload.toastId);
        }
        return newState;
    }

    if (actionType === 'SET_PLAYERS') {
        if (payload?.players && payload.players.length > 0) {
            // Also initialize decks here to be ready
            const chanceIds = shuffleDeck(fortunaCards);
            const chestIds = shuffleDeck(arcaComunalCards);

            const playersWithCards = payload.players.map(p => ({
                ...p,
                heldCards: p.heldCards || [],
                startRoll: p.startRoll ?? null,
                startRollTotal: p.startRollTotal ?? null,
                startRollEliminated: p.startRollEliminated ?? false
            }));
            return {
                ...newState,
                players: playersWithCards,
                currentPlayerIndex: 0,
                gameStatus: 'SETUP',
                turnPhase: 'ROLLING',
                consecutiveDoubles: 0,
                rolledDoubles: false,
                chanceDeck: chanceIds,
                communityChestDeck: chestIds,
                toasts: [],
                messages: [`${playersWithCards.length} jugadores listos para jugar.`, ...newState.messages]
            };
        }
        return { ...newState, uiError: "Error: SET_PLAYERS requiere array de jugadores válido." };
    }

    if (actionType === 'START_GAME') {
        if (!newState.players || newState.players.length === 0) {
            return { ...newState, uiError: "No se puede iniciar: sin jugadores definidos." };
        }
        newState.gameStatus = 'PLAYING';
        newState.turnPhase = 'ROLLING';
        newState.currentPlayerIndex = 0;
        newState.consecutiveDoubles = 0;
        newState.rolledDoubles = false;

        // Safety: Ensure decks are shuffled if not already
        if (newState.chanceDeck.length === 0) newState.chanceDeck = shuffleDeck(fortunaCards);
        if (newState.communityChestDeck.length === 0) newState.communityChestDeck = shuffleDeck(arcaComunalCards);

        const firstPlayer = newState.players[0];
        log(`¡Comienza la partida! Turno de ${firstPlayer.name}.`);
        return newState;
    }

    if (actionType === 'CONFIRM_CARD') {
        if (newState.drawnCard) {
            applyCardEffect(newState);
            newState.drawnCard = undefined;
        }
        return newState;
    }

    if (actionType === 'USE_JAIL_CARD') {
        const player = newState.players[newState.currentPlayerIndex];
        if (player && player.isJailed && player.heldCards.length > 0) {
            const jailCard = player.heldCards.find(c =>
                c.text.toLowerCase().includes('cárcel') || c.text.toLowerCase().includes('jail')
            );
            if (jailCard) {
                // Return card to bottom of deck
                if (jailCard.deckType === 'CHANCE') {
                    newState.chanceDeck = [...newState.chanceDeck, jailCard.id];
                } else {
                    newState.communityChestDeck = [...newState.communityChestDeck, jailCard.id];
                }

                newState.players = newState.players.map(p =>
                    p.id === player.id ? {
                        ...p,
                        isJailed: false,
                        jailTurns: 0,
                        heldCards: p.heldCards.filter(c => c.id !== jailCard.id)
                    } : p
                );
                log(`🎟️ ${player.name} usó su carta "Salir de la cárcel gratis".`);
                addToast(newState, `${player.name} usó carta de libertad`, 'success');
                newState.turnPhase = 'ROLLING';
            }
        }
        return newState;
    }

    if (!newState.players || newState.players.length === 0) return newState;
    const currentPlayer = newState.players[newState.currentPlayerIndex];
    if (!currentPlayer) return newState;
    const pName = currentPlayer.name;

    try {
        switch (actionType) {
            case 'ROLL_DICE': {
                if (newState.turnPhase !== 'ROLLING') return state;

                const d1 = rollDie();
                const d2 = rollDie();
                const total = d1 + d2;
                const isDoubles = d1 === d2;

                newState.dice = [d1, d2];
                newState.lastDiceTotal = total;

                log(isDoubles ? `🎲 ${pName} sacó ${d1} y ${d2} (${total}). ¡Pares!` : `🎲 ${pName} sacó ${d1} y ${d2} (${total}).`);

                if (currentPlayer.isJailed) {
                    if (isDoubles) {
                        newState.players = newState.players.map(p =>
                            p.id === currentPlayer.id ? { ...p, isJailed: false, jailTurns: 0 } : p
                        );
                        newState.consecutiveDoubles = 0;
                        newState.rolledDoubles = false;
                        log(`🔓 ¡${pName} sacó pares y sale de la cárcel!`);
                        addToast(newState, `${pName} sale de la cárcel`, 'success');
                        movePlayer(newState, total);
                    } else {
                        const newTurns = currentPlayer.jailTurns + 1;
                        if (newTurns >= 3) {
                            const fine = 50;
                            if (currentPlayer.money >= fine) {
                                newState.players = newState.players.map(p =>
                                    p.id === currentPlayer.id ? { ...p, isJailed: false, jailTurns: 0, money: p.money - fine } : p
                                );
                                log(`💸 ${pName} pagó $50 tras 3 intentos y sale de la cárcel.`);
                                addToast(newState, `${pName} pagó $50 de fianza`, 'info');
                                movePlayer(newState, total);
                            } else {
                                createDebt(newState, currentPlayer.id, null, fine, "Fianza de cárcel");
                            }
                        } else {
                            newState.players = newState.players.map(p =>
                                p.id === currentPlayer.id ? { ...p, jailTurns: newTurns } : p
                            );
                            log(`🔒 ${pName} sigue en la cárcel (intento ${newTurns} de 3).`);
                            newState.turnPhase = 'ENDED';
                        }
                    }
                } else {
                    if (isDoubles) {
                        newState.consecutiveDoubles += 1;
                        if (newState.consecutiveDoubles >= 3) {
                            log(`🚔 ¡${pName} sacó 3 pares seguidos! Va directo a la cárcel.`);
                            addToast(newState, `${pName} a la cárcel por 3 pares`, 'error');
                            newState.players = newState.players.map(p =>
                                p.id === currentPlayer.id ? { ...p, position: 10, isJailed: true, jailTurns: 0 } : p
                            );
                            newState.consecutiveDoubles = 0;
                            newState.rolledDoubles = false;
                            newState.turnPhase = 'ENDED';
                            break;
                        }
                        newState.rolledDoubles = true;
                    } else {
                        newState.consecutiveDoubles = 0;
                        newState.rolledDoubles = false;
                    }
                    movePlayer(newState, total);
                }
                break;
            }

            case 'BUY_TILE': {
                if (newState.turnPhase !== 'BUY_DECISION') return state;
                const buyTile = newState.board[currentPlayer.position];
                if (!buyTile) return state;

                if (buyTile.price && currentPlayer.money >= buyTile.price) {
                    newState.players = newState.players.map(p =>
                        p.id === currentPlayer.id ?
                            { ...p, money: p.money - buyTile.price!, properties: [...p.properties, buyTile.index] } : p
                    );
                    newState.board = newState.board.map(t =>
                        t.index === buyTile.index ? { ...t, ownerId: currentPlayer.id } : t
                    );
                    log(`🏠 ${pName} compró ${buyTile.name} por $${buyTile.price}.`);
                    addToast(newState, `${pName} compró ${buyTile.name}`, 'success');
                }
                newState.turnPhase = newState.rolledDoubles ? 'ROLLING' : 'ENDED';
                break;
            }

            case 'PASS_BUY': {
                if (newState.turnPhase !== 'BUY_DECISION') return state;
                log(`⏭️ ${pName} decidió no comprar la propiedad.`);
                newState.turnPhase = newState.rolledDoubles ? 'ROLLING' : 'ENDED';
                break;
            }

            case 'END_TURN': {
                if (newState.pendingDebt) return state;

                newState.consecutiveDoubles = 0;
                newState.rolledDoubles = false;
                newState.drawnCard = undefined;
                newState.rentDetails = undefined;

                let nextIdx = (newState.currentPlayerIndex + 1) % newState.players.length;
                let safety = 0;
                while (newState.players[nextIdx]?.isBankrupt && safety < newState.players.length) {
                    nextIdx = (nextIdx + 1) % newState.players.length;
                    safety++;
                }

                const activePlayers = newState.players.filter(p => !p.isBankrupt);
                if (activePlayers.length <= 1) {
                    newState.gameStatus = 'GAME_OVER';
                    log(`🏆 ¡${activePlayers[0]?.name || 'Nadie'} gana la partida!`);
                    break;
                }

                newState.currentPlayerIndex = nextIdx;
                newState.turnPhase = 'ROLLING';
                const nextPlayer = newState.players[nextIdx];
                log(`➡️ Turno de ${nextPlayer.name}.`);
                break;
            }

            case 'PAY_JAIL_FINE': {
                if (!currentPlayer.isJailed) return state;
                if (currentPlayer.money >= 50) {
                    newState.players = newState.players.map(p =>
                        p.id === currentPlayer.id ? { ...p, money: p.money - 50, isJailed: false, jailTurns: 0 } : p
                    );
                    log(`💰 ${pName} pagó $50 de fianza y sale de la cárcel.`);
                    addToast(newState, `${pName} pagó fianza`, 'success');
                    newState.turnPhase = 'ROLLING';
                }
                break;
            }

            case 'PAY_RENT': {
                if (newState.turnPhase !== 'RESOLVING_RENT' || !newState.rentDetails) return state;
                const { totalRent, tileName } = newState.rentDetails;
                const tile = newState.board[currentPlayer.position];

                // Clear rent details
                newState.rentDetails = undefined;

                // Process payment
                if (tile && tile.ownerId !== undefined) {
                    createDebt(newState, currentPlayer.id, tile.ownerId, totalRent, `Renta en ${tileName}`);
                }
                break;
            }

            case 'BUILD_HOUSE': {
                if (payload?.tileId === undefined) return state;
                const t = newState.board[payload.tileId];
                if (!t || t.ownerId !== currentPlayer.id) return state;

                const buildCheck = canBuildHouse(t, currentPlayer, newState.board);
                if (!buildCheck.canBuild) {
                    log(`❌ ${pName}: ${buildCheck.reason}`);
                    addToast(newState, buildCheck.reason || 'No se puede construir', 'error');
                    return newState;
                }

                newState.players = newState.players.map(p =>
                    p.id === currentPlayer.id ? { ...p, money: p.money - (t.houseCost || 0) } : p
                );
                newState.board = newState.board.map(b =>
                    b.index === payload.tileId ? { ...b, houseCount: (b.houseCount || 0) + 1 } : b
                );
                const level = (t.houseCount || 0) + 1;
                const buildType = level === 5 ? 'un HOTEL' : `casa ${level}`;
                log(`🏗️ ${pName} construyó ${buildType} en ${t.name} por $${t.houseCost}.`);
                addToast(newState, `Construyó en ${t.name} (-$${t.houseCost})`, 'success');
                break;
            }

            case 'MORTGAGE_TILE': {
                if (payload?.tileId === undefined) return state;
                const t = newState.board[payload.tileId];
                if (!t || t.ownerId !== currentPlayer.id || t.isMortgaged) return state;
                if (t.houseCount && t.houseCount > 0) {
                    log(`❌ ${pName}: Debes vender las casas antes de hipotecar.`);
                    addToast(newState, 'Vende las casas primero', 'error');
                    return newState;
                }
                const val = getMortgageValue(t);
                newState.board = newState.board.map(b =>
                    b.index === payload.tileId ? { ...b, isMortgaged: true } : b
                );
                newState.players = newState.players.map(p =>
                    p.id === currentPlayer.id ? { ...p, money: p.money + val } : p
                );
                log(`📋 ${pName} hipotecó ${t.name} por $${val}.`);
                addToast(newState, `Hipotecó ${t.name}: +$${val}`, 'info');
                break;
            }

            case 'UNMORTGAGE_TILE': {
                if (payload?.tileId === undefined) return state;
                const t = newState.board[payload.tileId];
                const cost = getUnmortgageCost(t);
                if (!t || t.ownerId !== currentPlayer.id || !t.isMortgaged) return state;
                if (currentPlayer.money < cost) {
                    addToast(newState, 'Sin fondos suficientes', 'error');
                    return newState;
                }

                newState.board = newState.board.map(b =>
                    b.index === payload.tileId ? { ...b, isMortgaged: false } : b
                );
                newState.players = newState.players.map(p =>
                    p.id === currentPlayer.id ? { ...p, money: p.money - cost } : p
                );
                log(`✅ ${pName} levantó la hipoteca de ${t.name} por $${cost}.`);
                addToast(newState, `Deshipotecó ${t.name}: -$${cost}`, 'success');
                break;
            }

            case 'PAY_DEBT': {
                if (!newState.pendingDebt) return state;
                const { debtorId, creditorId, amount, reason } = newState.pendingDebt;
                const debtor = newState.players.find(p => p.id === debtorId);
                if (!debtor || debtor.money < amount) {
                    addToast(newState, 'No tienes suficiente dinero', 'error');
                    return newState;
                }

                newState.players = newState.players.map(p =>
                    p.id === debtorId ? { ...p, money: p.money - amount } : p
                );
                if (creditorId !== null) {
                    const creditor = newState.players.find(p => p.id === creditorId);
                    newState.players = newState.players.map(p =>
                        p.id === creditorId ? { ...p, money: p.money + amount } : p
                    );
                    if (creditor) {
                        log(`💵 ${debtor.name} pagó $${amount} a ${creditor.name} (${reason}).`);
                        addToast(newState, `Pago realizado: $${amount}`, 'success');
                    }
                } else {
                    log(`💵 ${debtor.name} pagó $${amount} al banco (${reason}).`);
                    addToast(newState, `Pago al banco: $${amount}`, 'success');
                }
                newState.pendingDebt = undefined;
                newState.turnPhase = newState.rolledDoubles ? 'ROLLING' : 'ENDED';
                break;
            }

            case 'DECLARE_BANKRUPTCY': {
                if (!newState.pendingDebt) return state;
                const { debtorId, creditorId } = newState.pendingDebt;
                const debtor = newState.players.find(p => p.id === debtorId);
                if (!debtor) return state;

                const props = debtor.properties;
                if (creditorId !== null) {
                    const creditor = newState.players.find(p => p.id === creditorId);
                    newState.board = newState.board.map(t =>
                        props.includes(t.index) ? { ...t, ownerId: creditorId, houseCount: undefined } : t
                    );
                    newState.players = newState.players.map(p =>
                        p.id === creditorId ? { ...p, properties: [...p.properties, ...props], money: p.money + debtor.money } : p
                    );
                    log(`💀 ${debtor.name} se declaró en bancarrota. Sus propiedades pasan a ${creditor?.name || 'el acreedor'}.`);
                } else {
                    newState.board = newState.board.map(t =>
                        props.includes(t.index) ? { ...t, ownerId: undefined, isMortgaged: false, houseCount: undefined } : t
                    );
                    log(`💀 ${debtor.name} se declaró en bancarrota. Sus propiedades vuelven al banco.`);
                }
                newState.players = newState.players.map(p =>
                    p.id === debtorId ? { ...p, isBankrupt: true, money: 0, properties: [], heldCards: [] } : p
                );
                newState.pendingDebt = undefined;
                addToast(newState, `${debtor.name} está en bancarrota`, 'error');
                newState.turnPhase = 'ENDED';
                break;
            }
        }
    } catch (e: unknown) {
        return { ...newState, uiError: `Error reducer: ${e}` };
    }

    return newState;
};

function movePlayer(state: GameState, steps: number) {
    const p = state.players[state.currentPlayerIndex];
    if (!p) return;

    const prevPos = p.position;
    let newPos = prevPos + steps;

    if (newPos >= 40) {
        newPos -= 40;
        state.players = state.players.map(pl =>
            pl.id === p.id ? { ...pl, money: pl.money + 200 } : pl
        );
        state.messages = [`💰 ${p.name} pasó por Salida y cobró $200.`, ...state.messages];
        addToast(state, `${p.name} cobró $200 por pasar Salida`, 'success');
    }

    if (newPos < 0) newPos += 40;
    if (newPos >= 40) newPos -= 40;

    state.players = state.players.map(pl =>
        pl.id === p.id ? { ...pl, position: newPos } : pl
    );

    const tile = state.board[newPos];
    if (tile) {
        state.messages = [`📍 ${p.name} cayó en ${tile.name}.`, ...state.messages];
    }

    resolveTileLanding(state, newPos);
}

function resolveTileLanding(state: GameState, pos: number) {
    const p = state.players[state.currentPlayerIndex];
    const tile = state.board[pos];
    if (!tile || !p) return;

    if (tile.type === 'PROPERTY' || tile.type === 'RAILROAD' || tile.type === 'UTILITY') {
        if (tile.ownerId === undefined) {
            state.turnPhase = 'BUY_DECISION';
        } else if (tile.ownerId !== p.id) {
            if (tile.isMortgaged) {
                state.messages = [`📋 ${tile.name} está hipotecada. No se cobra renta.`, ...state.messages];
                state.turnPhase = state.rolledDoubles ? 'ROLLING' : 'ENDED';
            } else {
                const owner = state.players.find(pl => pl.id === tile.ownerId);
                const rent = getRent(tile, state.board, state.lastDiceTotal);
                if (rent > 0 && owner) {
                    state.rentDetails = {
                        tileName: tile.name,
                        ownerName: owner.name,
                        baseRent: tile.rent || 0,
                        multiplier: 1,
                        houseCount: tile.houseCount || 0,
                        isHotel: (tile.houseCount || 0) === 5,
                        totalRent: rent,
                        calculation: tile.type === 'PROPERTY'
                            ? (tile.houseCount ? `Renta con ${tile.houseCount === 5 ? 'Hotel' : tile.houseCount + ' casas'}` : 'Renta Base')
                            : (tile.type === 'RAILROAD'
                                ? `Renta Ferrocarril (${state.board.filter(t => t.type === 'RAILROAD' && t.ownerId === tile.ownerId).length} en posesión)`
                                : `Renta Utilidad (${state.lastDiceTotal} x ${state.board.filter(t => t.type === 'UTILITY' && t.ownerId === tile.ownerId).length === 2 ? '10' : '4'})`)
                    };
                    state.messages = [`🔔 Renta a pagar en ${tile.name}: $${rent}.`, ...state.messages];
                    state.turnPhase = 'RESOLVING_RENT';
                } else {
                    state.turnPhase = state.rolledDoubles ? 'ROLLING' : 'ENDED';
                }
            }
        } else {
            state.turnPhase = state.rolledDoubles ? 'ROLLING' : 'ENDED';
        }
    } else if (tile.type === 'TAX') {
        createDebt(state, p.id, null, tile.price || 0, tile.name);
    } else if (tile.type === 'GO_TO_JAIL') {
        state.players = state.players.map(pl =>
            pl.id === p.id ? { ...pl, position: 10, isJailed: true, jailTurns: 0 } : pl
        );
        state.consecutiveDoubles = 0;
        state.rolledDoubles = false;
        state.messages = [`🚔 ${p.name} va directo a la cárcel.`, ...state.messages];
        addToast(state, `${p.name} va a la cárcel`, 'error');
        state.turnPhase = 'ENDED';
    } else if (tile.type === 'CHANCE' || tile.type === 'COMMUNITY_CHEST') {
        drawCard(state, tile.type);
    } else {
        state.turnPhase = state.rolledDoubles ? 'ROLLING' : 'ENDED';
    }
}

function drawCard(state: GameState, deckType: 'CHANCE' | 'COMMUNITY_CHEST') {
    const fullDeck = deckType === 'CHANCE' ? fortunaCards : arcaComunalCards;
    const deckIds = deckType === 'CHANCE' ? state.chanceDeck : state.communityChestDeck;

    if (deckIds.length === 0) {
        const freshIds = shuffleDeck(fullDeck);
        if (deckType === 'CHANCE') state.chanceDeck = freshIds;
        else state.communityChestDeck = freshIds;
    }

    const cardId = (deckType === 'CHANCE' ? state.chanceDeck : state.communityChestDeck)[0];
    const card = fullDeck.find(c => c.id === cardId);

    if (!card) {
        state.turnPhase = state.rolledDoubles ? 'ROLLING' : 'ENDED';
        return;
    }

    let newDeck = (deckType === 'CHANCE' ? state.chanceDeck : state.communityChestDeck).slice(1);

    if (card.action !== 'GET_OUT_JAIL') {
        newDeck.push(card.id);
    }

    if (deckType === 'CHANCE') state.chanceDeck = newDeck;
    else state.communityChestDeck = newDeck;

    state.drawnCard = {
        deckType,
        cardId: card.id,
        text: card.text,
        action: card.action,
        value: card.value,
        houseCost: card.houseCost,
        hotelCost: card.hotelCost
    };

    const deckName = deckType === 'CHANCE' ? 'Casualidad' : 'Arca Comunal';
    state.messages = [`🎴 ${state.players[state.currentPlayerIndex].name} sacó carta de ${deckName}.`, ...state.messages];
    state.turnPhase = 'CARD_DRAWN';
}

function applyCardEffect(state: GameState) {
    const card = state.drawnCard;
    if (!card) return;

    const p = state.players[state.currentPlayerIndex];
    if (!p) return;

    const action = card.action;
    const value = card.value || 0;

    state.messages = [`📜 "${card.text}"`, ...state.messages];

    switch (action) {
        case 'MONEY':
            if (value > 0) {
                state.players = state.players.map(pl =>
                    pl.id === p.id ? { ...pl, money: pl.money + value } : pl
                );
                state.messages = [`💵 ${p.name} cobró $${value}.`, ...state.messages];
                addToast(state, `${p.name} cobró $${value}`, 'success');
                state.turnPhase = state.rolledDoubles ? 'ROLLING' : 'ENDED';
            } else {
                state.messages = [`💸 ${p.name} debe pagar $${Math.abs(value)}.`, ...state.messages];
                createDebt(state, p.id, null, Math.abs(value), 'Carta');
            }
            break;

        case 'MOVE': {
            const passedGo = value < p.position && value !== 10;
            state.players = state.players.map(pl =>
                pl.id === p.id ? { ...pl, position: value, money: passedGo ? pl.money + 200 : pl.money } : pl
            );
            const destTile = state.board[value];
            state.messages = [`🚶 ${p.name} avanza hasta ${destTile?.name || 'casilla ' + value}.`, ...state.messages];
            if (passedGo) {
                state.messages = [`💰 ${p.name} pasó por Salida y cobró $200.`, ...state.messages];
                addToast(state, `${p.name} cobró $200 por pasar Salida`, 'success');
            }
            resolveTileLanding(state, value);
            break;
        }

        case 'MOVE_REL': {
            let moved = p.position + value;
            while (moved < 0) moved += 40;
            while (moved >= 40) moved -= 40;
            state.players = state.players.map(pl =>
                pl.id === p.id ? { ...pl, position: moved } : pl
            );
            const destTile = state.board[moved];
            if (value < 0) {
                state.messages = [`🚶 ${p.name} retrocede ${Math.abs(value)} casillas hasta ${destTile?.name || 'casilla ' + moved}.`, ...state.messages];
            } else {
                state.messages = [`🚶 ${p.name} avanza ${value} casillas hasta ${destTile?.name || 'casilla ' + moved}.`, ...state.messages];
            }
            resolveTileLanding(state, moved);
            break;
        }

        case 'GOTO_JAIL':
            state.players = state.players.map(pl =>
                pl.id === p.id ? { ...pl, position: 10, isJailed: true, jailTurns: 0 } : pl
            );
            state.consecutiveDoubles = 0;
            state.rolledDoubles = false;
            state.messages = [`🚔 ${p.name} va directo a la cárcel.`, ...state.messages];
            addToast(state, `${p.name} va a la cárcel`, 'error');
            state.turnPhase = 'ENDED';
            break;

        case 'GET_OUT_JAIL': {
            const newCard = {
                id: card.cardId,
                deckType: card.deckType,
                text: card.text
            };
            state.players = state.players.map(pl =>
                pl.id === p.id ? { ...pl, heldCards: [...pl.heldCards, newCard] } : p
            );
            state.messages = [`🎟️ ${p.name} guardó la carta "Salir de la cárcel gratis".`, ...state.messages];
            addToast(state, `${p.name} tiene carta de libertad`, 'success');
            state.turnPhase = state.rolledDoubles ? 'ROLLING' : 'ENDED';
            break;
        }

        case 'COLLECT_FROM_ALL': {
            if (value > 0) {
                let totalCollected = 0;

                state.players = state.players.map(pl => {
                    if (pl.id === p.id) return pl;

                    if (pl.money >= value) {
                        totalCollected += value;
                        return { ...pl, money: pl.money - value };
                    } else {
                        totalCollected += value;
                        return { ...pl, money: pl.money - value };
                    }
                });

                state.players = state.players.map(pl =>
                    pl.id === p.id ? { ...pl, money: pl.money + totalCollected } : pl
                );

                state.messages = [`💵 ${p.name} cobró $${value} de cada jugador (Total: $${totalCollected}).`, ...state.messages];
                addToast(state, `${p.name} cobró $${totalCollected}`, 'success');
                state.turnPhase = state.rolledDoubles ? 'ROLLING' : 'ENDED';
            }
            break;
        }

        case 'PAY_TO_ALL': {
            state.turnPhase = state.rolledDoubles ? 'ROLLING' : 'ENDED';
            break;
        }

        case 'REPAIRS': {
            const houseCost = card.houseCost || 0;
            const hotelCost = card.hotelCost || 0;

            let totalHouses = 0;
            let totalHotels = 0;

            state.board.forEach(t => {
                if (t.ownerId === p.id) {
                    if (t.houseCount === 5) totalHotels++;
                    else if (t.houseCount && t.houseCount > 0) totalHouses += t.houseCount;
                }
            });

            const cost = (totalHouses * houseCost) + (totalHotels * hotelCost);
            if (cost > 0) {
                state.messages = [`🛠️ Reparaciones: ${totalHouses} casas y ${totalHotels} hoteles. Total a pagar: $${cost}.`, ...state.messages];
                createDebt(state, p.id, null, cost, 'Reparaciones');
            } else {
                state.messages = [`🛠️ No tienes edificaciones para reparar. Te salvaste.`, ...state.messages];
                state.turnPhase = state.rolledDoubles ? 'ROLLING' : 'ENDED';
            }
            break;
        }

        default:
            state.turnPhase = state.rolledDoubles ? 'ROLLING' : 'ENDED';
    }
}
