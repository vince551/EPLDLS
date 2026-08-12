import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, uploadImage } from '../utils/api';
import ImageLightbox from '../components/ImageLightbox';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Send, Check, CheckCheck, Shirt, HandMetal, ArrowLeft, Reply, X, ImagePlus } from 'lucide-react';

const isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

function normalizeMessagesPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.messages)) return payload.messages;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
}

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

    const [chatImageFile, setChatImageFile] = useState(null);
    const [chatImageUrl, setChatImageUrl] = useState('');
    const [chatImageUploading, setChatImageUploading] = useState(false);
    const [chatImageError, setChatImageError] = useState('');
    const [lightboxSrc, setLightboxSrc] = useState(null);

    const chatEndRef = useRef(null);
    const messageRefs = useRef({});
    const messagesPaneRef = useRef(null);
    const fileInputRef = useRef(null);
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

    const getQuotePreviewText = (msg) => {
        if (!msg) return 'Original message';
        const text = msg.replyToMessage !== undefined ? msg.replyToMessage : msg.message;
        const img = msg.replyToImageUrl !== undefined ? msg.replyToImageUrl : msg.imageUrl;
        if ((!text || !text.trim()) && img) {
            return '📷 Image';
        }
        return text ? truncate(text, 60) : 'Original message';
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setChatImageFile(file);
        setChatImageError('');
        setChatImageUploading(true);
        try {
            const res = await uploadImage(file, 'chat');
            setChatImageUrl(res.url);
        } catch (err) {
            setChatImageError(err.message || 'Failed to upload image.');
            setChatImageFile(null);
            setChatImageUrl('');
        } finally {
            setChatImageUploading(false);
        }
    };

    const handleRemoveImage = () => {
        setChatImageFile(null);
        setChatImageUrl('');
        setChatImageError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
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

    const fetchMessages = useCallback(async (friendIdOverride = null, silent = false) => {
        const friendId = friendIdOverride ?? activeFriendIdRef.current;
        if (!currentUser?.id || !friendId) return [];
        try {
            const url = `/messages.php?action=list&user_id=${currentUser.id}&friend_id=${friendId}`;
            const payload = await apiFetch(url);
            const msgs = normalizeMessagesPayload(payload);
            console.debug('ChatPage.fetchMessages:', { url, friendId, userId: currentUser.id, returnedCount: Array.isArray(msgs) ? msgs.length : 0, payload, msgs });
            if (Array.isArray(msgs) && msgs.length > 0) {
                setMessages(prev => mergeMessages(prev, msgs));
                return msgs;
            }
            // If API returned empty array, check fallback
            if (Array.isArray(msgs)) {
                setMessages([]);
            }
            // Fallback: if API returned no messages but we have a conversation preview, show the last message
            const conv = conversations.find(c => c.id === friendId);
            if (conv && conv.lastMessage) {
                const synthetic = [{
                    id: Date.now() * -1,
                    senderId: conv.lastMessageIsMine ? currentUser.id : conv.id,
                    receiverId: conv.lastMessageIsMine ? conv.id : currentUser.id,
                    message: conv.lastMessage,
                    isRead: !!conv.lastMessageIsRead,
                    timestamp: conv.lastMessageTime || new Date().toISOString().slice(0, 19).replace('T', ' ')
                }];
                setMessages(synthetic);
                return synthetic;
            }
            return [];
        } catch (e) {
            console.error('Failed to fetch messages for friendId', friendId, e);
            return [];
        } finally {
            if (!silent) setLoadingMsgs(false);
        }
    }, [currentUser?.id, conversations]);

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
            fetchMessages(activeFriendId, false);
        } else {
            setMessages([]);
            setLoadingMsgs(false);
        }
    }, [activeFriendId, currentUser?.id, fetchConversations, fetchMessages]);

    // Background polling — silent, no loading flicker
    useEffect(() => {
        if (!currentUser?.id) return;
        const interval = setInterval(() => {
            fetchConversations(true);
            if (activeFriendIdRef.current) {
                fetchMessages(activeFriendIdRef.current, true);
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
        if ((!inputText.trim() && !chatImageUrl) || !activeFriendId || !currentUser?.id || chatImageUploading) return;

        const textToSend = inputText.trim();
        const imageToSend = chatImageUrl;
        const replySnapshot = replyingTo;
        setInputText('');
        setReplyingTo(null);
        handleRemoveImage();
        userJustSentRef.current = true;
        isNearBottomRef.current = true;

        const tempMsg = {
            id: Date.now(),
            senderId: currentUser.id,
            receiverId: activeFriendId,
            message: textToSend,
            imageUrl: imageToSend || null,
            isRead: false,
            timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
            replyToId: replySnapshot?.id || null,
            replyToMessage: replySnapshot ? getQuotePreviewText(replySnapshot) : null,
            replyToSenderName: replySnapshot
                ? (replySnapshot.senderId === currentUser.id ? 'You' : (activeFriend?.name || 'User'))
                : null,
            replyToSenderId: replySnapshot?.senderId || null
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const body = {
                senderId: currentUser.id,
                receiverId: activeFriendId,
                message: textToSend,
                imageUrl: imageToSend || undefined
            };
            if (replySnapshot?.id) body.replyToId = replySnapshot.id;

            await apiFetch('/messages.php?action=send', { method: 'POST', body });
            await apiFetch('/messages.php?action=typing', {
                method: 'POST',
                body: { userId: currentUser.id, friendId: activeFriendId, isTyping: false }
            });
            await fetchMessages(activeFriendId, true);
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
        fetchMessages(id, false);
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
                                                        <span className="reply-quote-text">{getQuotePreviewText(m)}</span>
                                                    </button>
                                                )}
                                                {m.message ? <div>{m.message}</div> : null}
                                                {m.imageUrl && (
                                                    <div style={{ marginTop: '0.4rem', marginBottom: '0.4rem' }}>
                                                        <img
                                                            src={m.imageUrl}
                                                            alt="Chat attachment"
                                                            onClick={() => setLightboxSrc(m.imageUrl)}
                                                            onError={(e) => {
                                                                const span = document.createElement('span');
                                                                span.className = 'img-fallback';
                                                                span.textContent = 'Image unavailable';
                                                                span.style.cssText = 'color: var(--gv-text-sub); font-size: 0.75rem; font-style: italic;';
                                                                e.target.replaceWith(span);
                                                            }}
                                                            style={{
                                                                maxWidth: '240px',
                                                                maxHeight: '240px',
                                                                objectFit: 'cover',
                                                                borderRadius: '8px',
                                                                cursor: 'zoom-in',
                                                                border: '1px solid rgba(255, 255, 255, 0.15)'
                                                            }}
                                                        />
                                                    </div>
                                                )}
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
                                    <span className="reply-composer-snippet">{getQuotePreviewText(replyingTo)}</span>
                                </div>
                                <button type="button" className="reply-composer-dismiss" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                        {(chatImageFile || chatImageUrl || chatImageUploading) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', margin: '0.4rem 1rem 0 1rem' }}>
                                {chatImageUrl ? (
                                    <img src={chatImageUrl} alt="Chat preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                                ) : (
                                    <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--gv-text-sub)' }}>
                                        {chatImageUploading ? '...' : 'Preview'}
                                    </div>
                                )}
                                <span style={{ fontSize: '0.8rem', color: 'var(--gv-text-main)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {chatImageUploading ? 'Uploading image...' : (chatImageFile?.name || 'Attached image')}
                                </span>
                                <button type="button" onClick={handleRemoveImage} style={{ background: 'none', border: 'none', color: 'var(--gv-pink)', cursor: 'pointer', padding: '0.2rem' }} aria-label="Remove image attachment">
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                        {chatImageError && (
                            <div style={{ color: 'var(--gv-pink)', fontSize: '0.75rem', margin: '0.2rem 1rem 0 1rem' }}>
                                {chatImageError}
                            </div>
                        )}

                        <form onSubmit={handleSendMessage} className="chat-input-bar">
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                            <button
                                type="button"
                                className="gv-btn gv-btn-secondary"
                                style={{ padding: '0.5rem 0.7rem', display: 'inline-flex', alignItems: 'center' }}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={chatImageUploading}
                                aria-label="Attach image"
                            >
                                <ImagePlus size={16} />
                            </button>
                            <input
                                type="text"
                                className="gv-input"
                                placeholder={`Message ${activeFriend.name}...`}
                                value={inputText}
                                onChange={handleTyping}
                            />
                            <button type="submit" className="gv-btn gv-btn-mint chat-send-btn" disabled={chatImageUploading || (!inputText.trim() && !chatImageUrl)}>
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
            <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
        </div>
    );
}
