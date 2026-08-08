import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('gameverse_user') || localStorage.getItem('epldls_user');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { return null; }
        }
        return null;
    });

    const [activeGame, setActiveGame] = useState('all');
    const [games, setGames] = useState([]);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [unreadByFriend, setUnreadByFriend] = useState({});

    // Save session changes
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('gameverse_user', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('gameverse_user');
            localStorage.removeItem('epldls_user');
        }
    }, [currentUser]);

    // Initial Games Load
    useEffect(() => {
        apiFetch('/games.php?action=list')
            .then(data => { if (Array.isArray(data)) setGames(data); })
            .catch(err => console.warn('Failed to fetch games:', err));
    }, []);

    // Polling for Chat Unread Counts, Notifications & Online Status (Every 3 seconds)
    const checkUnreadsAndNotifications = useCallback(async () => {
        if (!currentUser?.id) return;

        try {
            // Ping online status
            apiFetch('/auth.php?action=ping_online', {
                method: 'POST',
                body: { id: currentUser.id }
            }).catch(() => { });

            // Fetch unread messages
            const unreadRes = await apiFetch(`/messages.php?action=unread_counts&user_id=${currentUser.id}`).catch(() => null);
            if (unreadRes) {
                setUnreadChatCount(unreadRes.total || 0);
                setUnreadByFriend(unreadRes.byFriend || {});
            }

            // Fetch notifications
            const notifs = await apiFetch(`/notifications.php?action=list&userId=${currentUser.id}`).catch(() => []);
            if (Array.isArray(notifs)) {
                setNotifications(notifs);
                const unreadNotifs = notifs.filter(n => !n.isRead).length + (currentUser.friendRequests?.length || 0);
                setUnreadNotifCount(unreadNotifs);
            }

            // Fetch updated friend requests
            const friendsData = await apiFetch(`/friends.php?action=list&userId=${currentUser.id}`).catch(() => null);
            if (friendsData) {
                setCurrentUser(prev => prev ? {
                    ...prev,
                    friends: friendsData.friends || [],
                    friendRequests: friendsData.incomingRequests || []
                } : null);
            }
        } catch (e) {
            console.error('Polling error:', e);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        if (!currentUser?.id) return;
        checkUnreadsAndNotifications();
        const interval = setInterval(checkUnreadsAndNotifications, 3000);
        return () => clearInterval(interval);
    }, [currentUser?.id, checkUnreadsAndNotifications]);

    // Auth methods
    const login = async (username, pass) => {
        const res = await apiFetch('/auth.php?action=login', {
            method: 'POST',
            body: { username, pass }
        });
        setCurrentUser(res.user);
        return res.user;
    };

    const register = async (username, name, team, pass, favoriteGame = 'DLS') => {
        const res = await apiFetch('/auth.php?action=register', {
            method: 'POST',
            body: { username, name, team, pass, favoriteGame }
        });
        setCurrentUser(res.user);
        return res.user;
    };

    const logout = async () => {
        if (currentUser?.id) {
            // Mark offline on server — fire and forget
            apiFetch('/auth.php?action=logout', {
                method: 'POST',
                body: { id: currentUser.id }
            }).catch(() => { });
        }
        setCurrentUser(null);
        setUnreadChatCount(0);
        setUnreadNotifCount(0);
    };

    // Mark offline when tab/browser closes
    useEffect(() => {
        if (!currentUser?.id) return;
        const handleUnload = () => {
            navigator.sendBeacon(
                `${window.location.origin}/api/auth.php?action=logout`,
                JSON.stringify({ id: currentUser.id })
            );
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [currentUser?.id]);

    const updateUser = (updatedFields) => {
        setCurrentUser(prev => prev ? { ...prev, ...updatedFields } : null);
    };

    return (
        <AuthContext.Provider value={{
            currentUser,
            login,
            register,
            logout,
            updateUser,
            activeGame,
            setActiveGame,
            games,
            setGames,
            unreadChatCount,
            unreadNotifCount,
            notifications,
            setNotifications,
            unreadByFriend,
            checkUnreadsAndNotifications
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
