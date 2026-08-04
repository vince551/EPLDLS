import React from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { Bell, Users, Megaphone, X, UserCheck } from 'lucide-react';

export default function NotificationsModal({ isOpen, onClose, onRefresh }) {
    const { currentUser, notifications, checkUnreadsAndNotifications } = useAuth();

    if (!isOpen || !currentUser) return null;

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

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
        }}>
            <div className="gv-card" style={{ maxWidth: '460px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bell size={18} /> Notifications & Requests
                    </h3>
                    <button 
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Friend Requests */}
                {currentUser.friendRequests && currentUser.friendRequests.length > 0 && (
                    <div style={{ marginBottom: '1.25rem' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gv-mint)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Users size={14} /> Pending Friend Requests ({currentUser.friendRequests.length})
                        </h4>
                        {currentUser.friendRequests.map(reqId => (
                            <div key={reqId} style={{
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid var(--gv-card-border)',
                                padding: '0.6rem 0.8rem',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '0.4rem'
                            }}>
                                <span style={{ fontSize: '0.8rem', color: 'white' }}>
                                    Player #{reqId} wants to connect with you
                                </span>
                                <button 
                                    className="gv-btn gv-btn-mint"
                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                    onClick={() => handleAcceptRequest(reqId)}
                                >
                                    <UserCheck size={13} /> Accept
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Broadcast System Updates */}
                <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gv-cyan)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Megaphone size={14} /> Broadcast Announcements
                    </h4>
                    {notifications.length === 0 ? (
                        <p style={{ color: 'var(--gv-text-sub)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>
                            No announcements yet.
                        </p>
                    ) : (
                        notifications.map(n => (
                            <div key={n.id} style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                padding: '0.65rem 0.85rem',
                                borderRadius: '8px',
                                marginBottom: '0.4rem',
                                fontSize: '0.8rem',
                                color: 'var(--gv-text-main)'
                            }}>
                                {n.text}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
