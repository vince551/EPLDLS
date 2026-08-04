import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Gamepad2, MessageCircle, MessagesSquare, User, LayoutDashboard } from 'lucide-react';

export default function MobileNav() {
    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'rgba(12, 4, 25, 0.96)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-around',
            padding: '0.4rem 0.2rem'
        }} className="mobile-bottom-nav">
            <NavLink to="/" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                <Home size={20} />
                <span>Home</span>
            </NavLink>
            <NavLink to="/games" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                <Gamepad2 size={20} />
                <span>Games</span>
            </NavLink>

            {currentUser ? (
                <>
                    <NavLink to="/chat" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`} style={{ position: 'relative' }}>
                        <MessageCircle size={20} />
                        <span>Chat</span>
                        {unreadChatCount > 0 && (
                            <span className="unread-badge" style={{
                                position: 'absolute',
                                top: '2px',
                                right: '12px'
                            }}>
                                {unreadChatCount}
                            </span>
                        )}
                    </NavLink>
                    <NavLink to="/forums" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                        <MessagesSquare size={20} />
                        <span>Forums</span>
                    </NavLink>
                    <NavLink to="/profile" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                        <User size={20} />
                        <span>Profile</span>
                    </NavLink>
                    {currentUser.role === 'admin' && (
                        <NavLink to="/admin" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                            <LayoutDashboard size={20} />
                            <span>Admin</span>
                        </NavLink>
                    )}
                </>
            ) : (
                <>
                    <NavLink to="/forums" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                        <MessagesSquare size={20} />
                        <span>Forums</span>
                    </NavLink>
                    <NavLink to="/auth" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                        <User size={20} />
                        <span>Sign In</span>
                    </NavLink>
                </>
            )}

            <style>{`
                .mobile-bottom-nav {
                    display: none;
                }
                @media (max-width: 768px) {
                    .mobile-bottom-nav {
                        display: flex !important;
                    }
                }
                .m-nav-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 2px;
                    color: #8a7a9e;
                    text-decoration: none;
                    font-size: 0.65rem;
                    font-weight: 700;
                    padding: 4px 8px;
                    border-radius: 8px;
                    flex: 1;
                    transition: var(--transition);
                }
                .m-nav-item.active {
                    color: var(--gv-mint);
                }
            `}</style>
        </nav>
    );
}
