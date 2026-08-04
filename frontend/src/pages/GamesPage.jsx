import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Trophy, MessagesSquare } from 'lucide-react';

export default function GamesPage() {
    const { games, activeGame, setActiveGame } = useAuth();
    const navigate = useNavigate();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Gamepad2 size={24} /> Supported Games Catalog
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gv-text-sub)' }}>
                        Select a game to view dedicated tournaments, forums, and player hubs
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {games.map(g => {
                    const isSelected = activeGame == g.id;
                    return (
                        <div 
                            key={g.id}
                            className="gv-card"
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                background: isSelected ? 'linear-gradient(135deg, rgba(56,0,60,0.9), rgba(15,5,29,0.95))' : 'var(--gv-card-bg)',
                                borderColor: isSelected ? 'var(--gv-mint)' : 'var(--gv-card-border)',
                                borderWidth: isSelected ? '2px' : '1px'
                            }}
                        >
                            <div>
                                {g.banner && (
                                    <div style={{
                                        height: '110px',
                                        borderRadius: '8px',
                                        backgroundImage: `url(${g.banner})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        marginBottom: '0.75rem',
                                        position: 'relative'
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            fontSize: '1.5rem',
                                            background: 'rgba(0,0,0,0.6)',
                                            padding: '4px 8px',
                                            borderRadius: '8px'
                                        }}>
                                            {g.icon}
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                    {!g.banner && <span style={{ fontSize: '1.8rem' }}>{g.icon}</span>}
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white' }}>{g.name}</h3>
                                </div>

                                <p style={{ fontSize: '0.75rem', color: 'var(--gv-text-sub)', marginBottom: '1rem', lineHeight: 1.4 }}>
                                    {g.description}
                                </p>
                            </div>

                            <div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <span className="gv-badge gv-badge-mint" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                        <Trophy size={11} /> {g.tournamentCount || 0} Tourneys
                                    </span>
                                    <span className="gv-badge gv-badge-cyan" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                        <MessagesSquare size={11} /> {g.forumCount || 0} Forums
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                        className={`gv-btn ${isSelected ? 'gv-btn-mint' : 'gv-btn-secondary'}`}
                                        style={{ flex: 1, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                                        onClick={() => {
                                            setActiveGame(g.id);
                                            navigate('/tournaments');
                                        }}
                                    >
                                        <Trophy size={13} /> Tournaments
                                    </button>
                                    <button 
                                        className="gv-btn gv-btn-secondary"
                                        style={{ flex: 1, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                                        onClick={() => {
                                            setActiveGame(g.id);
                                            navigate('/forums');
                                        }}
                                    >
                                        <MessagesSquare size={13} /> Forums
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
