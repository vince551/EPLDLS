import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { Bell, Users, Megaphone, X, UserCheck, CheckCheck, Trophy, Sparkles } from 'lucide-react';

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function notifIcon(text) {
    if (!text) return Megaphone;
    if (text.includes('Match Result') || text.includes('Fixture')) return Trophy;
    if (text.includes('[Admin Broadcast]')) return Megaphone;
    return Sparkles;
}

export default function NotificationsModal({ isOpen, onClose, onRefresh }) {
    const { currentUser, notifications, checkUnreadsAndNotifications, setNotifications } = useAuth();
    const [marking, setMarking] = useState(false);
    const [localNotifs, setLocalNotifs] = useState([]);

    useEffect(() => {
        if (isOpen && notifications) {
            setLocalNotifs(notifications);
        }
    }, [isOpen, notifications]);

    // Auto mark all notifications as read when modal opens
    useEffect(() => {
        if (!isOpen || !currentUser?.id) return;

        const unread = (notifications || []).filter(n => !n.isRead);
        if (unread.length === 0) return;

        setLocalNotifs(prev => prev.map(n => ({ ...n, isRead: true })));

        apiFetch('/notifications.php?action=mark_all_read', {
            method: 'POST',
            body: { userId: currentUser.id }
        }).then(() => {
            checkUnreadsAndNotifications();
        }).catch(console.error);
    }, [isOpen, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!isOpen || !currentUser) return null;

    const friendRequests = currentUser.friendRequests || [];
    const unreadCount = localNotifs.filter(n => !n.isRead).length;

    const handleAcceptRequest = async (reqId) => {
        try {
            await apiFetch('/friends.php?action=accept', {
                method: 'POST',
                body: { userId: currentUser.id, requesterId: reqId }
            });
            await checkUnreadsAndNotifications();
            if (onRefresh) onRefresh();
        } catch (e) {
            alert(e.message || 'Failed to accept friend request');
        }
    };

    const handleMarkAllRead = async () => {
        if (marking) return;
        setMarking(true);
        setLocalNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
        try {
            await apiFetch('/notifications.php?action=mark_all_read', {
                method: 'POST',
                body: { userId: currentUser.id }
            });
            if (setNotifications) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            }
            await checkUnreadsAndNotifications();
        } catch (e) {
            alert(e.message || 'Failed to mark notifications as read');
        } finally {
            setMarking(false);
        }
    };

    const handleMarkOneRead = async (id) => {
        setLocalNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        try {
            await apiFetch('/notifications.php?action=mark_read', {
                method: 'POST',
                body: { id, userId: currentUser.id }
            });
            await checkUnreadsAndNotifications();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="notif-modal-overlay" onClick={onClose}>
            <div className="notif-modal gv-card" onClick={(e) => e.stopPropagation()}>
                <div className="notif-modal-header">
                    <div>
                        <h3 className="notif-modal-title">
                            <Bell size={20} /> Notifications
                        </h3>
                        {(unreadCount > 0 || friendRequests.length > 0) && (
                            <span className="notif-modal-subtitle">
                                {friendRequests.length > 0 && `${friendRequests.length} request${friendRequests.length > 1 ? 's' : ''}`}
                                {friendRequests.length > 0 && unreadCount > 0 && ' · '}
                                {unreadCount > 0 && `${unreadCount} unread`}
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {localNotifs.some(n => !n.isRead) && (
                            <button
                                type="button"
                                className="gv-btn gv-btn-secondary notif-mark-all-btn"
                                onClick={handleMarkAllRead}
                                disabled={marking}
                            >
                                <CheckCheck size={14} /> Mark all read
                            </button>
                        )}
                        <button type="button" className="notif-close-btn" onClick={onClose} aria-label="Close">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {friendRequests.length > 0 && (
                    <div className="notif-section">
                        <h4 className="notif-section-title notif-section-friends">
                            <Users size={14} /> Friend Requests
                            <span className="notif-section-count">{friendRequests.length}</span>
                        </h4>
                        {friendRequests.map(reqId => (
                            <div key={reqId} className="notif-item notif-item-request">
                                <div className="notif-item-icon-wrap notif-icon-friends">
                                    <Users size={16} />
                                </div>
                                <div className="notif-item-body">
                                    <p className="notif-item-text">Player #{reqId} wants to connect with you</p>
                                    <button
                                        type="button"
                                        className="gv-btn gv-btn-mint notif-accept-btn"
                                        onClick={() => handleAcceptRequest(reqId)}
                                    >
                                        <UserCheck size={13} /> Accept
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="notif-section">
                    <h4 className="notif-section-title notif-section-broadcast">
                        <Megaphone size={14} /> Updates & Announcements
                    </h4>
                    {localNotifs.length === 0 ? (
                        <div className="notif-empty">
                            <Bell size={36} style={{ color: 'var(--gv-text-muted)', marginBottom: '0.5rem' }} />
                            <p>You're all caught up — no announcements yet.</p>
                        </div>
                    ) : (
                        localNotifs.map(n => {
                            const Icon = notifIcon(n.text);
                            return (
                                <button
                                    key={n.id}
                                    type="button"
                                    className={`notif-item ${n.isRead ? 'notif-read' : 'notif-unread'}`}
                                    onClick={() => !n.isRead && handleMarkOneRead(n.id)}
                                >
                                    <div className={`notif-item-icon-wrap ${n.isRead ? 'notif-icon-read' : 'notif-icon-unread'}`}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="notif-item-body">
                                        <p className="notif-item-text">{n.text}</p>
                                        <span className="notif-item-time">{timeAgo(n.createdAt)}</span>
                                    </div>
                                    {!n.isRead && <span className="notif-unread-dot" />}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
