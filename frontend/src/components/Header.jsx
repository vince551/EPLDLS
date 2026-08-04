import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Bell, Globe, KeyRound, User } from 'lucide-react';

export default function Header({ onOpenNotifications }) {
    const { currentUser, unreadNotifCount, activeGame, setActiveGame, games } = useAuth();
    const navigate = useNavigate();

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <header className="gv-header">
            {/* Brand Logo */}
            <div 
                onClick={() => navigate('/')}
                className="gv-header-brand"
            >
                <Gamepad2 size={24} style={{ color: 'var(--gv-mint)', flexShrink: 0 }} />
                <span className="gv-header-title">GAME<span style={{ color: 'var(--gv-mint)' }}>VERSE</span><span className="hide-mobile"> HUB</span></span>
            </div>

            {/* Game Selector Dropdown & Actions */}
            <div className="gv-header-actions">
                <select
                    value={activeGame}
                    onChange={(e) => setActiveGame(e.target.value)}
                    className="gv-header-select"
                >
                    <option value="all">All Games</option>
                    {games.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>

                {/* Notifications Bell */}
                {currentUser && (
                    <button
                        onClick={onOpenNotifications}
                        className="gv-header-icon-btn"
                        title="Notifications"
                    >
                        <Bell size={16} />
                        {unreadNotifCount > 0 && (
                            <span 
                                className="unread-badge"
                                style={{ position: 'absolute', top: '-4px', right: '-4px' }}
                            >
                                {unreadNotifCount}
                            </span>
                        )}
                    </button>
                )}

                {/* User Avatar or Sign In button */}
                {currentUser ? (
                    <div 
                        onClick={() => navigate('/profile')}
                        className="gv-header-user"
                    >
                        {currentUser.pic ? (
                            <img 
                                src={currentUser.pic} 
                                alt={currentUser.name}
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                        ) : null}
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--gv-purple), var(--gv-pink))',
                            display: currentUser.pic ? 'none' : 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: 900, color: 'white'
                        }}>
                            {getInitials(currentUser.name)}
                        </div>
                        <span className="gv-header-username">
                            {currentUser.name}
                        </span>
                    </div>
                ) : (
                    <button 
                        onClick={() => navigate('/auth')}
                        className="gv-btn gv-btn-primary gv-header-auth-btn"
                    >
                        <KeyRound size={14} /> <span>Sign In</span>
                    </button>
                )}
            </div>

            <style>{`
                .gv-header {
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    background: rgba(15, 5, 29, 0.95);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 0.65rem 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.5rem;
                }
                .gv-header-brand {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    cursor: pointer;
                    font-size: 1.15rem;
                    font-weight: 900;
                    color: white;
                    letter-spacing: -0.5px;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .gv-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex-shrink: 0;
                }
                .gv-header-select {
                    background: rgba(0, 0, 0, 0.6);
                    border: 1px solid rgba(0, 255, 135, 0.3);
                    color: var(--gv-mint);
                    border-radius: 20px;
                    padding: 0.3rem 0.6rem;
                    font-size: 0.75rem;
                    font-weight: 800;
                    outline: none;
                    cursor: pointer;
                    max-width: 130px;
                }
                .gv-header-icon-btn {
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 50%;
                    width: 34px;
                    height: 34px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    position: relative;
                    color: white;
                    flex-shrink: 0;
                }
                .gv-header-user {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    cursor: pointer;
                    background: rgba(255, 255, 255, 0.06);
                    padding: 0.2rem 0.6rem 0.2rem 0.2rem;
                    border-radius: 30px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .gv-header-auth-btn {
                    padding: 0.35rem 0.75rem !important;
                    font-size: 0.75rem !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 0.3rem !important;
                    white-space: nowrap !important;
                    flex-shrink: 0 !important;
                }
                @media (max-width: 600px) {
                    .gv-header {
                        padding: 0.5rem 0.65rem;
                    }
                    .gv-header-brand {
                        font-size: 0.95rem;
                    }
                    .hide-mobile {
                        display: none;
                    }
                    .gv-header-select {
                        max-width: 95px;
                        font-size: 0.7rem;
                        padding: 0.25rem 0.4rem;
                    }
                    .gv-header-username {
                        display: none;
                    }
                }
            `}</style>
        </header>
    );
}
