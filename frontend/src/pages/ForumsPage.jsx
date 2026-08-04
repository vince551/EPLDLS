import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { 
    MessagesSquare, Plus, Lock, Pin, Globe, MessageCircle, 
    Gamepad2, X, AlertTriangle, Send, Bookmark
} from 'lucide-react';

export default function ForumsPage() {
    const { currentUser, activeGame, games } = useAuth();
    const navigate = useNavigate();

    const [forums, setForums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Create Forum Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [gameId, setGameId] = useState(activeGame !== 'all' ? activeGame : '');
    const [createLoading, setCreateLoading] = useState(false);
    const [error, setError] = useState('');

    const canCreate = currentUser && (currentUser.role === 'admin' || currentUser.can_create_forums);

    const fetchForums = async () => {
        try {
            const data = await apiFetch(`/forums.php?action=list${activeGame !== 'all' ? `&game_id=${activeGame}` : ''}`);
            if (Array.isArray(data)) setForums(data);
        } catch (e) {
            console.error('Failed to load forums:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchForums();
    }, [activeGame]);

    const handleCreateForum = async (e) => {
        e.preventDefault();
        setError('');
        setCreateLoading(true);

        try {
            const res = await apiFetch('/forums.php?action=create', {
                method: 'POST',
                body: {
                    userId: currentUser.id,
                    gameId: gameId || null,
                    title,
                    description
                }
            });
            setShowCreateModal(false);
            setTitle('');
            setDescription('');
            await fetchForums();
            navigate(`/forums/${res.id}`);
        } catch (err) {
            setError(err.message || 'Failed to create forum thread');
        } finally {
            setCreateLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MessagesSquare size={24} /> Community Discussion Forums
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gv-text-sub)' }}>
                        Discuss game strategies, loadouts, squads, and general gaming news
                    </p>
                </div>

                {canCreate ? (
                    <button 
                        className="gv-btn gv-btn-mint"
                        onClick={() => setShowCreateModal(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                        <Plus size={16} /> Create Forum Topic
                    </button>
                ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--gv-text-muted)', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Lock size={13} /> Forum topic creation is granted by Admin
                    </span>
                )}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gv-text-sub)' }}>Loading forums...</div>
            ) : forums.length === 0 ? (
                <div className="gv-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <MessagesSquare size={48} style={{ color: 'var(--gv-text-muted)', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--gv-text-sub)' }}>No discussion topics found for this game selection.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {forums.map(f => (
                        <div 
                            key={f.id}
                            className="gv-card"
                            onClick={() => navigate(`/forums/${f.id}`)}
                            style={{
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: f.isPinned ? 'linear-gradient(135deg, rgba(56,0,60,0.9), rgba(22,9,40,0.85))' : 'var(--gv-card-bg)',
                                borderColor: f.isPinned ? 'var(--gv-mint)' : 'var(--gv-card-border)',
                                padding: '1rem 1.25rem'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                                <Globe size={28} style={{ color: 'var(--gv-cyan)', flexShrink: 0 }} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                        {f.isPinned && <span className="gv-badge gv-badge-mint" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Pin size={10} /> Pinned</span>}
                                        {f.isLocked && <span className="gv-badge gv-badge-pink" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Lock size={10} /> Locked</span>}
                                        {f.gameName && <span className="gv-badge gv-badge-cyan">{f.gameName}</span>}
                                    </div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {f.title}
                                    </h3>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--gv-text-sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.1rem' }}>
                                        {f.description}
                                    </p>
                                </div>
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '1rem' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--gv-mint)', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
                                    <MessageCircle size={14} /> {f.postCount} replies
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--gv-text-muted)', marginTop: '0.1rem' }}>
                                    By {f.creatorName || 'Admin'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Topic Modal */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div className="gv-card" style={{ maxWidth: '500px', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Plus size={18} /> Create New Forum Thread
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', display: 'flex' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(233,0,82,0.15)', color: 'var(--gv-pink)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <AlertTriangle size={14} /> {error}
                            </div>
                        )}

                        <form onSubmit={handleCreateForum} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                                    <Gamepad2 size={14} /> Associated Game Category
                                </label>
                                <select 
                                    className="gv-input"
                                    value={gameId}
                                    onChange={(e) => setGameId(e.target.value)}
                                >
                                    <option value="">General Community Lounge</option>
                                    {games.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                                    <Bookmark size={14} /> Thread Title
                                </label>
                                <input 
                                    type="text"
                                    className="gv-input"
                                    placeholder="e.g. Best DLS Season 26 4-3-3 Tactics"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                                    <MessageCircle size={14} /> Thread Description / Initial Post
                                </label>
                                <textarea 
                                    className="gv-input"
                                    rows="4"
                                    placeholder="Share your thoughts, strategies or questions..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                />
                            </div>

                            <button type="submit" className="gv-btn gv-btn-mint" disabled={createLoading} style={{ padding: '0.75rem', marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                {createLoading ? 'Publishing...' : <><Send size={16} /> Publish Topic</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
