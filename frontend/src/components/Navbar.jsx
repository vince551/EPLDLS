import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    Home, Gamepad2, Trophy, CalendarDays, Users, MessageCircle, 
    MessagesSquare, User, LayoutDashboard, LogOut 
} from 'lucide-react';

export default function Navbar() {
    const { currentUser, logout, unreadChatCount } = useAuth();
    const navigate = useNavigate();

    return (
        <nav style={{
            background: 'rgba(15, 5, 29, 0.9)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.5rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            overflowX: 'auto',
            scrollbarWidth: 'none'
        }} className="desktop-nav">
            <NavLink to="/" className={({ isActive }) => `gv-nav-link ${isActive ? 'active' : ''}`}>
                <Home size={15} /> Home
            </NavLink>
            <NavLink to="/games" className={({ isActive }) => `gv-nav-link ${isActive ? 'active' : ''}`}>
                <Gamepad2 size={15} /> Games
            </NavLink>
            <NavLink to="/tournaments" className={({ isActive }) => `gv-nav-link ${isActive ? 'active' : ''}`}>
                <Trophy size={15} /> Tournaments
            </NavLink>
            <NavLink to="/fixtures" className={({ isActive }) => `gv-nav-link ${isActive ? 'active' : ''}`}>
                <CalendarDays size={15} /> Fixtures
            </NavLink>
            <NavLink to="/friends" className={({ isActive }) => `gv-nav-link ${isActive ? 'active' : ''}`}>
                <Users size={15} /> Gamers
            </NavLink>
            <NavLink to="/forums" className={({ isActive }) => `gv-nav-link ${isActive ? 'active' : ''}`}>
                <MessagesSquare size={15} /> Forums
            </NavLink>

            {currentUser ? (
                <>
                    <NavLink to="/chat" className={({ isActive }) => `gv-nav-link ${isActive ? 'active' : ''}`} style={{ position: 'relative' }}>
                        <MessageCircle size={15} /> Direct Chat
                        {unreadChatCount > 0 && (
                            <span className="unread-badge" style={{ marginLeft: '4px' }}>
                                {unreadChatCount}
                            </span>
                        )}
                    </NavLink>
                    <NavLink to="/profile" className={({ isActive }) => `gv-nav-link ${isActive ? 'active' : ''}`}>
                        <User size={15} /> Profile
                    </NavLink>

                    {currentUser.role === 'admin' && (
                        <NavLink to="/admin" className={({ isActive }) => `gv-nav-link admin ${isActive ? 'active' : ''}`}>
                            <LayoutDashboard size={15} /> Admin Panel
                        </NavLink>
                    )}

                    <button 
                        onClick={() => { logout(); navigate('/auth'); }}
                        style={{
                            marginLeft: 'auto',
                            background: 'rgba(233, 0, 82, 0.12)',
                            border: '1px solid rgba(233, 0, 82, 0.3)',
                            color: 'var(--gv-pink)',
                            padding: '0.35rem 0.8rem',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                        }}
                    >
                        <LogOut size={14} /> Logout
                    </button>
                </>
            ) : (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button 
                        onClick={() => navigate('/auth')}
                        className="gv-btn gv-btn-primary"
                        style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                        Sign In / Register <Trophy size={14} />
                    </button>
                </div>
            )}

            <style>{`
                .gv-nav-link {
                    padding: 0.45rem 0.9rem;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: var(--gv-text-sub);
                    text-decoration: none;
                    white-space: nowrap;
                    transition: var(--transition);
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                }
                .gv-nav-link:hover, .gv-nav-link.active {
                    background: rgba(0, 255, 135, 0.12);
                    color: var(--gv-mint);
                }
                .gv-nav-link.admin {
                    color: var(--gv-cyan);
                }
                .gv-nav-link.admin:hover, .gv-nav-link.admin.active {
                    background: rgba(4, 245, 255, 0.15);
                    color: var(--gv-cyan);
                }
                @media (max-width: 768px) {
                    .desktop-nav { display: none !important; }
                }
            `}</style>
        </nav>
    );
}
