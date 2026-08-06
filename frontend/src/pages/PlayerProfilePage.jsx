import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Users, Trophy, Gamepad2, Twitter, Instagram, Youtube, Mail } from 'lucide-react';

export default function PlayerProfilePage() {
    const { currentUser } = useAuth();
    const { playerId } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    useEffect(() => {
        loadProfile();
    }, [playerId, currentUser?.id]);

    const loadProfile = async () => {
        try {
            const data = await apiFetch(`/players.php?action=profile&profile_id=${playerId}&user_id=${currentUser?.id || 0}`);
            setProfile(data);
            setIsFollowing(data.isFollowing || false);
            setLoading(false);
        } catch (e) {
            console.error('Failed to load profile:', e);
            setLoading(false);
        }
    };

    const handleFollow = async () => {
        if (!currentUser) {
            navigate('/auth');
            return;
        }
        try {
            await apiFetch('/players.php?action=follow', {
                method: 'POST',
                body: { follower_id: currentUser.id, following_id: playerId }
            });
            setIsFollowing(true);
        } catch (e) {
            alert(e.message || 'Failed to follow');
        }
    };

    const handleUnfollow = async () => {
        try {
            await apiFetch('/players.php?action=unfollow', {
                method: 'POST',
                body: { follower_id: currentUser.id, following_id: playerId }
            });
            setIsFollowing(false);
        } catch (e) {
            alert(e.message || 'Failed to unfollow');
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gv-text-sub)' }}>Loading profile...</div>;
    }

    if (!profile) {
        return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gv-text-sub)' }}>Player not found</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Back Button */}
            <button
                className="gv-btn gv-btn-secondary"
                onClick={() => navigate(-1)}
                style={{ width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <ArrowLeft size={16} /> Back
            </button>

            {/* Profile Header */}
            <div className="gv-card" style={{
                background: 'linear-gradient(135deg, rgba(56,0,60,0.9), rgba(15,5,29,0.95))',
                border: '1px solid rgba(0, 255, 135, 0.25)',
                padding: '2rem',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: '2rem',
                alignItems: 'center'
            }}>
                {/* Avatar */}
                <div style={{ position: 'relative' }}>
                    {profile.pic ? (
                        <img
                            src={profile.pic}
                            alt={profile.name}
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--gv-mint)' }}
                        />
                    ) : null}
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--gv-purple), var(--gv-pink))',
                        display: profile.pic ? 'none' : 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.8rem', fontWeight: 900, color: 'white',
                        border: '3px solid var(--gv-mint)'
                    }}>
                        {getInitials(profile.name)}
                    </div>
                </div>

                {/* Info */}
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white', margin: '0 0 0.5rem 0' }}>
                        {profile.name}
                    </h1>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <span className="gv-badge gv-badge-cyan" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            {profile.team}
                        </span>
                        <span className="gv-badge gv-badge-mint" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Gamepad2 size={12} /> {profile.favoriteGame || 'DLS'}
                        </span>
                        <span className="gv-badge" style={{
                            background: profile.online ? 'rgba(0, 255, 135, 0.1)' : 'rgba(100, 100, 100, 0.1)',
                            color: profile.online ? 'var(--gv-mint)' : '#aaa'
                        }}>
                            {profile.online ? '🟢 Online' : 'Offline'}
                        </span>
                    </div>
                    {profile.bio && (
                        <p style={{ color: 'var(--gv-text-sub)', margin: 0, fontSize: '0.9rem', lineHeight: 1.4 }}>
                            {profile.bio}
                        </p>
                    )}
                </div>

                {/* Stats & Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--gv-text-sub)' }}>Stats</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '0.5rem', minWidth: '200px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--gv-cyan)' }}>
                                    {profile.stats?.friends || 0}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--gv-text-muted)', marginTop: '0.2rem' }}>Friends</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--gv-pink)' }}>
                                    {profile.stats?.followers || 0}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--gv-text-muted)', marginTop: '0.2rem' }}>Followers</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--gv-gold)' }}>
                                    {profile.stats?.forumsCreated || 0}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--gv-text-muted)', marginTop: '0.2rem' }}>Forums</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {currentUser?.id !== parseInt(playerId) && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                            {profile.friendStatus === 'accepted' ? (
                                <button
                                    className="gv-btn gv-btn-mint"
                                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                                    onClick={() => navigate(`/chat?friendId=${playerId}`)}
                                >
                                    <MessageCircle size={14} /> Chat
                                </button>
                            ) : (
                                <button
                                    className="gv-btn gv-btn-secondary"
                                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                                >
                                    <Users size={14} /> {profile.friendStatus || 'Add Friend'}
                                </button>
                            )}
                            <button
                                className={`gv-btn ${isFollowing ? 'gv-btn-mint' : 'gv-btn-secondary'}`}
                                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                                onClick={isFollowing ? handleUnfollow : handleFollow}
                            >
                                <Heart size={14} fill={isFollowing ? 'currentColor' : 'none'} /> {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Social Links */}
            {(profile.twitter || profile.instagram || profile.discord || profile.youtube || profile.tiktok) && (
                <div className="gv-card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: 'white', marginTop: 0, marginBottom: '1rem' }}>
                        Social Media
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {profile.twitter && (
                            <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer" className="gv-btn gv-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
                                <Twitter size={14} /> {profile.twitter}
                            </a>
                        )}
                        {profile.instagram && (
                            <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer" className="gv-btn gv-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
                                <Instagram size={14} /> {profile.instagram}
                            </a>
                        )}
                        {profile.youtube && (
                            <a href={`https://youtube.com/@${profile.youtube}`} target="_blank" rel="noopener noreferrer" className="gv-btn gv-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
                                <Youtube size={14} /> {profile.youtube}
                            </a>
                        )}
                        {profile.discord && (
                            <a href={`discord:${profile.discord}`} className="gv-btn gv-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
                                <Mail size={14} /> {profile.discord}
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Recent Forums */}
            {profile.recentForums && profile.recentForums.length > 0 && (
                <div className="gv-card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: 'white', marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Trophy size={16} /> Recent Forums
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {profile.recentForums.map(forum => (
                            <div
                                key={forum.id}
                                onClick={() => navigate(`/forums/${forum.id}`)}
                                style={{
                                    padding: '0.75rem',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(0, 255, 135, 0.08)';
                                    e.currentTarget.style.borderColor = 'var(--gv-mint)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                }}
                            >
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', marginBottom: '0.3rem' }}>
                                    {forum.title}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--gv-text-muted)' }}>
                                    {new Date(forum.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Joined Date */}
            <div className="gv-card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--gv-text-sub)' }}>
                    Joined {new Date(profile.joinedDate).toLocaleDateString()}
                </div>
            </div>
        </div>
    );
}
