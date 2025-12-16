import { useEffect, useState, ReactElement } from 'react';

interface Dice3DProps {
    value: number;
    isRolling?: boolean;
}

const DiceFace = ({ value }: { value: number }): ReactElement => {
    const dots: ReactElement[] = [];
    const positions: Record<number, number[][]> = {
        1: [[50, 50]],
        2: [[25, 25], [75, 75]],
        3: [[25, 25], [50, 50], [75, 75]],
        4: [[25, 25], [75, 25], [25, 75], [75, 75]],
        5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
        6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]]
    };

    const coords = positions[value] || [];
    for (let i = 0; i < coords.length; i++) {
        const [x, y] = coords[i];
        dots.push(
            <div
                key={i}
                style={{
                    position: 'absolute',
                    width: '18%',
                    height: '18%',
                    borderRadius: '50%',
                    background: '#1a1a1a',
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)'
                }}
            />
        );
    }

    return <>{dots}</>;
};

export const Dice3D = ({ value, isRolling }: Dice3DProps): ReactElement => {
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        if (isRolling) {
            const interval = setInterval(() => {
                setRotation(prev => prev + 45);
            }, 50);
            return () => clearInterval(interval);
        }
    }, [isRolling]);

    const faceRotations = [
        'rotateY(0deg)',
        'rotateY(180deg)',
        'rotateY(90deg)',
        'rotateY(-90deg)',
        'rotateX(90deg)',
        'rotateX(-90deg)'
    ];

    const safeValue = Math.max(1, Math.min(6, value || 1));

    return (
        <div style={{
            width: '60px',
            height: '60px',
            perspective: '300px',
            display: 'inline-block'
        }}>
            <div style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                transformStyle: 'preserve-3d',
                transform: isRolling
                    ? `rotateX(${rotation}deg) rotateY(${rotation * 1.5}deg)`
                    : faceRotations[safeValue - 1],
                transition: isRolling ? 'none' : 'transform 0.6s ease-out'
            }}>
                {[1, 2, 3, 4, 5, 6].map((face, i) => (
                    <div
                        key={face}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            background: 'white',
                            border: '2px solid #333',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            transform: `${faceRotations[i]} translateZ(30px)`,
                            backfaceVisibility: 'hidden'
                        }}
                    >
                        <DiceFace value={face} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const DicePair = ({ dice, isRolling }: { dice: [number, number], isRolling?: boolean }): ReactElement => {
    return (
        <div style={{
            display: 'flex',
            gap: '20px',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            background: 'rgba(0,0,0,0.1)',
            borderRadius: '12px',
            margin: '10px 0'
        }}>
            <Dice3D value={dice[0]} isRolling={isRolling} />
            <Dice3D value={dice[1]} isRolling={isRolling} />
        </div>
    );
};
