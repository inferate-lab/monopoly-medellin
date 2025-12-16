export type CardType = 'CHANCE' | 'COMMUNITY_CHEST';

export interface Card {
    id: number;
    text: string;
    action: 'MOVE' | 'MONEY' | 'GOTO_JAIL' | 'MOVE_REL' | 'GET_OUT_JAIL' | 'COLLECT_FROM_ALL' | 'PAY_TO_ALL' | 'REPAIRS';
    value?: number; // For money or position
    houseCost?: number; // For repairs
    hotelCost?: number; // For repairs
}

// Deck state - managed in game state
export interface CardDeck {
    cards: Card[];
    currentIndex: number;
}

export const fortunaCards: Card[] = [
    { id: 1, text: 'Avance hasta la Salida. Cobre $200.', action: 'MOVE', value: 0 },
    { id: 2, text: 'Avance a El Poblado.', action: 'MOVE', value: 31 },
    { id: 3, text: 'Avance a la estación de Metro más cercana.', action: 'MOVE', value: 5 }, // Simplified logic
    { id: 4, text: 'El banco le paga un dividendo de $50.', action: 'MONEY', value: 50 },
    { id: 5, text: 'Salga libre de la cárcel. Guarde esta carta.', action: 'GET_OUT_JAIL', value: 0 },
    { id: 6, text: 'Retroceda 3 casillas.', action: 'MOVE_REL', value: -3 },
    { id: 7, text: 'Vaya directamente a la cárcel. No pase por Salida.', action: 'GOTO_JAIL' },
    { id: 8, text: 'Reparaciones en sus propiedades.', action: 'REPAIRS', houseCost: 25, hotelCost: 100 },
    { id: 9, text: 'Multa por exceso de velocidad. Pague $15.', action: 'MONEY', value: -15 },
    { id: 10, text: 'Avance a San Javier.', action: 'MOVE', value: 23 },
    { id: 11, text: 'Ha ganado un premio. Cobre $100.', action: 'MONEY', value: 100 },
    { id: 12, text: 'Avance a Laureles.', action: 'MOVE', value: 26 },
];

export const arcaComunalCards: Card[] = [
    { id: 101, text: 'Avance hasta la Salida. Cobre $200.', action: 'MOVE', value: 0 },
    { id: 102, text: 'Error de la banca a su favor. Cobre $200.', action: 'MONEY', value: 200 },
    { id: 103, text: 'Pague la cuenta del hospital. $100.', action: 'MONEY', value: -100 },
    { id: 104, text: 'Pague su poliza de seguro. $50.', action: 'MONEY', value: -50 },
    { id: 105, text: 'Vaya directamente a la cárcel. No pase por Salida.', action: 'GOTO_JAIL' },
    { id: 106, text: 'Es su cumpleaños. Cobre $10 de cada jugador.', action: 'COLLECT_FROM_ALL', value: 10 },
    { id: 107, text: 'Herencia. Cobre $100.', action: 'MONEY', value: 100 },
    { id: 108, text: 'Venta de acciones. Cobre $50.', action: 'MONEY', value: 50 },
    { id: 109, text: 'Devolución de impuesto de renta. Cobre $20.', action: 'MONEY', value: 20 },
    { id: 110, text: 'Recibe honorarios de consultoría. Cobre $25.', action: 'MONEY', value: 25 },
    { id: 111, text: 'Salga libre de la cárcel. Guarde esta carta.', action: 'GET_OUT_JAIL', value: 0 },
    { id: 112, text: 'Segundo lugar en concurso de belleza. Cobre $10.', action: 'MONEY', value: 10 },
    { id: 113, text: 'Reparación de calles. Pague $40 por casa y $115 por hotel.', action: 'REPAIRS', houseCost: 40, hotelCost: 115 },
    { id: 114, text: 'La vida madura. Cobre $100.', action: 'MONEY', value: 100 },
    { id: 115, text: 'Pague gastos escolares. $50.', action: 'MONEY', value: -50 },
    { id: 116, text: 'Gastos de vacaciones. Pague $100.', action: 'MONEY', value: -100 }
];
