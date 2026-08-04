import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { CalendarDays, Clock, CheckCircle2, Star, Calendar } from 'lucide-react';

export default function FixturesPage() {
    const { currentUser } = useAuth();
    const [fixtures, setFixtures] = useState([]);
    const [filter, setFilter] = useState('all'); // 'all' | 'upcoming' | 'played' | 'mine'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch('/fixtures.php?action=list')
            .then(data => {
                if (Array.isArray(data)) setFixtures(data);
            })
            .catch(err => console.error('Failed to load fixtures:', err))
            .finally(() => setLoading(false));
    }, []);

    const filtered = fixtures.filter(f => {
        if (filter === 'upcoming') return !f.played;
        if (filter === 'played') return f.played;
        if (filter === 'mine' && currentUser?.team) return f.home === currentUser.team || f.away === currentUser.team;
        return true;
    });

    // Group by date
    const grouped = {};
    filtered.forEach(f => {
        if (!grouped[f.date]) grouped[f.date] = [];
        grouped[f.date].push(f);
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarDays size={24} /> Match Schedule & Results
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--gv-text-sub)' }}>
                    Track upcoming fixtures, live match times and submitted scores
                </p>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
                <button 
                    className={`gv-btn ${filter === 'all' ? 'gv-btn-primary' : 'gv-btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    onClick={() => setFilter('all')}
                >
                    <CalendarDays size={14} /> All ({fixtures.length})
                </button>
                <button 
                    className={`gv-btn ${filter === 'upcoming' ? 'gv-btn-primary' : 'gv-btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    onClick={() => setFilter('upcoming')}
                >
                    <Clock size={14} /> Upcoming ({fixtures.filter(f => !f.played).length})
                </button>
                <button 
                    className={`gv-btn ${filter === 'played' ? 'gv-btn-primary' : 'gv-btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    onClick={() => setFilter('played')}
                >
                    <CheckCircle2 size={14} /> Results ({fixtures.filter(f => f.played).length})
                </button>
                {currentUser?.team && (
                    <button 
                        className={`gv-btn ${filter === 'mine' ? 'gv-btn-mint' : 'gv-btn-secondary'}`}
                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        onClick={() => setFilter('mine')}
                    >
                        <Star size={14} /> My Squad Matches
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gv-text-sub)' }}>Loading fixtures...</div>
            ) : Object.keys(grouped).length === 0 ? (
                <div className="gv-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <CalendarDays size={48} style={{ color: 'var(--gv-text-muted)', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--gv-text-sub)' }}>No matches found for this filter.</p>
                </div>
            ) : (
                Object.keys(grouped).map(dateKey => (
                    <div key={dateKey}>
                        <div style={{
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            color: 'var(--gv-mint)',
                            marginBottom: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}>
                            <Calendar size={14} /> {grouped[dateKey][0]?.weekday} · {dateKey}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {grouped[dateKey].map(f => {
                                const isMyTeam = currentUser?.team && (f.home === currentUser.team || f.away === currentUser.team);
                                return (
                                    <div 
                                        key={f.id}
                                        className="gv-card"
                                        style={{
                                            padding: '0.85rem 1.1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            background: isMyTeam ? 'rgba(0, 255, 135, 0.1)' : 'var(--gv-card-bg)',
                                            borderColor: isMyTeam ? 'var(--gv-mint)' : 'var(--gv-card-border)'
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--gv-cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                <Clock size={10} /> {f.time}
                                            </span>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'white', marginTop: '0.1rem' }}>
                                                <span style={{ color: f.home === currentUser?.team ? 'var(--gv-mint)' : 'white' }}>{f.home}</span>
                                                <span style={{ color: 'var(--gv-text-sub)', margin: '0 0.4rem' }}>vs</span>
                                                <span style={{ color: f.away === currentUser?.team ? 'var(--gv-mint)' : 'white' }}>{f.away}</span>
                                            </div>
                                        </div>

                                        <div>
                                            {f.played ? (
                                                <div style={{
                                                    fontSize: '1rem',
                                                    fontWeight: 900,
                                                    color: 'var(--gv-mint)',
                                                    background: 'rgba(0, 255, 135, 0.15)',
                                                    padding: '0.3rem 0.8rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(0, 255, 135, 0.3)'
                                                }}>
                                                    {f.homeScore} – {f.awayScore}
                                                </div>
                                            ) : (
                                                <span className="gv-badge gv-badge-cyan">Upcoming</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
