import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import {
    Globe, Users, TrendingUp, User, MessageCircle, Trophy, Star,
    Clock, Heart, Share2, Zap
} from 'lucide-react';

export default function FeedPage() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('personal');
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchFeed = async (tab) => {
        if (!currentUser) return;
        setLoading(true);
        setError('');

        try {
            let url = '/feed.php?action=';

            switch (tab) {
                case 'personal':
                    url += `personal&user_id=${currentUser.id}`;
                    break;
                case 'global':
                    url += 'global';
                    break;
                case 'trending':
                    url += 'trending';
                    break;
                case 'player':
                    url += `player&player_id=${currentUser.id}`;
                    break;
                default:
                    url += `personal&user_id=${currentUser.id}`;
            }

            const data = await apiFetch(url);
            if (Array.isArray(data)) {
                setFeed(data);
            } else {
                setFeed([]);
            }
        } catch (e) {
            console.error('Failed to fetch feed:', e);
            setError(e.message || 'Failed to load feed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeed(activeTab);
    }, [activeTab, currentUser?.id]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'forum': return <MessageCircle size={16} />;
            case 'tournament': return <Trophy size={16} />;
            case 'match': return <Zap size={16} />;
            case 'player': return <User size={16} />;
            default: return <Star size={16} />;
        }
    };

    const getActivityColor = (type) => {
        switch (type) {
            case 'forum': return '#e90052';
            case 'tournament': return '#ffd700';
            case 'match': return '#04f5ff';
            case 'player': return '#00ff87';
            default: return '#8b5cf6';
        }
    };

    const FeedCard = ({ item }) => {
        const handleClick = () => {
            if (item.type === 'forum' && item.forumId) {
                navigate(`/forums/${item.forumId}`);
            } else if (item.type === 'player' && item.playerId) {
                navigate(`/player/${item.playerId}`);
            } else if (item.type === 'tournament' && item.tournamentId) {
                navigate('/tournaments');
            }
        };

        const isClickable = (item.type === 'forum' && item.forumId) ||
            (item.type === 'player' && item.playerId) ||
            item.type === 'tournament';

        return (
            <div
                onClick={isClickable ? handleClick : undefined}
                style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1rem',
                    cursor: isClickable ? 'pointer' : 'default',
                    transition: 'var(--transition)',
                    display: 'flex',
                    gap: '0.75rem'
                }}
                onMouseEnter={e => {
                    if (isClickable) {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                        e.currentTarget.style.borderColor = getActivityColor(item.type);
                    }
                }}
                onMouseLeave={e => {
                    if (isClickable) {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    }
                }}
            >
                {/* Icon */}
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: `rgba(${getActivityColor(item.type) === '#e90052' ? '233,0,82' : getActivityColor(item.type) === '#ffd700' ? '255,215,0' : getActivityColor(item.type) === '#04f5ff' ? '4,245,255' : '0,255,135'}, 0.15)`,
                    border: `2px solid ${getActivityColor(item.type)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getActivityColor(item.type),
                    flexShrink: 0
                }}>
                    {getActivityIcon(item.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', color: 'white', lineHeight: 1.4, marginBottom: '0.4rem' }}>
                        <strong style={{ color: 'var(--gv-mint)' }}>{item.playerName || 'Player'}</strong>{' '}
                        {item.action || 'performed an action'}
                    </div>

                    {item.title && (
                        <div style={{
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            color: 'white',
                            marginBottom: '0.3rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {item.title}
                        </div>
                    )}

                    {item.description && (
                        <p style={{
                            fontSize: '0.75rem',
                            color: 'var(--gv-text-sub)',
                            margin: '0.3rem 0 0 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                        }}>
                            {item.description}
                        </p>
                    )}

                    {/* Metadata */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '0.5rem',
                        fontSize: '0.7rem',
                        color: 'var(--gv-text-muted)'
                    }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={12} /> {timeAgo(item.timestamp)}
                        </span>
                        {item.engagement && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Heart size={12} style={{ color: 'var(--gv-pink)' }} /> {item.engagement}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Globe size={24} /> Community Feed
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--gv-text-sub)' }}>
                    Stay updated with forums, tournaments, and player activity
                </p>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                overflowX: 'auto',
                paddingBottom: '0.2rem',
                scrollbarWidth: 'none'
            }}>
                {[
                    { id: 'personal', label: 'Your Feed', icon: <User size={15} /> },
                    { id: 'global', label: 'Global', icon: <Globe size={15} /> },
                    { id: 'trending', label: 'Trending', icon: <TrendingUp size={15} /> },
                    { id: 'player', label: 'Your Activity', icon: <Zap size={15} /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            border: activeTab === tab.id ? '2px solid var(--gv-mint)' : '1px solid rgba(255,255,255,0.15)',
                            background: activeTab === tab.id ? 'rgba(0, 255, 135, 0.12)' : 'rgba(0,0,0,0.3)',
                            color: activeTab === tab.id ? 'var(--gv-mint)' : 'var(--gv-text-sub)',
                            cursor: 'pointer',
                            transition: 'var(--transition)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Feed Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gv-text-sub)' }}>
                    Loading feed...
                </div>
            ) : error ? (
                <div style={{
                    background: 'rgba(233, 0, 82, 0.15)',
                    border: '1px solid var(--gv-pink)',
                    color: 'var(--gv-pink)',
                    padding: '1rem',
                    borderRadius: '12px',
                    textAlign: 'center'
                }}>
                    {error}
                </div>
            ) : feed.length === 0 ? (
                <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '3rem 1rem',
                    textAlign: 'center'
                }}>
                    <Globe size={48} style={{ color: 'var(--gv-text-muted)', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--gv-text-sub)', fontSize: '0.9rem' }}>
                        {activeTab === 'personal' && 'Follow players to see their activity in your feed'}
                        {activeTab === 'global' && 'No activity yet'}
                        {activeTab === 'trending' && 'Check back soon for trending content'}
                        {activeTab === 'player' && 'Your recent activity will appear here'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {feed.map((item, index) => (
                        <FeedCard key={item.id || index} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}
