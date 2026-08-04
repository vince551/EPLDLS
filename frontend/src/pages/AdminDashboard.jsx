import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Settings, Users, Gamepad2, Trophy, CalendarDays, PlusCircle, Megaphone, Trash2, ShieldCheck, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';

export default function AdminDashboard() {
    const { currentUser, games, setGames } = useAuth();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    const [fixtures, setFixtures] = useState([]);

    // Forms State
    const [newGameName, setNewGameName] = useState('');
    const [newGameIcon, setNewGameIcon] = useState('🎮');
    const [newGameBanner, setNewGameBanner] = useState('');
    const [newGameDesc, setNewGameDesc] = useState('');

    const [newTournName, setNewTournName] = useState('');
    const [newTournGameId, setNewTournGameId] = useState(1);
    const [newTournRules, setNewTournRules] = useState('');

    const [fixTournId, setFixTournId] = useState('');
    const [fixHome, setFixHome] = useState('');
    const [fixAway, setFixAway] = useState('');
    const [fixDate, setFixDate] = useState('');
    const [fixTime, setFixTime] = useState('');
    const [scores, setScores] = useState({});

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

            if (tData.length > 0) setFixTournId(tData[0].id);
            if (uData.length >= 2) {
                setFixHome(uData[0].team);
                setFixAway(uData[1].team);
            }
        } catch (e) {
            console.error('Failed to load admin data:', e);
        }
    };

    useEffect(() => {
        if (currentUser && currentUser.role !== 'admin') {
            navigate('/');
            return;
        }
        loadAdminData();
    }, [currentUser]);

    // Add Game
    const handleAddGame = async (e) => {
        e.preventDefault();
        try {
            await apiFetch('/games.php?action=create', {
                method: 'POST',
                body: { name: newGameName, icon: newGameIcon, banner: newGameBanner, description: newGameDesc }
            });
            setNewGameName('');
            setNewGameBanner('');
            setNewGameDesc('');
            loadAdminData();
            alert('Game added successfully!');
        } catch (err) {
            alert(err.message);
        }
    };

    // Add Tournament
    const handleAddTournament = async (e) => {
        e.preventDefault();
        try {
            await apiFetch('/tournaments.php?action=create', {
                method: 'POST',
                body: { name: newTournName, gameId: newTournGameId, rules: newTournRules }
            });
            setNewTournName('');
            setNewTournRules('');
            loadAdminData();
            alert('Tournament created successfully!');
        } catch (err) {
            alert(err.message);
        }
    };

    // Schedule Fixture
    const handleScheduleFixture = async (e) => {
        e.preventDefault();
        if (fixHome === fixAway) return alert('Home and Away teams must be different');
        try {
            const d = new Date(fixDate);
            const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });

            await apiFetch('/fixtures.php?action=create', {
                method: 'POST',
                body: { tournId: fixTournId, home: fixHome, away: fixAway, date: fixDate, weekday, time: fixTime }
            });
            loadAdminData();
            alert('Fixture scheduled successfully!');
        } catch (err) {
            alert(err.message);
        }
    };

    // Submit Match Score
    const handleSubmitScore = async (fixId) => {
        const homeScore = parseInt(scores[`${fixId}_home`]);
        const awayScore = parseInt(scores[`${fixId}_away`]);
        if (isNaN(homeScore) || isNaN(awayScore)) return alert('Please enter valid score integers');

        try {
            await apiFetch('/fixtures.php?action=submit_score', {
                method: 'POST',
                body: { id: fixId, homeScore, awayScore }
            });
            loadAdminData();
            alert('Match score updated!');
        } catch (err) {
            alert(err.message);
        }
    };

    // Toggle User Forum Permission
    const handleToggleForumPermission = async (targetUserId) => {
        try {
            const res = await apiFetch('/auth.php?action=toggle_forum_permission', {
                method: 'POST',
                body: { targetUserId }
            });
            setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, canCreateForums: res.canCreateForums } : u));
        } catch (e) {
            alert(e.message);
        }
    };

    // Delete User
    const handleDeleteUser = async (id) => {
        if (!window.confirm('Delete this user account?')) return;
        try {
            await apiFetch(`/users.php?action=delete&id=${id}`, { method: 'DELETE' });
            loadAdminData();
        } catch (e) {
            alert(e.message);
        }
    };

    // Broadcast Notification
    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (!broadcastText.trim()) return;
        try {
            await apiFetch('/notifications.php?action=broadcast', {
                method: 'POST',
                body: { text: broadcastText.trim() }
            });
            setBroadcastText('');
            alert('Notification broadcasted to all users!');
        } catch (e) {
            alert(e.message);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Settings size={24} /> Admin Command Center
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--gv-text-sub)' }}>
                    Manage multi-game catalog, tournaments, schedule fixtures, moderate users and grant forum permissions
                </p>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                <div className="gv-card" style={{ textAlign: 'center', padding: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gv-text-sub)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                        <Users size={12} /> Players
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>{users.length}</div>
                </div>
                <div className="gv-card" style={{ textAlign: 'center', padding: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gv-text-sub)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                        <Gamepad2 size={12} /> Games
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--gv-mint)' }}>{games.length}</div>
                </div>
                <div className="gv-card" style={{ textAlign: 'center', padding: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gv-text-sub)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                        <Trophy size={12} /> Tourneys
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--gv-cyan)' }}>{tournaments.length}</div>
                </div>
                <div className="gv-card" style={{ textAlign: 'center', padding: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gv-text-sub)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                        <CalendarDays size={12} /> Fixtures
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--gv-pink)' }}>{fixtures.length}</div>
                </div>
            </div>

            {/* Forms Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {/* Add Game Form */}
                <div className="gv-card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <PlusCircle size={16} /> Add New Game to Catalog
                    </h3>
                    <form onSubmit={handleAddGame} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <input type="text" className="gv-input" placeholder="Game Title (e.g. Apex Legends Mobile)" value={newGameName} onChange={e => setNewGameName(e.target.value)} required />
                        <input type="text" className="gv-input" placeholder="Icon Emoji (e.g. 🎯, 🚀)" value={newGameIcon} onChange={e => setNewGameIcon(e.target.value)} required />
                        <input type="text" className="gv-input" placeholder="Banner Image URL" value={newGameBanner} onChange={e => setNewGameBanner(e.target.value)} />
                        <textarea className="gv-input" rows="2" placeholder="Brief Description" value={newGameDesc} onChange={e => setNewGameDesc(e.target.value)} />
                        <button type="submit" className="gv-btn gv-btn-mint" style={{ padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <PlusCircle size={16} /> Add Game
                        </button>
                    </form>
                </div>

                {/* Create Tournament Form */}
                <div className="gv-card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Trophy size={16} /> Create Tournament
                    </h3>
                    <form onSubmit={handleAddTournament} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <select className="gv-input" value={newTournGameId} onChange={e => setNewTournGameId(parseInt(e.target.value))}>
                            {games.map(g => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
                        </select>
                        <input type="text" className="gv-input" placeholder="Tournament Name (e.g. CoD Mobile Season 1)" value={newTournName} onChange={e => setNewTournName(e.target.value)} required />
                        <textarea className="gv-input" rows="2" placeholder="Rules & Guidelines" value={newTournRules} onChange={e => setNewTournRules(e.target.value)} />
                        <button type="submit" className="gv-btn gv-btn-mint" style={{ padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <PlusCircle size={16} /> Create Tournament
                        </button>
                    </form>
                </div>

                {/* Schedule Fixture Form */}
                <div className="gv-card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CalendarDays size={16} /> Schedule Match Fixture
                    </h3>
                    <form onSubmit={handleScheduleFixture} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <select className="gv-input" value={fixTournId} onChange={e => setFixTournId(parseInt(e.target.value))}>
                            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select className="gv-input" value={fixHome} onChange={e => setFixHome(e.target.value)}>
                                {users.map(u => <option key={u.id} value={u.team}>{u.team} ({u.name})</option>)}
                            </select>
                            <select className="gv-input" value={fixAway} onChange={e => setFixAway(e.target.value)}>
                                {users.map(u => <option key={u.id} value={u.team}>{u.team} ({u.name})</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="date" className="gv-input" value={fixDate} onChange={e => setFixDate(e.target.value)} required />
                            <input type="time" className="gv-input" value={fixTime} onChange={e => setFixTime(e.target.value)} required />
                        </div>
                        <button type="submit" className="gv-btn gv-btn-mint" style={{ padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <CalendarDays size={16} /> Schedule Fixture
                        </button>
                    </form>
                </div>

                {/* Broadcast Announcement Form */}
                <div className="gv-card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Megaphone size={16} /> System Broadcast Notification
                    </h3>
                    <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <textarea className="gv-input" rows="3" placeholder="Type notification broadcast for all players..." value={broadcastText} onChange={e => setBroadcastText(e.target.value)} required />
                        <button type="submit" className="gv-btn gv-btn-primary" style={{ padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <Megaphone size={16} /> Send Broadcast
                        </button>
                    </form>
                </div>
            </div>

            {/* Score Input List */}
            <div className="gv-card">
                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={16} /> Fixture Match Results Input
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {fixtures.map(f => (
                        <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', fontSize: '0.8rem' }}>
                            <div>
                                <span style={{ color: 'var(--gv-cyan)', fontSize: '0.7rem' }}>{f.weekday}, {f.date} ({f.time})</span>
                                <div style={{ fontWeight: 800, color: 'white' }}>{f.home} vs {f.away}</div>
                            </div>
                            <div>
                                {f.played ? (
                                    <span className="gv-badge gv-badge-mint">{f.homeScore} - {f.awayScore} (Played)</span>
                                ) : (
                                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                        <input type="number" placeholder="H" style={{ width: '40px', padding: '4px', textAlign: 'center' }} className="gv-input" onChange={e => setScores({ ...scores, [`${f.id}_home`]: e.target.value })} />
                                        <span>-</span>
                                        <input type="number" placeholder="A" style={{ width: '40px', padding: '4px', textAlign: 'center' }} className="gv-input" onChange={e => setScores({ ...scores, [`${f.id}_away`]: e.target.value })} />
                                        <button className="gv-btn gv-btn-mint" style={{ padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }} onClick={() => handleSubmitScore(f.id)}>
                                            <CheckCircle2 size={12} /> Save
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* User Moderation & Forum Permission Table */}
            <div className="gv-card">
                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldCheck size={16} /> User Moderation & Forum Permissions
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.75rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--gv-text-sub)' }}>
                                <th style={{ padding: '0.5rem' }}>Player</th>
                                <th style={{ padding: '0.5rem' }}>Squad Team</th>
                                <th style={{ padding: '0.5rem' }}>Favorite Game</th>
                                <th style={{ padding: '0.5rem' }}>Forum Topic Creation</th>
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
                                        <button 
                                            className={`gv-btn ${u.canCreateForums ? 'gv-btn-mint' : 'gv-btn-secondary'}`}
                                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                            onClick={() => handleToggleForumPermission(u.id)}
                                        >
                                            {u.canCreateForums ? <><ShieldCheck size={12} /> Granted (Author)</> : <><ShieldAlert size={12} /> Restricted (User)</>}
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
