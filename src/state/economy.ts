import type { Tile, Player } from '../types/gameTypes';

export const canPay = (playerMoney: number, amount: number): boolean => {
    return playerMoney >= amount;
};

export const getNetWorth = (player: Player, board: Tile[]): number => {
    let worth = player.money;
    player.properties.forEach((idx: number) => {
        const tile = board[idx];
        if (tile) {
            if (tile.price && !tile.isMortgaged) worth += Math.floor(tile.price / 2);
            if (tile.houseCount && tile.houseCost) {
                worth += Math.floor((tile.houseCount * tile.houseCost) / 2);
            }
        }
    });
    return worth;
};

export const getMortgageValue = (tile: Tile): number => {
    return tile.price ? Math.floor(tile.price / 2) : 0;
};

export const getUnmortgageCost = (tile: Tile): number => {
    const val = getMortgageValue(tile);
    return Math.floor(val * 1.1);
};

export const getRent = (tile: Tile, board: Tile[], diceTotal: number): number => {
    if (tile.isMortgaged) return 0;
    if (tile.ownerId === undefined) return 0;

    // Utility
    if (tile.type === 'UTILITY') {
        const group = board.filter(t => t.type === 'UTILITY' && t.ownerId === tile.ownerId);
        const count = group.length;
        // Classic rule: 4x if 1 owned, 10x if 2 owned
        return diceTotal * (count === 2 ? 10 : 4);
    }

    // Railroad
    if (tile.type === 'RAILROAD') {
        const group = board.filter(t => t.type === 'RAILROAD' && t.ownerId === tile.ownerId);
        const count = group.length;
        // Classic rules: based on count 1-4. 
        // If rentLevels exist, use them: rentLevels[count-1]
        // Else fallback to 25 * 2^(n-1)
        if (tile.rentLevels && tile.rentLevels.length >= count) {
            return tile.rentLevels[count - 1];
        }
        return 25 * Math.pow(2, count - 1);
    }

    // Property
    if (tile.type === 'PROPERTY') {
        let rent = tile.rent || 0;

        // With houses
        if (tile.houseCount && tile.houseCount > 0 && tile.rentLevels) {
            return tile.rentLevels[tile.houseCount] || rent;
        }

        // Monopoly bonus (double rent if full color set, no houses)
        if (tile.colorGroup) {
            const group = board.filter(t => t.colorGroup === tile.colorGroup);
            const allOwned = group.every(t => t.ownerId === tile.ownerId);
            if (allOwned) {
                return rent * 2;
            }
        }
        return rent;
    }

    return 0;
};

export interface BuildCheck {
    canBuild: boolean;
    reason?: string;
}

export const canBuildHouse = (tile: Tile, player: Player, board: Tile[]): BuildCheck => {
    if (tile.type !== 'PROPERTY') {
        return { canBuild: false, reason: 'Solo propiedades.' };
    }
    if (tile.ownerId !== player.id) {
        return { canBuild: false, reason: 'No es tu propiedad.' };
    }
    if (tile.isMortgaged) {
        return { canBuild: false, reason: 'Propiedad hipotecada.' };
    }
    if (!tile.colorGroup || !tile.houseCost) {
        return { canBuild: false, reason: 'Sin grupo de color.' };
    }
    if ((tile.houseCount || 0) >= 5) {
        return { canBuild: false, reason: 'Máximo alcanzado (hotel).' };
    }
    if (player.money < tile.houseCost) {
        return { canBuild: false, reason: 'Sin fondos suficientes.' };
    }

    // Check full color group ownership
    const group = board.filter(t => t.colorGroup === tile.colorGroup);
    if (!group.every(t => t.ownerId === player.id)) {
        return { canBuild: false, reason: 'Necesitas el grupo completo.' };
    }

    // Check no mortgaged in group
    if (group.some(t => t.isMortgaged)) {
        return { canBuild: false, reason: 'Una propiedad del grupo está hipotecada.' };
    }

    // Even building rule
    const currentHouses = tile.houseCount || 0;
    const minInGroup = Math.min(...group.map(t => t.houseCount || 0));
    if (currentHouses > minInGroup) {
        return { canBuild: false, reason: 'Construcción pareja: construye primero en otras.' };
    }

    return { canBuild: true };
};
