import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { 
    ArrowLeft, Pin, Lock, MessageCircle, Heart, Trash2, Send, 
    Shield, Shirt, ArrowRight, Reply, X
} from 'lucide-react';

export default function ForumDetailPage() {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const composerRef = useRef(null);
    const postRefs = useRef({});

    const [forum, setForum] = useState(null);
    const [posts, setPosts] = useState([]);
    const [replyContent, setReplyContent] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [replyLoading, setReplyLoading] = useState(false);

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    const truncate = (text, n = 80) => {
        if (!text) return '';
        return text.length > n ? text.slice(0, n) + '…' : text;
    };

    const fetchThread = async () => {
        try {
            const data = await apiFetch(`/forums.php?action=get&id=${id}&userId=${currentUser?.id || 0}`);
            if (data) {
                setForum(data.forum);
                setPosts(data.posts || []);
            }
        } catch (e) {
            console.error('Failed to fetch forum details:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchThread();
    }, [id, currentUser?.id]);

    const scrollToPost = (postId) => {
        const el = postRefs.current[postId];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('reply-highlight');
            setTimeout(() => el.classList.remove('reply-highlight'), 1200);
        }
    };

    const handleStartReplyTo = (post) => {
        if (!currentUser) {
            alert('Please sign in to reply.');
            navigate('/auth');
            return;
        }
        setReplyingTo(post);
        composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!replyContent.trim() || !currentUser?.id) return;
        setReplyLoading(true);

        try {
            const body = {
                forumId: parseInt(id),
                userId: currentUser.id,
                content: replyContent.trim()
            };
            if (replyingTo?.id) body.replyToId = replyingTo.id;

            const res = await apiFetch('/posts.php?action=create', {
                method: 'POST',
                body
            });

            if (res.post) {
                setPosts(prev => [...prev, res.post]);
            }
            setReplyContent('');
            setReplyingTo(null);
        } catch (err) {
            alert(err.message || 'Failed to submit reply.');
        } finally {
            setReplyLoading(false);
        }
    };

    const handleToggleLike = async (postId) => {
        if (!currentUser?.id) return alert('Please sign in to like posts.');
        try {
            const res = await apiFetch('/posts.php?action=like', {
                method: 'POST',
                body: { postId, userId: currentUser.id }
            });

            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    return {
                        ...p,
                        isLiked: res.isLiked,
                        likeCount: res.likeCount
                    };
                }
                return p;
            }));
        } catch (e) {
            console.error('Failed to toggle like:', e);
        }
    };

    const handleReact = async (postId, emoji) => {
        if (!currentUser?.id) {
            alert('Please sign in to react.');
            navigate('/auth');
            return;
        }
        try {
            const res = await apiFetch('/forums.php?action=react', {
                method: 'POST',
                body: { postId, userId: currentUser.id, reaction: emoji }
            });
            if (res) {
                setPosts(prev => prev.map(p => {
                    if (p.id === postId) {
                        return {
                            ...p,
                            reactions: res.reactions || {},
                            myReaction: res.myReaction
                        };
                    }
                    return p;
                }));
            }
        } catch (e) {
            console.error('Failed to toggle reaction:', e);
        }
    };

    const handleToggleLock = async () => {
        if (currentUser?.role !== 'admin') return;
        try {
            await apiFetch('/forums.php?action=toggle_lock', {
                method: 'POST',
                body: { id: parseInt(id) }
            });
            await fetchThread();
        } catch (e) {
            alert(e.message);
        }
    };

    const handleTogglePin = async () => {
        if (currentUser?.role !== 'admin') return;
        try {
            await apiFetch('/forums.php?action=toggle_pin', {
                method: 'POST',
                body: { id: parseInt(id) }
            });
            await fetchThread();
        } catch (e) {
            alert(e.message);
        }
    };

    const handleDeleteForum = async () => {
        if (!window.confirm('Are you sure you want to delete this forum topic?')) return;
        try {
            await apiFetch(`/forums.php?action=delete&id=${id}`, { method: 'DELETE' });
            navigate('/forums');
        } catch (e) {
            alert(e.message);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gv-text-sub)' }}>Loading thread...</div>;
    }

    if (!forum) {
        return (
            <div className="gv-card" style={{ textAlign: 'center', padding: '3rem' }}>
                <h2>Topic Not Found</h2>
                <button className="gv-btn gv-btn-secondary" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => navigate('/forums')}>
                    <ArrowRight size={14} /> Back to Forums
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <button 
                className="gv-btn gv-btn-secondary"
                style={{ alignSelf: 'flex-start', padding: '0.35rem 0.8rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                onClick={() => navigate('/forums')}
            >
                <ArrowLeft size={14} /> Back to All Forums
            </button>

            <div className="gv-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            {forum.isPinned && <span className="gv-badge gv-badge-mint" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Pin size={10} /> Pinned</span>}
                            {forum.isLocked && <span className="gv-badge gv-badge-pink" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Lock size={10} /> Locked</span>}
                            {forum.gameName && <span className="gv-badge gv-badge-cyan">{forum.gameName}</span>}
                        </div>
                        <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>
                            {forum.title}
                        </h1>
                    </div>

                    {currentUser?.role === 'admin' && (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button className="gv-btn gv-btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }} onClick={handleTogglePin}>
                                <Pin size={12} /> {forum.isPinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button className="gv-btn gv-btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }} onClick={handleToggleLock}>
                                <Lock size={12} /> {forum.isLocked ? 'Unlock' : 'Lock'}
                            </button>
                            <button className="gv-btn gv-btn-primary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }} onClick={handleDeleteForum}>
                                <Trash2 size={12} /> Delete
                            </button>
                        </div>
                    )}
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--gv-text-main)', lineHeight: 1.5, background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--gv-card-border)' }}>
                    {forum.description}
                </p>

                <div style={{ fontSize: '0.75rem', color: 'var(--gv-text-sub)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Posted by <strong style={{ color: 'white' }}>{forum.creatorName || 'Admin'}</strong></span>
                    <span>·</span>
                    <span>{new Date(forum.created_at).toLocaleDateString()}</span>
                </div>
            </div>

            <div className="gv-card">
                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MessageCircle size={18} /> Replies ({posts.length})
                </h3>

                {posts.length === 0 ? (
                    <p style={{ color: 'var(--gv-text-sub)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
                        No replies yet. Be the first to join the conversation!
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {posts.map(p => (
                            <div
                                key={p.id}
                                ref={(el) => { postRefs.current[p.id] = el; }}
                                style={{
                                    background: 'rgba(0, 0, 0, 0.4)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '10px',
                                    padding: '0.85rem 1rem'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        {p.authorPic ? (
                                            <img 
                                                src={p.authorPic} 
                                                alt={p.authorName}
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                                            />
                                        ) : null}
                                        <div style={{
                                            width: '34px', height: '34px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--gv-purple), var(--gv-pink))',
                                            display: p.authorPic ? 'none' : 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.65rem', fontWeight: 900, color: 'white'
                                        }}>
                                            {getInitials(p.authorName)}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                {p.authorName} {p.authorRole === 'admin' && <span className="gv-badge gv-badge-pink" style={{ fontSize: '0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}><Shield size={9} /> Admin</span>}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--gv-cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                <Shirt size={11} /> {p.authorTeam}
                                            </div>
                                        </div>
                                    </div>

                                    <span style={{ fontSize: '0.65rem', color: 'var(--gv-text-muted)' }}>
                                        {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                {p.replyToId && (
                                    <button
                                        type="button"
                                        className="reply-quote"
                                        style={{ marginBottom: '0.5rem', width: '100%', textAlign: 'left' }}
                                        onClick={() => scrollToPost(p.replyToId)}
                                    >
                                        <span className="reply-quote-author">{p.replyToAuthorName || 'Post'}</span>
                                        <span className="reply-quote-text">{p.replyToContent || 'Original post'}</span>
                                    </button>
                                )}

                                <p style={{ fontSize: '0.85rem', color: 'var(--gv-text-main)', lineHeight: 1.4, margin: '0.5rem 0 0.75rem 0' }}>
                                    {p.content}
                                </p>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <button 
                                        onClick={() => handleToggleLike(p.id)}
                                        style={{
                                            background: p.isLiked ? 'rgba(233, 0, 82, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                            border: `1px solid ${p.isLiked ? 'var(--gv-pink)' : 'rgba(255, 255, 255, 0.08)'}`,
                                            color: p.isLiked ? 'var(--gv-pink)' : 'var(--gv-text-sub)',
                                            padding: '0.25rem 0.6rem',
                                            borderRadius: '20px',
                                            fontSize: '0.7rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            transition: 'var(--transition)'
                                        }}
                                    >
                                        <Heart size={12} fill={p.isLiked ? 'var(--gv-pink)' : 'none'} /> {p.likeCount || 0}
                                    </button>

                                    {['👍', '🔥', '😮'].map(emoji => {
                                        const count = (p.reactions && p.reactions[emoji]) || 0;
                                        const isMine = p.myReaction === emoji;
                                        return (
                                            <button
                                                key={emoji}
                                                onClick={() => handleReact(p.id, emoji)}
                                                style={{
                                                    background: isMine ? 'rgba(0, 255, 135, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                                    border: `1px solid ${isMine ? 'var(--gv-mint)' : 'rgba(255, 255, 255, 0.08)'}`,
                                                    color: isMine ? 'var(--gv-mint)' : 'var(--gv-text-sub)',
                                                    padding: '0.25rem 0.6rem',
                                                    borderRadius: '20px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                    transition: 'var(--transition)'
                                                }}
                                            >
                                                <span>{emoji}</span>
                                                <span>{count}</span>
                                            </button>
                                        );
                                    })}

                                    {!forum.isLocked && (
                                        <button
                                            type="button"
                                            onClick={() => handleStartReplyTo(p)}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.04)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                color: 'var(--gv-text-sub)',
                                                padding: '0.25rem 0.6rem',
                                                borderRadius: '20px',
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.3rem'
                                            }}
                                        >
                                            <Reply size={12} /> Reply
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {forum.isLocked ? (
                    <div style={{ marginTop: '1.5rem', background: 'rgba(233,0,82,0.1)', border: '1px solid rgba(233,0,82,0.2)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', color: 'var(--gv-pink)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <Lock size={15} /> This thread has been locked by an administrator. Replies are disabled.
                    </div>
                ) : currentUser ? (
                    <form ref={composerRef} onSubmit={handleReplySubmit} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {replyingTo && (
                            <div className="reply-composer-bar">
                                <div className="reply-composer-info">
                                    <span className="reply-composer-label">Replying to {replyingTo.authorName}</span>
                                    <span className="reply-composer-snippet">{truncate(replyingTo.content, 60)}</span>
                                </div>
                                <button type="button" className="reply-composer-dismiss" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                        <textarea 
                            className="gv-input"
                            rows="3"
                            placeholder={replyingTo ? `Reply to ${replyingTo.authorName}...` : 'Write your reply...'}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            required
                        />
                        <button type="submit" className="gv-btn gv-btn-mint" style={{ alignSelf: 'flex-end', padding: '0.5rem 1.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} disabled={replyLoading}>
                            {replyLoading ? 'Posting...' : <><Send size={15} /> Post Reply</>}
                        </button>
                    </form>
                ) : (
                    <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--gv-text-sub)', fontSize: '0.8rem' }}>
                        Please sign in to reply to this topic.
                    </div>
                )}
            </div>
        </div>
    );
}
