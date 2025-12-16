import { ReactElement } from 'react';
import { Tile } from './Tile';
import { GameState } from '../types/gameTypes';

interface BoardProps {
    gameState: GameState;
}

const getGridPosition = (index: number): { gridColumn: string; gridRow: string } => {
    if (index === 0) return { gridColumn: '11', gridRow: '11' };
    if (index === 10) return { gridColumn: '1', gridRow: '11' };
    if (index === 20) return { gridColumn: '1', gridRow: '1' };
    if (index === 30) return { gridColumn: '11', gridRow: '1' };

    if (index >= 1 && index <= 9) return { gridColumn: `${11 - index}`, gridRow: '11' };
    if (index >= 11 && index <= 19) return { gridColumn: '1', gridRow: `${21 - index}` };
    if (index >= 21 && index <= 29) return { gridColumn: `${index - 19}`, gridRow: '1' };
    if (index >= 31 && index <= 39) return { gridColumn: '11', gridRow: `${index - 29}` };

    return { gridColumn: '1', gridRow: '1' };
};

export const Board = ({ gameState }: BoardProps): ReactElement => {
    return (
        <div className="board-wrapper">
            <div className="board">
                {gameState.board.map(tile => {
                    const { gridColumn, gridRow } = getGridPosition(tile.index);
                    const playersOnTile = gameState.players.filter(p => p.position === tile.index && !p.isBankrupt);

                    return (
                        <Tile
                            key={tile.index}
                            tile={tile}
                            players_on_tile={playersOnTile}
                            style={{ gridColumn, gridRow }}
                        />
                    );
                })}

                <div className="board-center">
                    <img
                        src="/centro.png"
                        alt="Monopoly Medellín"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>
            </div>
        </div>
    );
};
