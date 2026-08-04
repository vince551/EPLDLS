import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { Trophy, Search, CheckCircle2, FileText, Calendar, ArrowRight, X } from 'lucide-react';

export default function TournamentsPage() {
    const { activeGame, games } = useAuth();
    const [tournaments, setTournaments] = useState([]);
    const [fixtures, setFixtures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedTourn, setSelectedTourn] = useState(null);

    useEffect(() => {
        let isMounted = true;
        Promise.all([
            apiFetch('/tournaments.php?action=list').catch(() => []),
            apiFetch('/fixtures.php?action=list').catch(() => [])
        ]).then(([tData, fData]) => {
            if (isMounted) {
                if (Array.isArray(tData)) setTournaments(tData);
                if (Array.isArray(fData)) setFixtures(fData);
                setLoading(false);
            }
        });
        return () => { isMounted = false; };
    }, []);

    const filtered = tournaments.filter(t => {
        if (activeGame !== 'all' && t.gameId && t.gameId != activeGame) return false;
        if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    // Compute Standings for Selected Tournament Modal
    const computeStandings = (tournId) => {
        const tFixtures = fixtures.filter(f => f.tournId === tournId);
        const stats = {};

        tFixtures.forEach(f => {
            if (!stats[f.home]) stats[f.home] = { team: f.home, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };
            if (!stats[f.away]) stats[f.away] = { team: f.away, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };

            if (f.played && f.homeScore !== null && f.awayScore !== null) {
                stats[f.home].P++;
                stats[f.away].P++;
                stats[f.home].GF += f.homeScore;
                stats[f.home].GA += f.awayScore;
                stats[f.away].GF += f.awayScore;
                stats[f.away].GA += f.homeScore;

                if (f.homeScore > f.awayScore) {
                    stats[f.home].W++; stats[f.home].Pts += 3; stats[f.away].L++;
                } else if (f.awayScore > f.homeScore) {
                    stats[f.away].W++; stats[f.away].Pts += 3; stats[f.home].L++;
                } else {
                    stats[f.home].D++; stats[f.away].D++; stats[f.home].Pts += 1; stats[f.away].Pts += 1;
                }
            }
        });

        Object.values(stats).forEach(s => { s.GD = s.GF - s.GA; });
        return Object.values(stats).sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Trophy size={24} /> Tournaments & Championships
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gv-text-sub)' }}>
                        Live league tables, standings, rules and fixtures
                    </p>
                </div>
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gv-text-muted)' }} />
                    <input 
                        type="text"
                        className="gv-input"
                        placeholder="Search tournament name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ maxWidth: '240px', padding: '0.35rem 0.6rem 0.35rem 1.8rem' }}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gv-text-sub)' }}>Loading tournaments...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <Trophy size={48} style={{ color: 'var(--gv-text-muted)', margin: '0 auto 0.5rem' }} />
                    <p style={{ color: 'var(--gv-text-sub)' }}>No tournaments found matching search.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {filtered.map(t => {
                        const tFixtures = fixtures.filter(f => f.tournId === t.id);
                        const playedCount = tFixtures.filter(f => f.played).length;
                        const progress = tFixtures.length > 0 ? Math.round((playedCount / tFixtures.length) * 100) : 0;
                        const gameInfo = games.find(g => g.id == t.gameId);

                        return (
                            <div 
                                key={t.id}
                                className="gv-card"
                                onClick={() => setSelectedTourn(t)}
                                style={{
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    background: t.bgImage ? `linear-gradient(rgba(15,5,29,0.92), rgba(15,5,29,0.97)), url(${t.bgImage})` : 'var(--gv-card-bg)',
                                    backgroundSize: 'cover'
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <Trophy size={32} style={{ color: 'var(--gv-mint)' }} />
                                        <span className="gv-badge gv-badge-mint">
                                            {gameInfo ? gameInfo.name : 'All Games'}
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', marginBottom: '0.4rem' }}>
                                        {t.name}
                                    </h3>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--gv-text-sub)', marginBottom: '1rem', lineHeight: 1.4 }}>
                                        {(t.rules || '').substring(0, 90)}{(t.rules || '').length > 90 ? '...' : ''}
                                    </p>

                                    {/* Progress Bar */}
                                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginBottom: '0.75rem', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--gv-mint), var(--gv-cyan))' }}></div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                    <span style={{ color: 'var(--gv-cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                        <CheckCircle2 size={12} /> {playedCount}/{tFixtures.length} Matches Played
                                    </span>
                                    <button className="gv-btn gv-btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                        View Table <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Standings Modal */}
            {selectedTourn && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div className="gv-card" style={{ maxWidth: '650px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Trophy size={18} /> {selectedTourn.name}
                            </h3>
                            <button onClick={() => setSelectedTourn(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {selectedTourn.rules && (
                            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--gv-text-sub)' }}>
                                <strong style={{ color: 'var(--gv-mint)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                                    <FileText size={14} /> Rules & Guidelines:
                                </strong>
                                {selectedTourn.rules}
                            </div>
                        )}

                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gv-mint)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Trophy size={14} /> League Standings
                        </h4>

                        <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                            <table style={{ width: '100%', fontSize: '0.75rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--gv-text-sub)' }}>
                                        <th style={{ padding: '0.4rem' }}>#</th>
                                        <th style={{ padding: '0.4rem' }}>Team</th>
                                        <th style={{ padding: '0.4rem' }}>P</th>
                                        <th style={{ padding: '0.4rem' }}>W</th>
                                        <th style={{ padding: '0.4rem' }}>D</th>
                                        <th style={{ padding: '0.4rem' }}>L</th>
                                        <th style={{ padding: '0.4rem' }}>GD</th>
                                        <th style={{ padding: '0.4rem' }}>Pts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {computeStandings(selectedTourn.id).map((s, idx) => (
                                        <tr key={s.team} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '0.4rem', fontWeight: 'bold', color: idx === 0 ? 'var(--gv-mint)' : 'white' }}>{idx + 1}</td>
                                            <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>{s.team}</td>
                                            <td style={{ padding: '0.4rem' }}>{s.P}</td>
                                            <td style={{ padding: '0.4rem' }}>{s.W}</td>
                                            <td style={{ padding: '0.4rem' }}>{s.D}</td>
                                            <td style={{ padding: '0.4rem' }}>{s.L}</td>
                                            <td style={{ padding: '0.4rem' }}>{s.GD > 0 ? `+${s.GD}` : s.GD}</td>
                                            <td style={{ padding: '0.4rem', fontWeight: 'bold', color: 'var(--gv-mint)' }}>{s.Pts}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gv-cyan)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Calendar size={14} /> Tournament Fixtures
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {fixtures.filter(f => f.tournId === selectedTourn.id).map(f => (
                                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', fontSize: '0.75rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--gv-cyan)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                            <Calendar size={10} /> {f.weekday}, {f.date} ({f.time})
                                        </span>
                                        <div style={{ fontWeight: 800, color: 'white' }}>{f.home} vs {f.away}</div>
                                    </div>
                                    <div>{f.played ? <span className="gv-badge gv-badge-mint">{f.homeScore} - {f.awayScore}</span> : <span className="gv-badge gv-badge-cyan">Upcoming</span>}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
