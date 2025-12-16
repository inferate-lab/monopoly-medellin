import { ReactElement } from 'react';
import { DrawnCard } from '../types/gameTypes';

interface CardModalProps {
    card: DrawnCard;
    onConfirm: () => void;
    playerName: string;
}

export const CardModal = ({ card, onConfirm, playerName }: CardModalProps): ReactElement => {
    const isChance = card.deckType === 'CHANCE';
    const deckName = isChance ? 'CASUALIDAD' : 'ARCA COMUNAL';
    const bgColor = isChance
        ? 'linear-gradient(135deg, #f39c12, #e67e22)'
        : 'linear-gradient(135deg, #3498db, #2980b9)';
    const icon = isChance ? '?' : '💳';
    const borderColor = isChance ? '#d35400' : '#1a5276';

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000
        }}>
            <div style={{
                width: '360px',
                background: bgColor,
                borderRadius: '20px',
                padding: '0',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                textAlign: 'center',
                color: 'white',
                border: `6px solid ${borderColor}`,
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    padding: '12px',
                    borderBottom: '2px solid rgba(255,255,255,0.3)'
                }}>
                    <div style={{
                        fontSize: '16px',
                        textTransform: 'uppercase',
                        letterSpacing: '3px',
                        fontWeight: 'bold'
                    }}>
                        {deckName}
                    </div>
                </div>

                {/* Card body */}
                <div style={{ padding: '24px' }}>
                    <div style={{
                        fontSize: '56px',
                        marginBottom: '16px'
                    }}>
                        {icon}
                    </div>

                    <div style={{
                        fontSize: '13px',
                        opacity: 0.9,
                        marginBottom: '8px'
                    }}>
                        Carta de {playerName}
                    </div>

                    <div style={{
                        fontSize: '22px',
                        fontWeight: 'bold',
                        marginBottom: '24px',
                        lineHeight: 1.4,
                        minHeight: '90px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 10px'
                    }}>
                        {card.text}
                    </div>
                </div>

                {/* Button */}
                <div style={{ padding: '0 24px 24px' }}>
                    <button
                        onClick={onConfirm}
                        style={{
                            width: '100%',
                            padding: '16px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            background: 'white',
                            color: isChance ? '#d35400' : '#1a5276',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.03)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                        }}
                    >
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    );
};
