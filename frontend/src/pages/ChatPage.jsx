import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Send, Check, CheckCheck, Shirt, HandMetal } from 'lucide-react';

export default function ChatPage() {
    const { currentUser, checkUnreadsAndNotifications } = useAuth();
    const [searchParams] = useSearchParams();
    const friendIdParam = searchParams.get('friendId');

    const [conversations, setConversations] = useState([]);
    const [activeFriendId, setActiveFriendId] = useState(friendIdParam ? parseInt(friendIdParam) : null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [typingTimeout, setTypingTimeout] = useState(null);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const chatEndRef = useRef(null);

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    // Fetch conversation list
    const fetchConversations = useCallback(async () => {
        if (!currentUser?.id) return;
        try {
            const data = await apiFetch(`/messages.php?action=conversations&user_id=${currentUser.id}`);
            if (Array.isArray(data)) {
                setConversations(data);
                // Default active friend if not selected
                if (!activeFriendId && data.length > 0) {
                    setActiveFriendId(data[0].id);
                }
            }
        } catch (e) {
            console.error('Failed to fetch conversations:', e);
        } finally {
            setLoadingConvs(false);
        }
    }, [currentUser?.id, activeFriendId]);

    // Fetch active conversation messages
    const fetchMessages = useCallback(async () => {
        if (!currentUser?.id || !activeFriendId) return;
        try {
            const msgs = await apiFetch(`/messages.php?action=list&user_id=${currentUser.id}&friend_id=${activeFriendId}`);
            if (Array.isArray(msgs)) {
                setMessages(msgs);
            }
        } catch (e) {
            console.error('Failed to fetch messages:', e);
        } finally {
            setLoadingMsgs(false);
        }
    }, [currentUser?.id, activeFriendId]);

    // Auto-scroll chat to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Initial Load & 3-Second Seamless Polling
    useEffect(() => {
        fetchConversations();
        if (activeFriendId) {
            setLoadingMsgs(true);
            fetchMessages();
        }
    }, [fetchConversations, fetchMessages, activeFriendId]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchConversations();
            if (activeFriendId) {
                fetchMessages();
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [fetchConversations, fetchMessages, activeFriendId]);

    // Handle Send Message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !activeFriendId || !currentUser?.id) return;

        const textToSend = inputText.trim();
        setInputText('');

        // Optimistic update
        const tempMsg = {
            id: Date.now(),
            senderId: currentUser.id,
            receiverId: activeFriendId,
            message: textToSend,
            isRead: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            await apiFetch('/messages.php?action=send', {
                method: 'POST',
                body: { senderId: currentUser.id, receiverId: activeFriendId, message: textToSend }
            });
            await apiFetch('/messages.php?action=typing', {
                method: 'POST',
                body: { userId: currentUser.id, friendId: activeFriendId, isTyping: false }
            });
            await fetchMessages();
            await fetchConversations();
            await checkUnreadsAndNotifications();
        } catch (err) {
            alert(err.message || 'Failed to send message.');
        }
    };

    // Handle typing indicator
    const handleTyping = (e) => {
        setInputText(e.target.value);
        if (!currentUser?.id || !activeFriendId) return;

        if (typingTimeout) clearTimeout(typingTimeout);

        apiFetch('/messages.php?action=typing', {
            method: 'POST',
            body: { userId: currentUser.id, friendId: activeFriendId, isTyping: true }
        }).catch(console.error);

        const timeout = setTimeout(() => {
            apiFetch('/messages.php?action=typing', {
                method: 'POST',
                body: { userId: currentUser.id, friendId: activeFriendId, isTyping: false }
            }).catch(console.error);
        }, 2000);

        setTypingTimeout(timeout);
    };

    const activeFriend = conversations.find(c => c.id === activeFriendId);

    return (
        <div className="gv-card" style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(240px, 320px) 1fr',
            height: '75vh',
            padding: 0,
            overflow: 'hidden'
        }}>
            {/* Conversations Inbox Sidebar */}
            <div style={{
                borderRight: '1px solid var(--gv-card-border)',
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--gv-card-border)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <MessageCircle size={18} /> Direct Messages
                    </h3>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loadingConvs ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--gv-text-sub)', fontSize: '0.8rem' }}>
                            Loading conversations...
                        </div>
                    ) : conversations.length === 0 ? (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--gv-text-sub)', fontSize: '0.8rem' }}>
                            <MessageCircle size={36} style={{ color: 'var(--gv-text-muted)', marginBottom: '0.5rem' }} />
                            <p>No active friends yet. Go to Players page and accept a friend request!</p>
                        </div>
                    ) : (
                        conversations.map(c => {
                            const isSelected = c.id === activeFriendId;
                            return (
                                <div 
                                    key={c.id}
                                    onClick={() => {
                                        setActiveFriendId(c.id);
                                        setLoadingMsgs(true);
                                    }}
                                    style={{
                                        padding: '0.85rem 1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        cursor: 'pointer',
                                        background: isSelected ? 'rgba(0, 255, 135, 0.12)' : 'transparent',
                                        borderLeft: isSelected ? '4px solid var(--gv-mint)' : '4px solid transparent',
                                        transition: 'var(--transition)',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                    }}
                                >
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        {c.pic ? (
                                            <img 
                                                src={c.pic} 
                                                alt={c.name}
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                                            />
                                        ) : null}
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--gv-purple), var(--gv-pink))',
                                            display: c.pic ? 'none' : 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.75rem', fontWeight: 900, color: 'white'
                                        }}>
                                            {getInitials(c.name)}
                                        </div>
                                        <span 
                                            className={`online-dot ${c.online ? 'online' : 'offline'}`}
                                            style={{ position: 'absolute', bottom: '0', right: '0' }}
                                        />
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {c.name}
                                            </span>
                                            {c.unreadCount > 0 && (
                                                <span className="unread-badge">{c.unreadCount}</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--gv-text-sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.1rem' }}>
                                            {c.lastMessageIsMine ? 'You: ' : ''}{c.lastMessage || c.team}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Conversation Thread Window */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {activeFriend ? (
                    <>
                        {/* Chat Header */}
                        <div style={{
                            padding: '0.85rem 1.25rem',
                            borderBottom: '1px solid var(--gv-card-border)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            background: 'rgba(0, 0, 0, 0.4)'
                        }}>
                            {activeFriend.pic ? (
                                <img 
                                    src={activeFriend.pic} 
                                    alt={activeFriend.name}
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                            ) : null}
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--gv-purple), var(--gv-pink))',
                                display: activeFriend.pic ? 'none' : 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.8rem', fontWeight: 900, color: 'white'
                            }}>
                                {getInitials(activeFriend.name)}
                            </div>
                            <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {activeFriend.name}
                                    <span className={`online-dot ${activeFriend.online ? 'online' : 'offline'}`} />
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--gv-cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <Shirt size={12} /> {activeFriend.team} · {activeFriend.online ? 'Online Now' : 'Offline'}
                                    {activeFriend.isTyping && (
                                        <span style={{ color: 'var(--gv-pink)', fontStyle: 'italic', marginLeft: '0.5rem' }}>typing...</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Messages Thread */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {loadingMsgs ? (
                                <div style={{ textAlign: 'center', color: 'var(--gv-text-sub)', fontSize: '0.8rem', margin: 'auto' }}>
                                    Loading messages...
                                </div>
                            ) : messages.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--gv-text-sub)', fontSize: '0.85rem', margin: 'auto' }}>
                                    <HandMetal size={40} style={{ color: 'var(--gv-text-muted)', marginBottom: '0.5rem' }} />
                                    <p>Say hello to {activeFriend.name}!</p>
                                </div>
                            ) : (
                                messages.map((m, idx) => {
                                    const isMe = m.senderId === currentUser.id;
                                    return (
                                        <div key={m.id || idx} className={`chat-bubble-row ${isMe ? 'me' : 'other'}`}>
                                            <div className={`chat-bubble ${isMe ? 'me' : 'other'}`}>
                                                <div>{m.message}</div>
                                                <div className="chat-meta">
                                                    <span>{m.timestamp ? m.timestamp.substring(11, 16) || m.timestamp : ''}</span>
                                                    {isMe && (
                                                        <span className={`read-status ${m.isRead ? 'read' : 'unread'}`} title={m.isRead ? 'Read' : 'Delivered'} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                            {m.isRead ? <CheckCheck size={14} /> : <Check size={14} />}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Message Input Bar */}
                        <form onSubmit={handleSendMessage} style={{
                            padding: '0.75rem 1rem',
                            borderTop: '1px solid var(--gv-card-border)',
                            display: 'flex',
                            gap: '0.5rem',
                            background: 'rgba(0, 0, 0, 0.4)'
                        }}>
                            <input 
                                type="text"
                                className="gv-input"
                                placeholder={`Message ${activeFriend.name}...`}
                                value={inputText}
                                onChange={handleTyping}
                                required
                            />
                            <button type="submit" className="gv-btn gv-btn-mint" style={{ padding: '0.6rem 1.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Send size={16} /> Send
                            </button>
                        </form>
                    </>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--gv-text-sub)' }}>
                        <MessageCircle size={48} style={{ color: 'var(--gv-text-muted)', marginBottom: '0.5rem' }} />
                        <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>Select a friend from the left inbox to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
}
