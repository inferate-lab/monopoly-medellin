export type PlayerColor = 'amarillo' | 'rojo' | 'naranja' | 'azul' | 'verde' | 'rosado' | 'morado';

export interface HeldCard {
    id: number;
    deckType: 'CHANCE' | 'COMMUNITY_CHEST';
    text: string;
}

export interface Player {
    id: number;
    peerId?: string;
    name: string;
    color: PlayerColor;
    money: number;
    position: number;
    isJailed: boolean;
    jailTurns: number;
    properties: number[];
    isAI: boolean;
    getOutOfJailFreeCards: number; // Keep for convenience, but rely on heldCards
    isBankrupt: boolean;
    heldCards: HeldCard[];
}

export type TileType = 'START' | 'PROPERTY' | 'COMMUNITY_CHEST' | 'TAX' | 'RAILROAD' | 'CHANCE' | 'JAIL' | 'UTILITY' | 'FREE_PARKING' | 'GO_TO_JAIL';

export interface Tile {
    index: number;
    name: string;
    type: TileType;
    price?: number;
    rent?: number;
    rentLevels?: number[];
    houseCost?: number;
    houseCount?: number;
    ownerId?: number;
    colorGroup?: string;
    isMortgaged?: boolean;
}

export type TurnPhase = 'ROLLING' | 'MOVING' | 'RESOLVING_TILE' | 'BUY_DECISION' | 'RESOLVING_RENT' | 'ENDED' | 'BANKRUPTCY_RESOLUTION' | 'CARD_DRAWN';

export interface PendingDebt {
    debtorId: number;
    creditorId: number | null;
    amount: number;
    reason: string;
}

export interface RentDetails {
    tileName: string;
    ownerName: string;
    baseRent: number;
    multiplier: number;
    houseCount: number;
    isHotel: boolean;
    totalRent: number;
    calculation: string;
}

export interface DrawnCard {
    deckType: 'CHANCE' | 'COMMUNITY_CHEST';
    cardId: number;
    text: string;
    action: string;
    value?: number;
    houseCost?: number;
    hotelCost?: number;
}

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface GameState {
    version: number;
    players: Player[];
    currentPlayerIndex: number;
    board: Tile[];
    dice: [number, number];
    lastDiceTotal: number;
    turnPhase: TurnPhase;
    gameStatus: 'SETUP' | 'LOBBY' | 'PLAYING' | 'GAME_OVER';
    messages: string[];
    pendingDebt?: PendingDebt;
    roomId?: string;
    uiError?: string;
    consecutiveDoubles: number;
    rolledDoubles: boolean;
    drawnCard?: DrawnCard;

    // Arrays of Card IDs, shuffled
    chanceDeck: number[];
    communityChestDeck: number[];

    toasts: Toast[];
    rentDetails?: RentDetails;
}
