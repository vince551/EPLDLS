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
        <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'rgba(15, 5, 29, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        }}>
            {/* Brand Logo */}
            <div 
                onClick={() => navigate('/')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    color: 'white',
                    letterSpacing: '-0.5px'
                }}
            >
                <Gamepad2 size={28} style={{ color: 'var(--gv-mint)' }} />
                <span>GAME<span style={{ color: 'var(--gv-mint)' }}>VERSE</span> HUB</span>
            </div>

            {/* Game Selector Dropdown / Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <select
                    value={activeGame}
                    onChange={(e) => setActiveGame(e.target.value)}
                    style={{
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(0, 255, 135, 0.3)',
                        color: 'var(--gv-mint)',
                        borderRadius: '20px',
                        padding: '0.35rem 0.8rem',
                        fontSize: '0.8rem',
                        fontWeight: '800',
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <option value="all">All Games Catalog</option>
                    {games.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>

                {/* Notifications Bell */}
                {currentUser && (
                    <button
                        onClick={onOpenNotifications}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '50%',
                            width: '38px',
                            height: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                            color: 'white'
                        }}
                        title="Notifications"
                    >
                        <Bell size={18} />
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

                {/* User Avatar Snippet */}
                {currentUser ? (
                    <div 
                        onClick={() => navigate('/profile')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            background: 'rgba(255, 255, 255, 0.06)',
                            padding: '0.25rem 0.75rem 0.25rem 0.25rem',
                            borderRadius: '30px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        {currentUser.pic ? (
                            <img 
                                src={currentUser.pic} 
                                alt={currentUser.name}
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                        ) : null}
                        <div style={{
                            width: '30px', height: '30px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--gv-purple), var(--gv-pink))',
                            display: currentUser.pic ? 'none' : 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: 900, color: 'white'
                        }}>
                            {getInitials(currentUser.name)}
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white' }}>
                            {currentUser.name}
                        </span>
                    </div>
                ) : (
                    <button 
                        onClick={() => navigate('/auth')}
                        className="gv-btn gv-btn-primary"
                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                        <KeyRound size={14} /> Sign In
                    </button>
                )}
            </div>
        </header>
    );
}
