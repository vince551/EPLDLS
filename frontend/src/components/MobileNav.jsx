import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Gamepad2, CalendarDays, MessageCircle, MessagesSquare, User, Trophy } from 'lucide-react';

export default function MobileNav() {
    const { currentUser, unreadChatCount } = useAuth();

    return (
        <nav className="mobile-bottom-nav">
            <NavLink to="/" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                <div className="m-nav-icon-box">
                    <Home size={18} />
                </div>
                <span>Home</span>
            </NavLink>
            <NavLink to="/games" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                <div className="m-nav-icon-box">
                    <Gamepad2 size={18} />
                </div>
                <span>Games</span>
            </NavLink>
            <NavLink to="/tournaments" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                <div className="m-nav-icon-box">
                    <Trophy size={18} />
                </div>
                <span>Tournaments</span>
            </NavLink>
            <NavLink to="/fixtures" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                <div className="m-nav-icon-box">
                    <CalendarDays size={18} />
                </div>
                <span>Fixtures</span>
            </NavLink>

            {currentUser ? (
                <>
                    <NavLink to="/chat" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                        <div className="m-nav-icon-box" style={{ position: 'relative' }}>
                            <MessageCircle size={18} />
                            {unreadChatCount > 0 && (
                                <span className="m-unread-badge">
                                    {unreadChatCount}
                                </span>
                            )}
                        </div>
                        <span>Chat</span>
                    </NavLink>
                    <NavLink to="/forums" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                        <div className="m-nav-icon-box">
                            <MessagesSquare size={18} />
                        </div>
                        <span>Forums</span>
                    </NavLink>
                    <NavLink to="/profile" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                        <div className="m-nav-icon-box">
                            <User size={18} />
                        </div>
                        <span>Profile</span>
                    </NavLink>
                </>
            ) : (
                <>
                    <NavLink to="/forums" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                        <div className="m-nav-icon-box">
                            <MessagesSquare size={18} />
                        </div>
                        <span>Forums</span>
                    </NavLink>
                    <NavLink to="/auth" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
                        <div className="m-nav-icon-box">
                            <User size={18} />
                        </div>
                        <span>Sign In</span>
                    </NavLink>
                </>
            )}

            <style>{`
                .mobile-bottom-nav {
                    display: none;
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 100;
                    background: #120723;
                    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.1);
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    backdrop-filter: blur(20px);
                    justify-content: space-around;
                    align-items: center;
                    padding: 0.5rem 0.2rem;
                    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
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
                    gap: 4px;
                    color: #8f82a8;
                    text-decoration: none;
                    font-size: 0.65rem;
                    font-weight: 800;
                    letter-spacing: 0.2px;
                    flex: 1;
                    min-width: 0;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .m-nav-icon-box {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #170a2d;
                    box-shadow: 4px 4px 8px #090314, -3px -3px 7px rgba(255, 255, 255, 0.05);
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    border: 1px solid rgba(255, 255, 255, 0.04);
                }

                .m-nav-icon-box svg {
                    transition: all 0.25s ease;
                    filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));
                }

                .m-nav-item:hover .m-nav-icon-box {
                    transform: translateY(-2px);
                    box-shadow: 5px 5px 10px #070210, -4px -4px 8px rgba(255, 255, 255, 0.08);
                    color: #e2d9f3;
                }

                .m-nav-item.active .m-nav-icon-box {
                    background: #0f051e;
                    box-shadow: inset 3px 3px 6px #06020c, inset -3px -3px 6px rgba(255, 255, 255, 0.07), 0 0 12px rgba(0, 255, 135, 0.35);
                    border: 1px solid rgba(0, 255, 135, 0.4);
                    color: var(--gv-mint);
                    transform: translateY(1px);
                }

                .m-nav-item.active .m-nav-icon-box svg {
                    filter: drop-shadow(0 0 6px rgba(0, 255, 135, 0.6));
                }

                .m-nav-item span {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 100%;
                    transition: color 0.2s ease;
                }

                .m-nav-item.active span {
                    color: var(--gv-mint);
                    text-shadow: 0 0 8px rgba(0, 255, 135, 0.3);
                }

                .m-unread-badge {
                    position: absolute;
                    top: -3px;
                    right: -3px;
                    background: var(--gv-pink);
                    color: white;
                    font-size: 0.6rem;
                    font-weight: 900;
                    padding: 1px 5px;
                    border-radius: 10px;
                    box-shadow: 2px 2px 5px #000, 0 0 8px rgba(233, 0, 82, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }
            `}</style>
        </nav>
    );
}
