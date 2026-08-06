import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Header from './components/Header';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';
import NotificationsModal from './components/NotificationsModal';

import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import GamesPage from './pages/GamesPage';
import TournamentsPage from './pages/TournamentsPage';
import FixturesPage from './pages/FixturesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import FriendsPage from './pages/FriendsPage';
import ChatPage from './pages/ChatPage';
import ForumsPage from './pages/ForumsPage';
import ForumDetailPage from './pages/ForumDetailPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import PlayersPage from './pages/PlayersPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import FeedPage from './pages/FeedPage';

function ProtectedRoute({ children, adminOnly = false }) {
    const { currentUser } = useAuth();
    if (!currentUser) return <Navigate to="/auth" replace />;
    if (adminOnly && currentUser.role !== 'admin') return <Navigate to="/" replace />;
    return children;
}

function MainLayout() {
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    return (
        <div className="app-shell">
            <Header onOpenNotifications={() => setIsNotifOpen(true)} />
            <Navbar />

            <main className="main-content">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/games" element={<GamesPage />} />
                    <Route path="/tournaments" element={<TournamentsPage />} />
                    <Route path="/fixtures" element={<FixturesPage />} />
                    <Route path="/leaderboard" element={<LeaderboardPage />} />
                    <Route path="/friends" element={<FriendsPage />} />
                    <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                    <Route path="/forums" element={<ForumsPage />} />
                    <Route path="/forums/:id" element={<ForumDetailPage />} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/players" element={<PlayersPage />} />
                    <Route path="/player/:playerId" element={<PlayerProfilePage />} />
                    <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>

            <MobileNav />

            <NotificationsModal
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
            />
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <MainLayout />
            </BrowserRouter>
        </AuthProvider>
    );
}
