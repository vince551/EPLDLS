import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Users, Search, MessageCircle, Check, UserPlus, Shirt, Heart, Heart as HeartFilled, MapPin, Star } from 'lucide-react';

export default function PlayersPage() {
    const { currentUser, checkUnreadsAndNotifications } = useAuth();
    const navigate = useNavigate();
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [gameFilter, setGameFilter] = useState('');
    const [onlineOnly, setOnlineOnly] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    const loadPlayers = async (resetOffset = false) => {
        if (!currentUser) return;

        try {
            const currentOffset = resetOffset ? 0 : offset;
            let url = `/players.php?action=discover&user_id=${currentUser.id}&limit=20&offset=${currentOffset}`;

            if (gameFilter) url += `&game=${gameFilter}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (onlineOnly) url += `&online=true`;

            const data = await apiFetch(url);
            if (Array.isArray(data)) {
                if (resetOffset) {
                    setPlayers(data);
                } else {
                    setPlayers(prev => [...prev, ...data]);
                }
                setHasMore(data.length === 20);
                setOffset(resetOffset ? 20 : currentOffset + 20);
            }
        } catch (e) {
            console.error('Failed to load players:', e);
        } finally {
            if (resetOffset) setLoading(false);
        }
    };

    useEffect(() => {
        setOffset(0);
        setLoading(true);
        loadPlayers(true);
    }, [search, gameFilter, onlineOnly, currentUser?.id]);

    const handleSendRequest = async (targetId) => {
        if (!currentUser) {
            navigate('/auth');
            return;
        }
        try {
            await apiFetch('/players.php?action=send_request', {
                method: 'POST',
                body: { userId: currentUser.id, targetId }
            });
            await loadPlayers(true);
            await checkUnreadsAndNotifications();
        } catch (e) {
            alert(e.message || 'Failed to send request');
        }
    };

    const handleAcceptRequest = async (requesterId) => {
        try {
            await apiFetch('/players.php?action=accept_request', {
                method: 'POST',
                body: { userId: currentUser.id, requesterId }
            });
            await loadPlayers(true);
            await checkUnreadsAndNotifications();
        } catch (e) {
            alert(e.message || 'Failed to accept request');
        }
    };

    const handleFollow = async (targetId) => {
        if (!currentUser) {
            navigate('/auth');
            return;
        }
        try {
            await apiFetch('/players.php?action=follow', {
                method: 'POST',
                body: { follower_id: currentUser.id, following_id: targetId }
            });
            await loadPlayers(true);
        } catch (e) {
            alert(e.message || 'Failed to follow');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={24} /> Discover Players
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gv-text-sub)' }}>
                        Find and connect with fellow gamers
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="gv-card" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
                padding: '1rem'
            }}>
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gv-text-muted)' }} />
                    <input
                        type="text"
                        className="gv-input"
                        placeholder="Search player or team..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: '2rem' }}
                    />
                </div>

                <select
                    className="gv-input"
                    value={gameFilter}
                    onChange={(e) => setGameFilter(e.target.value)}
                >
                    <option value="">All Games</option>
                    <option value="dls">Dream League Soccer</option>
                    <option value="efootball">eFootball</option>
                    <option value="codm">Call of Duty Mobile</option>
                    <option value="pubg">PUBG Mobile</option>
                    <option value="freefire">Free Fire</option>
                    <option value="eafc">EA Sports FC</option>
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={onlineOnly}
                        onChange={(e) => setOnlineOnly(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: 700 }}>Online Only</span>
                </label>
            </div>

            {/* Players Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gv-text-sub)' }}>
                    Loading players...
                </div>
            ) : players.length === 0 ? (
                <div className="gv-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Users size={48} style={{ color: 'var(--gv-text-muted)', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--gv-text-sub)' }}>No players found matching your criteria.</p>
                </div>
            ) : (
                <>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '1rem'
                    }}>
                        {players.map(player => (
                            <div
                                key={player.id}
                                className="gv-card"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem',
                                    padding: '1rem'
                                }}
                            >
                                {/* Player Avatar & Status */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        {player.pic ? (
                                            <img
                                                src={player.pic}
                                                alt={player.name}
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                                            />
                                        ) : null}
                                        <div style={{
                                            width: '48px', height: '48px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--gv-purple), var(--gv-pink))',
                                            display: player.pic ? 'none' : 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.9rem', fontWeight: 900, color: 'white'
                                        }}>
                                            {getInitials(player.name)}
                                        </div>
                                        <span
                                            style={{
                                                position: 'absolute',
                                                bottom: '0',
                                                right: '0',
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '50%',
                                                background: player.online ? 'var(--gv-mint)' : '#666',
                                                border: '2px solid var(--gv-card-bg)'
                                            }}
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {player.name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--gv-cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                            <Shirt size={12} /> {player.team}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--gv-text-sub)', marginTop: '0.1rem' }}>
                                            {player.online ? '🟢 Online' : 'Offline'}
                                        </div>
                                    </div>
                                </div>

                                {/* Bio */}
                                {player.bio && (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--gv-text-sub)', margin: 0, lineHeight: 1.3 }}>
                                        {player.bio}
                                    </p>
                                )}

                                {/* Game Badge */}
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', background: 'rgba(0, 255, 135, 0.1)', borderRadius: '6px', width: 'fit-content' }}>
                                    <Star size={12} style={{ color: 'var(--gv-mint)' }} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gv-mint)' }}>
                                        {player.favoriteGame || 'DLS'}
                                    </span>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                                    {player.friendStatus === 'accepted' ? (
                                        <button
                                            className="gv-btn gv-btn-mint"
                                            style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                                            onClick={() => navigate(`/chat?friendId=${player.id}`)}
                                        >
                                            <MessageCircle size={13} /> Chat
                                        </button>
                                    ) : player.friendStatus === 'pending' ? (
                                        <button
                                            className="gv-btn gv-btn-mint"
                                            style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                                            onClick={() => handleAcceptRequest(player.id)}
                                        >
                                            <Check size={13} /> Accept
                                        </button>
                                    ) : (
                                        <button
                                            className="gv-btn gv-btn-secondary"
                                            style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                                            onClick={() => handleSendRequest(player.id)}
                                        >
                                            <UserPlus size={13} /> Add
                                        </button>
                                    )}

                                    <button
                                        className="gv-btn gv-btn-secondary"
                                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                        onClick={() => navigate(`/player/${player.id}`)}
                                        title="View profile"
                                    >
                                        <MapPin size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Load More */}
                    {hasMore && (
                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <button
                                className="gv-btn gv-btn-secondary"
                                onClick={() => loadPlayers(false)}
                                style={{ padding: '0.6rem 1.2rem' }}
                            >
                                Load More Players
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
