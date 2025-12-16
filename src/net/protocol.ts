import { GameState, Player } from '../types/gameTypes';

export type PlayerId = string;
export type RoomId = string;

export type NetworkActionType =
    | 'SET_PLAYERS'
    | 'ROLL_DICE'
    | 'BUY_TILE'
    | 'PASS_BUY'
    | 'END_TURN'
    | 'BUILD_HOUSE'
    | 'MORTGAGE_TILE'
    | 'UNMORTGAGE_TILE'
    | 'SELL_HOUSE'
    | 'DECLARE_BANKRUPTCY'
    | 'PAY_DEBT'
    | 'PAY_JAIL_FINE'
    | 'USE_JAIL_CARD'
    | 'JOIN_GAME'
    | 'START_GAME'
    | 'CONFIRM_CARD'
    | 'CLEAR_TOAST'
    | 'PAY_RENT';

export interface ActionPayload {
    tileId?: number;
    amount?: number;
    targetPlayerId?: number;
    initialPlayers?: Player[];
    players?: Player[];
    toastId?: number;
}

export interface ActionEnvelope {
    type: 'ACTION';
    roomId: RoomId;
    fromPlayerId: PlayerId;
    action: NetworkActionType;
    payload?: ActionPayload;
    timestamp: number;
}

export interface SnapshotEnvelope {
    type: 'SNAPSHOT';
    roomId: RoomId;
    stateVersion: number;
    state: GameState;
    timestamp: number;
}

export type NetworkMessage = ActionEnvelope | SnapshotEnvelope;
