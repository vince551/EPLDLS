import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Settings, Users, Gamepad2, Trophy, CalendarDays, PlusCircle, Megaphone, Trash2, ShieldCheck, ShieldAlert, FileText, CheckCircle2, Pencil, X, Zap, UserCheck } from 'lucide-react';

export default function AdminDashboard() {
    const { currentUser, games, setGames } = useAuth();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    const [fixtures, setFixtures] = useState([]);

    // Add Game
    const [newGameName, setNewGameName] = useState('');
    const [newGameIcon, setNewGameIcon] = useState('🎮');
    const [newGameBanner, setNewGameBanner] = useState('');
    const [newGameDesc, setNewGameDesc] = useState('');

    // Add Tournament
    const [newTournName, setNewTournName] = useState('');
    const [newTournGameId, setNewTournGameId] = useState('');
    const [newTournRules, setNewTournRules] = useState('');

    // Auto-generate fixtures
    const [genTournId, setGenTournId] = useState('');
    const [selectedTeams, setSelectedTeams] = useState([]);
    const [genStartDate, setGenStartDate] = useState('');
    const [genTime, setGenTime] = useState('18:00');
    const [genLoading, setGenLoading] = useState(false);

    // Edit single fixture
    const [editingFixture, setEditingFixture] = useState(null);
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');

    // Scores
    const [scores, setScores] = useState({});

    // Broadcast
    const [broadcastText, setBroadcastText] = useState('');

    const loadAdminData = async () => {
        try {
            const [uData, tData, fData, gData] = await Promise.all([
                apiFetch('/users.php?action=list').catch(() => []),
                apiFetch('/tournaments.php?action=list').catch(() => []),
                apiFetch('/fixtures.php?action=list').catch(() => []),
                apiFetch('/games.php?action=list').catch(() => [])
            ]);
            if (Array.isArray(uData)) setUsers(uData);
            if (Array.isArray(tData)) setTournaments(tData);
            if (Array.isArray(fData)) setFixtures(fData);
            if (Array.isArray(gData)) setGames(gData);
        } catch (e) {
            console.error('Failed to load admin data:', e);
        }
    };

    useEffect(() => {
        if (currentUser && currentUser.role !== 'admin') { navigate('/'); return; }
        loadAdminData();
    }, [currentUser?.id]);

    // Add Game
    const handleAddGame = async (e) => {
        e.preventDefault();
        try {
            await apiFetch('/games.php?action=create', { method: 'POST', body: { name: newGameName, icon: newGameIcon, banner: newGameBanner, description: newGameDesc } });
            setNewGameName(''); setNewGameBanner(''); setNewGameDesc('');
            loadAdminData();
            alert('Game added!');
        } catch (err) { alert(err.message); }
    };

    // Add Tournament
    const handleAddTournament = async (e) => {
        e.preventDefault();
        try {
            await apiFetch('/tournaments.php?action=create', { method: 'POST', body: { name: newTournName, gameId: newTournGameId, rules: newTournRules } });
            setNewTournName(''); setNewTournRules('');
            loadAdminData();
            alert('Tournament created!');
        } catch (err) { alert(err.message); }
    };

    // Toggle a team in the selected list for fixture generation
    const toggleTeam = (team) => {
        setSelectedTeams(prev =>
            prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
        );
    };

    // Auto-generate all round-robin fixtures for selected teams
    const handleGenerateFixtures = async (e) => {
        e.preventDefault();
        if (!genTournId) return alert('Select a tournament first');
        if (selectedTeams.length < 2) return alert('Select at least 2 teams');
        if (selectedTeams.length % 2 !== 0) return alert('Number of teams must be even');
        if (!genStartDate) return alert('Select a start date');

        setGenLoading(true);
        try {
            // Generate all round-robin pairs (each team plays every other team once)
            const pairs = [];
            for (let i = 0; i < selectedTeams.length; i++) {
                for (let j = i + 1; j < selectedTeams.length; j++) {
                    pairs.push([selectedTeams[i], selectedTeams[j]]);
                }
            }

            // Space matches 3 days apart starting from genStartDate
            let currentDate = new Date(genStartDate + 'T12:00:00');
            for (const [home, away] of pairs) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const weekday = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
                await apiFetch('/fixtures.php?action=create', {
                    method: 'POST',
                    body: { tournId: parseInt(genTournId), home, away, date: dateStr, weekday, time: genTime, stage: 'GROUP_STAGE' }
                });
                currentDate.setDate(currentDate.getDate() + 3);
            }

            setSelectedTeams([]);
            setGenStartDate('');
            loadAdminData();
            alert(`Generated ${pairs.length} fixtures successfully!`);
        } catch (err) {
            alert(err.message);
        } finally {
            setGenLoading(false);
        }
    };

    // Edit fixture date/time only
    const handleUpdateFixture = async (e) => {
        e.preventDefault();
        if (!editingFixture) return;
        try {
            const weekday = new Date(editDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
            await apiFetch('/fixtures.php?action=update', {
                method: 'POST',
                body: { id: editingFixture.id, tournId: editingFixture.tournId, home: editingFixture.home, away: editingFixture.away, date: editDate, weekday, time: editTime }
            });
            setEditingFixture(null);
            loadAdminData();
        } catch (err) { alert(err.message); }
    };

    const handleDeleteFixture = async (id) => {
        if (!window.confirm('Delete this fixture?')) return;
        try {
            await apiFetch(`/fixtures.php?action=delete&id=${id}`, { method: 'DELETE' });
            loadAdminData();
        } catch (e) { alert(e.message); }
    };

    const handleSubmitScore = async (fixId) => {
        const homeScore = parseInt(scores[`${fixId}_home`]);
        const awayScore = parseInt(scores[`${fixId}_away`]);
        if (isNaN(homeScore) || isNaN(awayScore)) return alert('Enter valid scores');
        try {
            await apiFetch('/fixtures.php?action=submit_score', { method: 'POST', body: { id: fixId, homeScore, awayScore } });
            loadAdminData();
        } catch (err) { alert(err.message); }
    };

    const handleToggleForumPermission = async (targetUserId) => {
        try {
            const res = await apiFetch('/auth.php?action=toggle_forum_permission', { method: 'POST', body: { targetUserId } });
            setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, canCreateForums: res.canCreateForums } : u));
        } catch (e) { alert(e.message); }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Delete this user account?')) return;
        try {
            await apiFetch(`/users.php?action=delete&id=${id}`, { method: 'DELETE' });
            loadAdminData();
        } catch (e) { alert(e.message); }
    };

    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (!broadcastText.trim()) return;
        try {
            await apiFetch('/notifications.php?action=broadcast', { method: 'POST', body: { text: broadcastText.trim() } });
            setBroadcastText('');
            alert('Broadcasted!');
        } catch (e) { alert(e.message); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Settings size={24} /> Admin Command Center
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--gv-text-sub)' }}>Manage games, tournaments, fixtures, and users</p>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {[
                    { label: 'Players', value: users.length, color: 'white', icon: <Users size={12} /> },
                    { label: 'Games', value: games.length, color: 'var(--gv-mint)', icon: <Gamepad2 size={12} /> },
                    { label: 'Tourneys', value: tournaments.length, color: 'var(--gv-cyan)', icon: <Trophy size={12} /> },
                    { label: 'Fixtures', value: fixtures.length, color: 'var(--gv-pink)', icon: <CalendarDays size={12} /> },
                ].map(m => (
                    <div key={m.label} className="gv-card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--gv-text-sub)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>{m.icon} {m.label}</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: m.color }}>{m.value}</div>
                    </div>
                ))}
            </div>

            {/* Forms Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>

                {/* Add Game */}
                <div className="gv-card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <PlusCircle size={16} /> Add New Game
                    </h3>
                    <form onSubmit={handleAddGame} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <input type="text" className="gv-input" placeholder="Game Title" value={newGameName} onChange={e => setNewGameName(e.target.value)} required />
                        <input type="text" className="gv-input" placeholder="Icon Emoji (🎮)" value={newGameIcon} onChange={e => setNewGameIcon(e.target.value)} required />
                        <input type="text" className="gv-input" placeholder="Banner Image URL" value={newGameBanner} onChange={e => setNewGameBanner(e.target.value)} />
                        <textarea className="gv-input" rows="2" placeholder="Brief Description" value={newGameDesc} onChange={e => setNewGameDesc(e.target.value)} />
                        <button type="submit" className="gv-btn gv-btn-mint" style={{ padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <PlusCircle size={16} /> Add Game
                        </button>
                    </form>
                </div>

                {/* Create Tournament */}
                <div className="gv-card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Trophy size={16} /> Create Tournament
                    </h3>
                    <form onSubmit={handleAddTournament} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <select className="gv-input" value={newTournGameId} onChange={e => setNewTournGameId(e.target.value)} required>
                            <option value="">-- Select Game --</option>
                            {games.map(g => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
                        </select>
                        <input type="text" className="gv-input" placeholder="Tournament Name" value={newTournName} onChange={e => setNewTournName(e.target.value)} required />
                        <textarea className="gv-input" rows="2" placeholder="Rules & Guidelines" value={newTournRules} onChange={e => setNewTournRules(e.target.value)} />
                        <button type="submit" className="gv-btn gv-btn-mint" style={{ padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <PlusCircle size={16} /> Create Tournament
                        </button>
                    </form>
                </div>

                {/* Broadcast */}
                <div className="gv-card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Megaphone size={16} /> Broadcast Notification
                    </h3>
                    <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <textarea className="gv-input" rows="3" placeholder="Type notification for all players..." value={broadcastText} onChange={e => setBroadcastText(e.target.value)} required />
                        <button type="submit" className="gv-btn gv-btn-primary" style={{ padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <Megaphone size={16} /> Send Broadcast
                        </button>
                    </form>
                </div>
            </div>

            {/* Auto-Generate Fixtures */}
            <div className="gv-card">
                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Zap size={16} style={{ color: 'var(--gv-gold)' }} /> Auto-Generate Tournament Fixtures
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--gv-text-sub)', marginBottom: '1rem' }}>
                    Select a tournament, pick an even number of teams, set a start date — the system generates all round-robin matchups automatically.
                </p>
                <form onSubmit={handleGenerateFixtures} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Tournament + Date + Time row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'block', marginBottom: '0.3rem' }}>Tournament</label>
                            <select
                                className="gv-input"
                                value={genTournId}
                                onChange={e => setGenTournId(e.target.value)}
                                required
                            >
                                <option value="">-- Select Tournament --</option>
                                {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'block', marginBottom: '0.3rem' }}>Start Date</label>
                            <input type="date" className="gv-input" value={genStartDate} onChange={e => setGenStartDate(e.target.value)} required />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'block', marginBottom: '0.3rem' }}>Match Time</label>
                            <input type="time" className="gv-input" value={genTime} onChange={e => setGenTime(e.target.value)} required />
                        </div>
                    </div>

                    {/* Team picker */}
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gv-text-sub)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <UserCheck size={14} /> Select Teams
                            <span style={{ color: selectedTeams.length % 2 === 0 && selectedTeams.length > 0 ? 'var(--gv-mint)' : 'var(--gv-pink)', fontWeight: 800 }}>
                                ({selectedTeams.length} selected{selectedTeams.length % 2 !== 0 ? ' — must be even' : selectedTeams.length >= 2 ? ' ✓' : ''})
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {users.map(u => {
                                const isSelected = selectedTeams.includes(u.team);
                                return (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => toggleTeam(u.team)}
                                        style={{
                                            padding: '0.35rem 0.8rem',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            border: isSelected ? '2px solid var(--gv-mint)' : '1px solid rgba(255,255,255,0.2)',
                                            background: isSelected ? 'rgba(0,255,135,0.15)' : 'rgba(255,255,255,0.05)',
                                            color: isSelected ? 'var(--gv-mint)' : 'var(--gv-text-sub)',
                                            transition: 'var(--transition)',
                                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                                        }}
                                    >
                                        {isSelected && <CheckCircle2 size={12} />} {u.team}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Preview */}
                    {selectedTeams.length >= 2 && selectedTeams.length % 2 === 0 && (
                        <div style={{ background: 'rgba(0,255,135,0.06)', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.75rem', color: 'var(--gv-text-sub)' }}>
                            Will generate <strong style={{ color: 'var(--gv-mint)' }}>{(selectedTeams.length * (selectedTeams.length - 1)) / 2} fixtures</strong> — every team plays each other once, spaced 3 days apart.
                        </div>
                    )}

                    <button
                        type="submit"
                        className="gv-btn gv-btn-mint"
                        disabled={genLoading || selectedTeams.length < 2 || selectedTeams.length % 2 !== 0}
                        style={{ padding: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', opacity: (selectedTeams.length < 2 || selectedTeams.length % 2 !== 0) ? 0.5 : 1 }}
                    >
                        <Zap size={16} /> {genLoading ? 'Generating...' : 'Generate All Fixtures'}
                    </button>
                </form>
            </div>

            {/* Fixtures List */}
            <div className="gv-card">
                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={16} /> Fixture Results & Management
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {fixtures.length === 0 ? (
                        <p style={{ color: 'var(--gv-text-sub)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>No fixtures yet. Generate fixtures above.</p>
                    ) : fixtures.map(f => (
                        <div key={f.id}>
                            {editingFixture?.id === f.id ? (
                                /* Inline edit form */
                                <form onSubmit={handleUpdateFixture} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(0,255,135,0.06)', borderRadius: '8px', border: '1px solid rgba(0,255,135,0.3)', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 800, color: 'white', flex: 1, minWidth: '150px', fontSize: '0.8rem' }}>{f.home} vs {f.away}</span>
                                    <input type="date" className="gv-input" value={editDate} onChange={e => setEditDate(e.target.value)} required style={{ maxWidth: '140px' }} />
                                    <input type="time" className="gv-input" value={editTime} onChange={e => setEditTime(e.target.value)} required style={{ maxWidth: '110px' }} />
                                    <button type="submit" className="gv-btn gv-btn-mint" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Save</button>
                                    <button type="button" className="gv-btn gv-btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setEditingFixture(null)}><X size={14} /></button>
                                </form>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', fontSize: '0.8rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <span style={{ color: 'var(--gv-cyan)', fontSize: '0.7rem' }}>{f.weekday}, {f.date} {f.time && `· ${f.time}`}</span>
                                        <div style={{ fontWeight: 800, color: 'white' }}>{f.home} vs {f.away}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                                        {f.played ? (
                                            <span className="gv-badge gv-badge-mint">{f.homeScore} - {f.awayScore}</span>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                                <input type="number" placeholder="H" style={{ width: '40px', padding: '4px', textAlign: 'center' }} className="gv-input" onChange={e => setScores(prev => ({ ...prev, [`${f.id}_home`]: e.target.value }))} />
                                                <span style={{ color: '#aaa' }}>-</span>
                                                <input type="number" placeholder="A" style={{ width: '40px', padding: '4px', textAlign: 'center' }} className="gv-input" onChange={e => setScores(prev => ({ ...prev, [`${f.id}_away`]: e.target.value }))} />
                                                <button className="gv-btn gv-btn-mint" style={{ padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }} onClick={() => handleSubmitScore(f.id)}>
                                                    <CheckCircle2 size={12} /> Save
                                                </button>
                                            </div>
                                        )}
                                        <button className="gv-btn gv-btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                            onClick={() => { setEditingFixture(f); setEditDate(f.date); setEditTime(f.time?.substring(0, 5) || ''); }}>
                                            <Pencil size={12} />
                                        </button>
                                        <button className="gv-btn gv-btn-primary" style={{ padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }} onClick={() => handleDeleteFixture(f.id)}>
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* User Management */}
            <div className="gv-card">
                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldCheck size={16} /> User Moderation & Forum Permissions
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.75rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--gv-text-sub)' }}>
                                <th style={{ padding: '0.5rem' }}>Player</th>
                                <th style={{ padding: '0.5rem' }}>Team</th>
                                <th style={{ padding: '0.5rem' }}>Game</th>
                                <th style={{ padding: '0.5rem' }}>Forum Creation</th>
                                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.5rem', fontWeight: 'bold', color: 'white' }}>{u.name}</td>
                                    <td style={{ padding: '0.5rem', color: 'var(--gv-cyan)' }}>{u.team}</td>
                                    <td style={{ padding: '0.5rem' }}>{u.favoriteGame || 'DLS'}</td>
                                    <td style={{ padding: '0.5rem' }}>
                                        <button className={`gv-btn ${u.canCreateForums ? 'gv-btn-mint' : 'gv-btn-secondary'}`}
                                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                            onClick={() => handleToggleForumPermission(u.id)}>
                                            {u.canCreateForums ? <><ShieldCheck size={12} /> Granted</> : <><ShieldAlert size={12} /> Restricted</>}
                                        </button>
                                    </td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                        <button className="gv-btn gv-btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => handleDeleteUser(u.id)}>
                                            <Trash2 size={12} /> Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
