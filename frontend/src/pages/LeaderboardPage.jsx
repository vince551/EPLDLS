import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { BarChart2, Trophy, Medal, Star, Shirt, Gamepad2, TrendingUp, Users } from 'lucide-react';

const GAMES = ['All Games', 'DLS', 'eFootball', 'CoD Mobile', 'PUBG', 'Free Fire', 'EA FC'];

const RANK_STYLE = [
    { bg: 'linear-gradient(135deg, #ffd700, #b8860b)', color: '#1a1200', label: '1st', icon: '🥇' },
    { bg: 'linear-gradient(135deg, #c0c0c0, #808080)', color: '#0f0f0f', label: '2nd', icon: '🥈' },
    { bg: 'linear-gradient(135deg, #cd7f32, #8b4513)', color: '#1a0800', label: '3rd', icon: '🥉' },
];

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function LeaderboardPage() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [fixtures, setFixtures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [gameFilter, setGameFilter] = useState('All Games');

    useEffect(() => {
        let isMounted = true;
        Promise.all([
            apiFetch('/users.php?action=list').catch(() => []),
            apiFetch('/fixtures.php?action=list').catch(() => []),
        ]).then(([uData, fData]) => {
            if (isMounted) {
                if (Array.isArray(uData)) setUsers(uData);
                if (Array.isArray(fData)) setFixtures(fData);
                setLoading(false);
            }
        });
        return () => { isMounted = false; };
    }, []);

    // ── Compute standings from fixtures via team name matching ──────────────
    const computeLeaderboard = () => {
        const playedFixtures = fixtures.filter(f => f.played && f.homeScore !== null);

        // Build team stats from fixtures
        const teamStats = {};
        playedFixtures.forEach(f => {
            const initTeam = (name) => {
                if (!teamStats[name]) {
                    teamStats[name] = { team: name, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };
                }
            };
            initTeam(f.home);
            initTeam(f.away);

            const hS = f.homeScore, aS = f.awayScore;
            teamStats[f.home].P++;
            teamStats[f.away].P++;
            teamStats[f.home].GF += hS;
            teamStats[f.home].GA += aS;
            teamStats[f.away].GF += aS;
            teamStats[f.away].GA += hS;

            if (hS > aS) {
                teamStats[f.home].W++; teamStats[f.home].Pts += 3; teamStats[f.away].L++;
            } else if (aS > hS) {
                teamStats[f.away].W++; teamStats[f.away].Pts += 3; teamStats[f.home].L++;
            } else {
                teamStats[f.home].D++; teamStats[f.away].D++;
                teamStats[f.home].Pts++; teamStats[f.away].Pts++;
            }
        });
        Object.values(teamStats).forEach(s => { s.GD = s.GF - s.GA; });

        // Merge users with team stats, applying optional game filter
        return users
            .filter(u => gameFilter === 'All Games' || u.favoriteGame === gameFilter)
            .map(u => {
                const stats = teamStats[u.team] || { P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };
                return { ...u, ...stats };
            })
            .sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || a.name.localeCompare(b.name));
    };

    const leaderboard = computeLeaderboard();
    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header */}
            <div className="gv-card" style={{
                background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(15,5,29,0.98))',
                border: '1px solid rgba(255,215,0,0.3)',
                padding: '1.5rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                            <BarChart2 size={26} style={{ color: '#ffd700' }} /> Global Leaderboard
                        </h1>
                        <p style={{ fontSize: '0.8rem', color: 'var(--gv-text-sub)' }}>
                            Players ranked by tournament points, goal difference &amp; goals scored
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--gv-text-sub)', fontWeight: 700 }}>
                        <Users size={14} /> {leaderboard.length} Players
                    </div>
                </div>

                {/* Game Filter Pills */}
                <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingTop: '1rem', scrollbarWidth: 'none' }}>
                    {GAMES.map(g => (
                        <button
                            key={g}
                            onClick={() => setGameFilter(g)}
                            style={{
                                whiteSpace: 'nowrap',
                                padding: '0.3rem 0.8rem',
                                borderRadius: '20px',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                border: `1px solid ${gameFilter === g ? '#ffd700' : 'rgba(255,255,255,0.1)'}`,
                                background: gameFilter === g ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
                                color: gameFilter === g ? '#ffd700' : 'var(--gv-text-sub)',
                                cursor: 'pointer',
                                transition: 'var(--transition)'
                            }}
                        >
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gv-text-sub)' }}>Loading leaderboard...</div>
            ) : leaderboard.length === 0 ? (
                <div className="gv-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <BarChart2 size={48} style={{ color: 'var(--gv-text-muted)', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--gv-text-sub)' }}>No players found for this game filter.</p>
                </div>
            ) : (
                <>
                    {/* Top 3 Podium */}
                    {leaderboard.length >= 1 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                            {leaderboard.slice(0, 3).map((player, idx) => {
                                const rs = RANK_STYLE[idx];
                                return (
                                    <div
                                        key={player.id}
                                        className="gv-card"
                                        onClick={() => navigate('/friends')}
                                        style={{
                                            background: `linear-gradient(180deg, ${idx === 0 ? 'rgba(255,215,0,0.18)' : idx === 1 ? 'rgba(192,192,192,0.12)' : 'rgba(205,127,50,0.12)'}, rgba(15,5,29,0.95))`,
                                            border: `1px solid ${idx === 0 ? 'rgba(255,215,0,0.5)' : idx === 1 ? 'rgba(192,192,192,0.4)' : 'rgba(205,127,50,0.4)'}`,
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            padding: '1.2rem 0.8rem',
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>{rs.icon}</div>
                                        <div style={{
                                            width: '52px', height: '52px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--gv-purple), var(--gv-pink))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            margin: '0 auto 0.5rem',
                                            fontSize: '0.9rem', fontWeight: 900, color: 'white',
                                            border: `2px solid ${idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : '#cd7f32'}`,
                                            boxShadow: `0 0 14px ${idx === 0 ? 'rgba(255,215,0,0.5)' : idx === 1 ? 'rgba(192,192,192,0.3)' : 'rgba(205,127,50,0.3)'}`
                                        }}>
                                            {player.pic
                                                ? <img src={player.pic} alt={player.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                : getInitials(player.name)
                                            }
                                        </div>
                                        <div style={{ fontWeight: 900, color: 'white', fontSize: '0.9rem' }}>{player.name}</div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--gv-text-sub)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                                            <Shirt size={10} /> {player.team}
                                        </div>
                                        <div style={{
                                            background: rs.bg, color: rs.color,
                                            borderRadius: '20px', padding: '0.2rem 0.7rem',
                                            fontSize: '0.85rem', fontWeight: 900, display: 'inline-block'
                                        }}>
                                            {player.Pts} pts
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.2rem', marginTop: '0.6rem' }}>
                                            {[['W', player.W, 'var(--gv-mint)'], ['D', player.D, 'var(--gv-gold)'], ['L', player.L, 'var(--gv-pink)']].map(([label, val, color]) => (
                                                <div key={label} style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 900, color }}>{val}</div>
                                                    <div style={{ fontSize: '0.55rem', color: 'var(--gv-text-muted)', fontWeight: 700 }}>{label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Full Rankings Table */}
                    <div className="gv-card">
                        <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <TrendingUp size={18} style={{ color: 'var(--gv-mint)' }} /> Full Rankings
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '480px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--gv-text-sub)', fontSize: '0.7rem', fontWeight: 800 }}>
                                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'left' }}>#</th>
                                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'left' }}>Player</th>
                                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>P</th>
                                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>W</th>
                                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>D</th>
                                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>L</th>
                                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>GF</th>
                                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>GD</th>
                                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', color: 'var(--gv-mint)' }}>Pts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.map((player, idx) => (
                                        <tr
                                            key={player.id}
                                            style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                background: idx < 3 ? `rgba(${idx === 0 ? '255,215,0' : idx === 1 ? '192,192,192' : '205,127,50'}, 0.05)` : 'transparent',
                                                cursor: 'pointer',
                                                transition: 'var(--transition)'
                                            }}
                                            onClick={() => navigate('/friends')}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,255,135,0.05)'}
                                            onMouseLeave={e => e.currentTarget.style.background = idx < 3 ? `rgba(${idx === 0 ? '255,215,0' : idx === 1 ? '192,192,192' : '205,127,50'}, 0.05)` : 'transparent'}
                                        >
                                            <td style={{ padding: '0.6rem 0.4rem', fontWeight: 900, color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--gv-text-sub)' }}>
                                                {idx < 3 ? RANK_STYLE[idx].icon : idx + 1}
                                            </td>
                                            <td style={{ padding: '0.6rem 0.4rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <div style={{
                                                        width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                                                        background: 'linear-gradient(135deg, var(--gv-purple), var(--gv-pink))',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.6rem', fontWeight: 900, color: 'white', overflow: 'hidden'
                                                    }}>
                                                        {player.pic
                                                            ? <img src={player.pic} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            : getInitials(player.name)
                                                        }
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 800, color: 'white', lineHeight: 1.1 }}>{player.name}</div>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                            <Shirt size={9} /> {player.team}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: 'var(--gv-text-sub)' }}>{player.P}</td>
                                            <td style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: 'var(--gv-mint)', fontWeight: 700 }}>{player.W}</td>
                                            <td style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: 'var(--gv-gold)' }}>{player.D}</td>
                                            <td style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: 'var(--gv-pink)' }}>{player.L}</td>
                                            <td style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: 'var(--gv-text-sub)' }}>{player.GF}</td>
                                            <td style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: player.GD > 0 ? 'var(--gv-mint)' : player.GD < 0 ? 'var(--gv-pink)' : 'var(--gv-text-muted)' }}>
                                                {player.GD > 0 ? `+${player.GD}` : player.GD}
                                            </td>
                                            <td style={{ padding: '0.6rem 0.4rem', textAlign: 'center', fontWeight: 900, color: 'var(--gv-mint)', fontSize: '0.9rem' }}>{player.Pts}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--gv-text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
                            * Stats computed from all recorded tournament fixtures. Game filter applies to player's favourite game.
                        </p>
                    </div>

                    {/* Leaderboard Legend */}
                    <div className="gv-card" style={{ padding: '0.75rem 1rem', display: 'flex', gap: '1.2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {[['P', 'Played', 'var(--gv-text-sub)'], ['W', 'Won', 'var(--gv-mint)'], ['D', 'Drawn', 'var(--gv-gold)'], ['L', 'Lost', 'var(--gv-pink)'], ['GF', 'Goals For', 'var(--gv-text-sub)'], ['GD', 'Goal Diff', 'var(--gv-cyan)'], ['Pts', 'Points', 'var(--gv-mint)']].map(([abbr, full, color]) => (
                            <div key={abbr} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                                <strong style={{ color, fontWeight: 900 }}>{abbr}</strong>
                                <span style={{ color: 'var(--gv-text-muted)' }}>= {full}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
