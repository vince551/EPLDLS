import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Users, Search, MessageCircle, Check, UserPlus, Shirt } from 'lucide-react';
import SocialLinks from '../components/SocialLinks';

export default function FriendsPage() {
    const { currentUser, checkUnreadsAndNotifications } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [friends, setFriends] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    const loadFriendsData = async () => {
        try {
            if (currentUser) {
                const data = await apiFetch(`/friends.php?action=list&userId=${currentUser.id}`);
                if (data) {
                    setUsers(data.users || []);
                    setFriends(data.friends || []);
                    setIncomingRequests(data.incomingRequests || []);
                    setOutgoingRequests(data.outgoingRequests || []);
                }
            } else {
                const allUsers = await apiFetch('/users.php?action=list');
                if (Array.isArray(allUsers)) {
                    setUsers(allUsers);
                }
            }
        } catch (e) {
            console.error('Failed to load friends:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFriendsData();
    }, [currentUser?.id]);

    const handleSendRequest = async (targetId) => {
        if (!currentUser) {
            navigate('/auth');
            return;
        }
        try {
            await apiFetch('/friends.php?action=request', {
                method: 'POST',
                body: { userId: currentUser.id, targetId }
            });
            await loadFriendsData();
            await checkUnreadsAndNotifications();
        } catch (e) {
            alert(e.message || 'Failed to send request');
        }
    };

    const handleAcceptRequest = async (requesterId) => {
        try {
            await apiFetch('/friends.php?action=accept', {
                method: 'POST',
                body: { userId: currentUser.id, requesterId }
            });
            await loadFriendsData();
            await checkUnreadsAndNotifications();
        } catch (e) {
            alert(e.message || 'Failed to accept request');
        }
    };

    const filteredUsers = users.filter(u => {
        if (u.id === currentUser?.id) return false;
        if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.team.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={24} /> Players Roster & Connections
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gv-text-sub)' }}>
                        Connect with fellow gamers across DLS, eFootball, CoDM, PUBG & more
                    </p>
                </div>
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gv-text-muted)' }} />
                    <input 
                        type="text"
                        className="gv-input"
                        placeholder="Search player or team name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ maxWidth: '240px', padding: '0.35rem 0.6rem 0.35rem 1.8rem' }}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gv-text-sub)' }}>Loading players...</div>
            ) : filteredUsers.length === 0 ? (
                <div className="gv-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Users size={48} style={{ color: 'var(--gv-text-muted)', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--gv-text-sub)' }}>No players found matching search.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }} className="friends-grid">
                    {filteredUsers.map(u => {
                        const isFriend = friends.includes(u.id);
                        const isIncoming = incomingRequests.includes(u.id);
                        const isOutgoing = outgoingRequests.includes(u.id);

                        return (
                            <div 
                                key={u.id}
                                className="gv-card"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.65rem',
                                    padding: '0.85rem 1rem'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        {u.pic ? (
                                            <img 
                                                src={u.pic}
                                                alt={u.name}
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                                            />
                                        ) : null}
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--gv-purple), var(--gv-pink))',
                                            display: u.pic ? 'none' : 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.8rem', fontWeight: 900, color: 'white'
                                        }}>
                                            {getInitials(u.name)}
                                        </div>
                                        <span 
                                            className={`online-dot ${u.online ? 'online' : 'offline'}`}
                                            style={{ position: 'absolute', bottom: '2px', right: '2px' }}
                                        />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {u.name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--gv-cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                            <Shirt size={12} /> {u.team}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    {isFriend ? (
                                        <button 
                                            className="gv-btn gv-btn-mint"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                            onClick={() => navigate(`/chat?friendId=${u.id}`)}
                                        >
                                            <MessageCircle size={14} /> Chat
                                        </button>
                                    ) : isIncoming ? (
                                        <button 
                                            className="gv-btn gv-btn-mint"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                            onClick={() => handleAcceptRequest(u.id)}
                                        >
                                            <Check size={14} /> Accept
                                        </button>
                                    ) : isOutgoing ? (
                                        <span className="gv-badge gv-badge-mint" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Check size={12} /> Sent</span>
                                    ) : (
                                        <button 
                                            className="gv-btn gv-btn-secondary"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                            onClick={() => handleSendRequest(u.id)}
                                        >
                                            <UserPlus size={14} /> Add
                                        </button>
                                    )}
                                </div>
                                </div>
                                <SocialLinks user={u} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
