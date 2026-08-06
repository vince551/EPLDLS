import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Send, Check, CheckCheck, Shirt, HandMetal, ArrowLeft, Reply, X } from 'lucide-react';

const isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

function mergeMessages(prev, incoming) {
    if (!Array.isArray(incoming)) return prev;

    const incomingIds = new Set(incoming.map(m => m.id));
    const temps = prev.filter(m => typeof m.id === 'number' && m.id > 1e12 && !incomingIds.has(m.id));
    const merged = [...incoming];

    for (const t of temps) {
        const matched = incoming.some(
            n => n.message === t.message && n.senderId === t.senderId
        );
        if (!matched) merged.push(t);
    }

    merged.sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')));

    if (
        prev.length === merged.length &&
        prev.every((p, i) =>
            p.id === merged[i]?.id &&
            p.isRead === merged[i]?.isRead &&
            p.message === merged[i]?.message
        )
    ) {
        return prev;
    }
    return merged;
}

function conversationsChanged(prev, next) {
    if (prev.length !== next.length) return true;
    return next.some((c, i) => {
        const p = prev[i];
        return !p ||
            p.id !== c.id ||
            p.unreadCount !== c.unreadCount ||
            p.lastMessage !== c.lastMessage ||
            p.online !== c.online ||
            p.isTyping !== c.isTyping;
    });
}

export default function ChatPage() {
    const { currentUser, checkUnreadsAndNotifications } = useAuth();
    const [searchParams] = useSearchParams();
    const friendIdParam = searchParams.get('friendId');

    const [conversations, setConversations] = useState([]);
    const [activeFriendId, setActiveFriendId] = useState(friendIdParam ? parseInt(friendIdParam) : null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [typingTimeout, setTypingTimeout] = useState(null);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);

    const chatEndRef = useRef(null);
    const messageRefs = useRef({});
    const messagesPaneRef = useRef(null);
    const isNearBottomRef = useRef(true);
    const userJustSentRef = useRef(false);
    const prevMsgCountRef = useRef(0);
    const activeFriendIdRef = useRef(activeFriendId);
    activeFriendIdRef.current = activeFriendId;

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    const formatMsgTime = (ts) => {
        if (!ts) return '';
        if (ts.length >= 16 && ts.includes('-')) return ts.substring(11, 16);
        return ts;
    };

    const truncate = (text, n = 80) => {
        if (!text) return '';
        return text.length > n ? text.slice(0, n) + '…' : text;
    };

    const scrollToBottom = (behavior = 'smooth') => {
        chatEndRef.current?.scrollIntoView({ behavior });
    };

    const handleMessagesScroll = () => {
        const pane = messagesPaneRef.current;
        if (!pane) return;
        const threshold = 80;
        isNearBottomRef.current = pane.scrollHeight - pane.scrollTop - pane.clientHeight < threshold;
    };

    const fetchConversations = useCallback(async (silent = false) => {
        if (!currentUser?.id) return;
        try {
            const data = await apiFetch(`/messages.php?action=conversations&user_id=${currentUser.id}`);
            if (Array.isArray(data)) {
                setConversations(prev => {
                    if (!conversationsChanged(prev, data)) return prev;
                    return data;
                });
                if (!activeFriendIdRef.current && data.length > 0 && !isMobileViewport()) {
                    setActiveFriendId(data[0].id);
                }
            }
        } catch (e) {
            console.error('Failed to fetch conversations:', e);
        } finally {
            if (!silent) setLoadingConvs(false);
        }
    }, [currentUser?.id]);

    const fetchMessages = useCallback(async (silent = false) => {
        const friendId = activeFriendIdRef.current;
        if (!currentUser?.id || !friendId) return;
        try {
            const msgs = await apiFetch(`/messages.php?action=list&user_id=${currentUser.id}&friend_id=${friendId}`);
            if (Array.isArray(msgs)) {
                setMessages(prev => mergeMessages(prev, msgs));
            }
        } catch (e) {
            console.error('Failed to fetch messages:', e);
        } finally {
            if (!silent) setLoadingMsgs(false);
        }
    }, [currentUser?.id]);

    // Scroll only when new messages arrive and user is at bottom (or just sent)
    useEffect(() => {
        const count = messages.length;
        const grew = count > prevMsgCountRef.current;
        prevMsgCountRef.current = count;

        if (grew && (isNearBottomRef.current || userJustSentRef.current)) {
            scrollToBottom(userJustSentRef.current ? 'smooth' : 'auto');
        }
        userJustSentRef.current = false;
    }, [messages]);

    useEffect(() => {
        setReplyingTo(null);
        isNearBottomRef.current = true;
        prevMsgCountRef.current = 0;
    }, [activeFriendId]);

    // Initial load when friend changes
    useEffect(() => {
        fetchConversations(false);
        if (activeFriendId) {
            setLoadingMsgs(true);
            setMessages([]);
            fetchMessages(false);
        } else {
            setMessages([]);
            setLoadingMsgs(false);
        }
    }, [activeFriendId, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Background polling — silent, no loading flicker
    useEffect(() => {
        if (!currentUser?.id) return;
        const interval = setInterval(() => {
            fetchConversations(true);
            if (activeFriendIdRef.current) {
                fetchMessages(true);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [currentUser?.id, fetchConversations, fetchMessages]);

    const scrollToMessage = (id) => {
        const el = messageRefs.current[id];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('reply-highlight');
            setTimeout(() => el.classList.remove('reply-highlight'), 1200);
        }
    };

    const activeFriend = conversations.find(c => c.id === activeFriendId);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !activeFriendId || !currentUser?.id) return;

        const textToSend = inputText.trim();
        const replySnapshot = replyingTo;
        setInputText('');
        setReplyingTo(null);
        userJustSentRef.current = true;
        isNearBottomRef.current = true;

        const tempMsg = {
            id: Date.now(),
            senderId: currentUser.id,
            receiverId: activeFriendId,
            message: textToSend,
            isRead: false,
            timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
            replyToId: replySnapshot?.id || null,
            replyToMessage: replySnapshot ? truncate(replySnapshot.message) : null,
            replyToSenderName: replySnapshot
                ? (replySnapshot.senderId === currentUser.id ? 'You' : (activeFriend?.name || 'User'))
                : null,
            replyToSenderId: replySnapshot?.senderId || null
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const body = { senderId: currentUser.id, receiverId: activeFriendId, message: textToSend };
            if (replySnapshot?.id) body.replyToId = replySnapshot.id;

            await apiFetch('/messages.php?action=send', { method: 'POST', body });
            await apiFetch('/messages.php?action=typing', {
                method: 'POST',
                body: { userId: currentUser.id, friendId: activeFriendId, isTyping: false }
            });
            await fetchMessages(true);
            await fetchConversations(true);
            await checkUnreadsAndNotifications();
        } catch (err) {
            alert(err.message || 'Failed to send message.');
        }
    };

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

    const handleBackToInbox = () => {
        setActiveFriendId(null);
        setMessages([]);
        setReplyingTo(null);
    };

    const handleSelectConversation = (id) => {
        if (id === activeFriendId) return;
        setActiveFriendId(id);
        setLoadingMsgs(true);
        setMessages([]);
    };

    const showThread = !!activeFriendId;

    return (
        <div className={`gv-card chat-layout ${showThread ? 'chat-thread-open' : 'chat-inbox-only'}`}>
            <div className="chat-inbox">
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
                                    onClick={() => handleSelectConversation(c.id)}
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

            <div className="chat-thread">
                {activeFriend ? (
                    <>
                        <div className="chat-thread-header">
                            <button
                                type="button"
                                className="chat-back-btn gv-btn gv-btn-secondary"
                                onClick={handleBackToInbox}
                                aria-label="Back to inbox"
                            >
                                <ArrowLeft size={16} />
                            </button>
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
                                fontSize: '0.8rem', fontWeight: 900, color: 'white', flexShrink: 0
                            }}>
                                {getInitials(activeFriend.name)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeFriend.name}</span>
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

                        <div
                            className="chat-messages-pane"
                            ref={messagesPaneRef}
                            onScroll={handleMessagesScroll}
                        >
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
                                        <div
                                            key={m.id || idx}
                                            className={`chat-bubble-row ${isMe ? 'me' : 'other'}`}
                                            ref={(el) => { if (m.id) messageRefs.current[m.id] = el; }}
                                        >
                                            <div className={`chat-bubble ${isMe ? 'me' : 'other'}`}>
                                                {m.replyToId && (
                                                    <button
                                                        type="button"
                                                        className="reply-quote"
                                                        onClick={() => scrollToMessage(m.replyToId)}
                                                    >
                                                        <span className="reply-quote-author">{m.replyToSenderName || 'Message'}</span>
                                                        <span className="reply-quote-text">{m.replyToMessage || 'Original message'}</span>
                                                    </button>
                                                )}
                                                <div>{m.message}</div>
                                                <div className="chat-meta">
                                                    <span>{formatMsgTime(m.timestamp)}</span>
                                                    {isMe && (
                                                        <span className={`read-status ${m.isRead ? 'read' : 'unread'}`} title={m.isRead ? 'Read' : 'Delivered'} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                            {m.isRead ? <CheckCheck size={14} /> : <Check size={14} />}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="chat-reply-btn"
                                                        title="Reply"
                                                        onClick={() => setReplyingTo(m)}
                                                    >
                                                        <Reply size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {replyingTo && (
                            <div className="reply-composer-bar">
                                <div className="reply-composer-info">
                                    <span className="reply-composer-label">
                                        Replying to {replyingTo.senderId === currentUser.id ? 'yourself' : activeFriend.name}
                                    </span>
                                    <span className="reply-composer-snippet">{truncate(replyingTo.message, 60)}</span>
                                </div>
                                <button type="button" className="reply-composer-dismiss" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleSendMessage} className="chat-input-bar">
                            <input
                                type="text"
                                className="gv-input"
                                placeholder={`Message ${activeFriend.name}...`}
                                value={inputText}
                                onChange={handleTyping}
                                required
                            />
                            <button type="submit" className="gv-btn gv-btn-mint chat-send-btn">
                                <Send size={16} /> <span className="chat-send-label">Send</span>
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="chat-empty-thread">
                        <MessageCircle size={48} style={{ color: 'var(--gv-text-muted)', marginBottom: '0.5rem' }} />
                        <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>Select a friend from the inbox to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
}
