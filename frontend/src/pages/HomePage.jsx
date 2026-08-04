import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { 
    MessageCircle, MessagesSquare, Gamepad2, Trophy, CalendarDays, Users, 
    Radio, Clock, ArrowRight, Shirt, Search, Sparkles, KeyRound, UserPlus, Flame, ShieldCheck, Zap
} from 'lucide-react';

export default function HomePage() {
    const { currentUser, games, activeGame, setActiveGame, unreadChatCount } = useAuth();
    const navigate = useNavigate();

    const [tournaments, setTournaments] = useState([]);
    const [fixtures, setFixtures] = useState([]);
    const [forums, setForums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        let isMounted = true;
        Promise.all([
            apiFetch('/tournaments.php?action=list').catch(() => []),
            apiFetch('/fixtures.php?action=list').catch(() => []),
            apiFetch('/forums.php?action=list').catch(() => [])
        ]).then(([tournData, fixData, forumData]) => {
            if (isMounted) {
                if (Array.isArray(tournData)) setTournaments(tournData);
                if (Array.isArray(fixData)) setFixtures(fixData);
                if (Array.isArray(forumData)) setForums(forumData);
                setLoading(false);
            }
        });
        return () => { isMounted = false; };
    }, []);

    // Filter tournaments by active game
    const filteredTournaments = tournaments.filter(t => {
        if (activeGame !== 'all' && t.gameId && t.gameId != activeGame) return false;
        if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const getGreeting = () => {
        const hour = new Date().getHours();
        return hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Logged-in Welcome Banner or Guest World-Class Hero */}
            {currentUser ? (
                <div className="gv-card" style={{
                    background: 'linear-gradient(135deg, rgba(56,0,60,0.9), rgba(15,5,29,0.95))',
                    border: '1px solid rgba(0, 255, 135, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {currentUser.pic ? (
                            <img 
                                src={currentUser.pic} 
                                alt={currentUser.name}
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '2px solid var(--gv-mint)',
                                    boxShadow: '0 0 12px var(--gv-mint-glow)'
                                }}
                            />
                        ) : null}
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--gv-purple), var(--gv-pink))',
                            display: currentUser.pic ? 'none' : 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.1rem', fontWeight: 900, color: 'white',
                            border: '2px solid var(--gv-mint)',
                            boxShadow: '0 0 12px var(--gv-mint-glow)'
                        }}>
                            {getInitials(currentUser.name)}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gv-text-sub)', fontWeight: 700 }}>
                                {getGreeting()}, Gamer
                            </div>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white' }}>
                                {currentUser.name}
                            </h2>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                                <span className="gv-badge gv-badge-cyan" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Shirt size={11} /> {currentUser.team}
                                </span>
                                <span className="gv-badge gv-badge-mint" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Gamepad2 size={11} /> {currentUser.favorite_game || 'DLS'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="welcome-banner-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="gv-btn gv-btn-primary" onClick={() => navigate('/chat')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <MessageCircle size={15} /> Messages
                            {unreadChatCount > 0 && <span className="unread-badge">{unreadChatCount}</span>}
                        </button>
                        <button className="gv-btn gv-btn-secondary" onClick={() => navigate('/forums')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <MessagesSquare size={15} /> Forums
                        </button>
                    </div>
                </div>
            ) : (
                /* World-Class Guest Hero Banner */
                <div className="gv-card" style={{
                    background: 'radial-gradient(circle at top right, rgba(0, 255, 135, 0.15), rgba(56, 0, 60, 0.95) 60%), linear-gradient(135deg, rgba(15, 5, 29, 0.98), rgba(28, 10, 48, 0.95))',
                    border: '1px solid rgba(0, 255, 135, 0.4)',
                    boxShadow: '0 0 30px rgba(0, 255, 135, 0.15)',
                    padding: '2rem 1.5rem',
                    borderRadius: '16px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px' }}>
                        <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem', borderRadius: '20px', background: 'rgba(0, 255, 135, 0.12)', border: '1px solid var(--gv-mint)', color: 'var(--gv-mint)', fontSize: '0.75rem', fontWeight: 800, marginBottom: '1rem' }}>
                            <Sparkles size={14} /> WELCOME TO GAMEVERSE HUB
                        </div>
                        <h1 className="hero-heading" style={{ fontSize: 'clamp(1.35rem, 4vw, 2.5rem)', fontWeight: 900, color: 'white', lineHeight: 1.15, marginBottom: '0.8rem', letterSpacing: '-0.5px' }}>
                            The Ultimate <span style={{ color: 'var(--gv-mint)' }}>Multi-Game Arena</span> & Community Platform
                        </h1>
                        <p className="hero-subtext" style={{ fontSize: '0.95rem', color: '#c4b5fd', lineHeight: 1.5, marginBottom: '1.5rem', fontWeight: 500 }}>
                            Track live scores, fixtures, community forums, and player rosters for DLS, eFootball, CoD Mobile, PUBG & EA FC.
                        </p>

                        {/* Live Platform Stats */}
                        <div className="hero-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.6rem 0.8rem', borderRadius: '10px' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--gv-mint)' }}>6+ Titles</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--gv-text-sub)', fontWeight: 700 }}>Featured Games</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.6rem 0.8rem', borderRadius: '10px' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--gv-cyan)' }}>{tournaments.length} Active</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--gv-text-sub)', fontWeight: 700 }}>Tournaments</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.6rem 0.8rem', borderRadius: '10px' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--gv-gold)' }}>{fixtures.length} Matches</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--gv-text-sub)', fontWeight: 700 }}>Scheduled & Live</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.6rem 0.8rem', borderRadius: '10px' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--gv-pink)' }}>{forums.length} Threads</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--gv-text-sub)', fontWeight: 700 }}>Community Discussions</div>
                            </div>
                        </div>

                        <div className="hero-cta-group" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button 
                                className="gv-btn gv-btn-primary"
                                onClick={() => navigate('/auth')}
                                style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 0 20px var(--gv-mint-glow)' }}
                            >
                                <KeyRound size={16} /> Sign In
                            </button>
                            <button 
                                className="gv-btn gv-btn-secondary"
                                onClick={() => navigate('/auth')}
                                style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <UserPlus size={16} /> Register
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Feature Shortcut Carousel */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.2rem', scrollbarWidth: 'none' }}>
                <button className="gv-btn gv-btn-secondary" style={{ whiteSpace: 'nowrap', borderRadius: '20px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => navigate('/games')}>
                    <Gamepad2 size={14} /> Browse Games
                </button>
                <button className="gv-btn gv-btn-secondary" style={{ whiteSpace: 'nowrap', borderRadius: '20px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => navigate('/tournaments')}>
                    <Trophy size={14} /> All Tournaments
                </button>
                <button className="gv-btn gv-btn-secondary" style={{ whiteSpace: 'nowrap', borderRadius: '20px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => navigate('/fixtures')}>
                    <CalendarDays size={14} /> Match Schedule
                </button>
                <button className="gv-btn gv-btn-secondary" style={{ whiteSpace: 'nowrap', borderRadius: '20px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => navigate('/friends')}>
                    <Users size={14} /> Players Roster
                </button>
                <button className="gv-btn gv-btn-secondary" style={{ whiteSpace: 'nowrap', borderRadius: '20px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => navigate('/forums')}>
                    <MessagesSquare size={14} /> Forums & Threads
                </button>
            </div>

            {/* Featured Multi-Game Bar */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Gamepad2 size={18} /> Featured Games
                    </h3>
                    <button 
                        onClick={() => navigate('/games')}
                        style={{ background: 'none', border: 'none', color: 'var(--gv-cyan)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                        View All ({games.length}) <ArrowRight size={14} />
                    </button>
                </div>

                <div className="games-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                    {games.slice(0, 6).map(g => (
                        <div 
                            key={g.id}
                            className="gv-card"
                            onClick={() => setActiveGame(g.id)}
                            style={{
                                cursor: 'pointer',
                                padding: '0.85rem',
                                background: activeGame == g.id ? 'rgba(0, 255, 135, 0.12)' : 'var(--gv-card-bg)',
                                borderColor: activeGame == g.id ? 'var(--gv-mint)' : 'var(--gv-card-border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem'
                            }}
                        >
                            <Gamepad2 size={28} style={{ color: 'var(--gv-mint)', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white' }}>{g.name}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--gv-text-sub)' }}>
                                    {g.tournamentCount || 0} Tourneys
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Active Tournaments Feed */}
            <div className="gv-card">
                <div className="tournament-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Radio size={18} /> Live Tournaments & Leagues
                    </h3>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gv-text-muted)' }} />
                        <input 
                            type="text"
                            className="gv-input"
                            placeholder="Search tournaments..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ maxWidth: '200px', padding: '0.35rem 0.6rem 0.35rem 1.8rem', fontSize: '0.75rem' }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gv-text-sub)' }}>Loading tournaments...</div>
                ) : filteredTournaments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                        <Trophy size={40} style={{ color: 'var(--gv-text-muted)', marginBottom: '0.5rem' }} />
                        <p style={{ color: 'var(--gv-text-sub)', fontSize: '0.85rem' }}>No tournaments found for this game selection.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {filteredTournaments.map(t => {
                            const tFixtures = fixtures.filter(f => f.tournId === t.id);
                            const playedCount = tFixtures.filter(f => f.played).length;

                            return (
                                <div key={t.id} style={{
                                    background: 'rgba(0, 0, 0, 0.4)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '12px',
                                    padding: '1rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Trophy size={16} style={{ color: 'var(--gv-gold)' }} /> {t.name}
                                        </div>
                                        <span className="gv-badge gv-badge-mint">
                                            {playedCount}/{tFixtures.length} Played
                                        </span>
                                    </div>
                                    {t.rules && (
                                        <p style={{ fontSize: '0.75rem', color: 'var(--gv-text-sub)', marginBottom: '0.75rem' }}>
                                            {t.rules.substring(0, 120)}{t.rules.length > 120 ? '...' : ''}
                                        </p>
                                    )}

                                    {/* Fixtures Snippet */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        {tFixtures.slice(0, 3).map(f => (
                                            <div key={f.id} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '0.5rem 0.75rem',
                                                background: 'rgba(255, 255, 255, 0.04)',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem'
                                            }}>
                                                <div>
                                                    <span style={{ color: 'var(--gv-cyan)', fontSize: '0.65rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <Clock size={11} /> {f.weekday}, {f.date} · {f.time}
                                                    </span>
                                                    <div style={{ fontWeight: 800, color: 'white' }}>
                                                        {f.home} <span style={{ color: '#aaa' }}>vs</span> {f.away}
                                                    </div>
                                                </div>
                                                <div>
                                                    {f.played ? (
                                                        <span className="gv-badge gv-badge-mint">{f.homeScore} - {f.awayScore}</span>
                                                    ) : (
                                                        <span className="gv-badge gv-badge-cyan">Upcoming</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button 
                                        onClick={() => navigate('/tournaments')}
                                        style={{
                                            width: '100%',
                                            marginTop: '0.75rem',
                                            padding: '0.5rem',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid var(--gv-card-border)',
                                            borderRadius: '6px',
                                            color: 'var(--gv-cyan)',
                                            fontSize: '0.75rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.3rem'
                                        }}
                                    >
                                        View Full Standings & Fixtures <ArrowRight size={13} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Community Discussions Preview */}
            {forums.length > 0 && (
                <div className="gv-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MessagesSquare size={18} style={{ color: 'var(--gv-pink)' }} /> Active Community Discussions
                        </h3>
                        <button 
                            onClick={() => navigate('/forums')}
                            style={{ background: 'none', border: 'none', color: 'var(--gv-pink)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                            View All Forums ({forums.length}) <ArrowRight size={14} />
                        </button>
                    </div>

                    <div className="forums-preview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                        {forums.slice(0, 3).map(f => (
                            <div 
                                key={f.id}
                                onClick={() => navigate(`/forums/${f.id}`)}
                                style={{
                                    background: 'rgba(0, 0, 0, 0.4)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '10px',
                                    padding: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'var(--transition)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                                    <span className="gv-badge gv-badge-pink" style={{ fontSize: '0.65rem' }}>
                                        {f.gameName || 'General'}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--gv-text-muted)' }}>
                                        by {f.authorName || 'Gamer'}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', marginBottom: '0.4rem', lineHeight: 1.2 }}>
                                    {f.title}
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--gv-text-sub)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {f.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
