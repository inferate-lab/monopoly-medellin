import { ReactElement } from 'react';
import { Tile as TileType, Player } from '../types/gameTypes';

interface TileProps {
    tile: TileType;
    players_on_tile: Player[];
    style?: React.CSSProperties;
}

const colorMap: Record<string, string> = {
    brown: '#8B4513',
    lightblue: '#ADD8E6',
    pink: '#E91E8C',
    orange: '#FF8C00',
    red: '#CC0000',
    yellow: '#FFCC00',
    green: '#1E7B1E',
    blue: '#0047AB',
};

const tokenColorMap: Record<string, string> = {
    amarillo: '#FFD700',
    rojo: '#FF0000',
    naranja: '#FFA500',
    azul: '#1E90FF',
    verde: '#32CD32',
    rosado: '#FF69B4',
    morado: '#9400D3',
};

const getTileIcon = (type: string): string => {
    switch (type) {
        case 'CHANCE': return '?';
        case 'COMMUNITY_CHEST': return '💳';
        case 'RAILROAD': return '🚃';
        case 'UTILITY': return '⚡';
        case 'TAX': return '💰';
        case 'JAIL': return '🔒';
        case 'FREE_PARKING': return '🅿️';
        case 'GO_TO_JAIL': return '👮';
        case 'START': return '▶';
        default: return '';
    }
};

const getTileClass = (type: string): string => {
    switch (type) {
        case 'CHANCE': return 'tile tile-chance';
        case 'COMMUNITY_CHEST': return 'tile tile-chest';
        case 'RAILROAD': return 'tile tile-railroad';
        case 'UTILITY': return 'tile tile-utility';
        case 'TAX': return 'tile tile-tax';
        case 'JAIL': return 'tile tile-jail';
        case 'FREE_PARKING': return 'tile tile-parking';
        case 'GO_TO_JAIL': return 'tile tile-gotojail';
        case 'START': return 'tile tile-start';
        default: return 'tile';
    }
};

export const Tile = ({ tile, players_on_tile, style }: TileProps): ReactElement => {
    const icon = getTileIcon(tile.type);
    const tileClass = getTileClass(tile.type);
    const houseCount = tile.houseCount || 0;
    const hasHouses = houseCount > 0;
    const isCorner = [0, 10, 20, 30].includes(tile.index);
    const showPrice = (tile.type === 'PROPERTY' || tile.type === 'RAILROAD' || tile.type === 'UTILITY' || tile.type === 'TAX') && tile.price;

    return (
        <div className={`${tileClass} ${isCorner ? 'tile-corner' : ''} ${tile.isMortgaged ? 'tile-mortgaged' : ''}`} style={style}>
            {tile.colorGroup && (
                <div
                    className="tile-color-bar"
                    style={{ backgroundColor: colorMap[tile.colorGroup] || '#ccc' }}
                >
                    {hasHouses && (
                        <div className="house-indicators">
                            {houseCount < 5 ? (
                                Array.from({ length: houseCount }).map((_, i) => (
                                    <div key={i} className="house-icon"></div>
                                ))
                            ) : (
                                <div className="hotel-icon">H</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {icon && !tile.colorGroup && (
                <div className="tile-icon">{icon}</div>
            )}

            <div className="tile-name">{tile.name}</div>

            {showPrice && (
                <div className="tile-price">{tile.type === 'TAX' ? '-' : '$'}{tile.price}</div>
            )}

            <div className="player-tokens">
                {players_on_tile.map(p => (
                    <div
                        key={p.id}
                        className="token"
                        style={{ backgroundColor: tokenColorMap[p.color] || '#888' }}
                        title={p.name}
                    />
                ))}
            </div>
        </div>
    );
};
