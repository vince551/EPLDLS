/* ==========================================================================
   EPL DLS HUB - COMPLETE APP CONTROLLER & PWA RUNTIME ENGINE
   API Backend Target: https://api.sokomtaa.co.ke
   ========================================================================== */

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? './api'
    : 'https://api.sokomtaa.co.ke/epldls';

window.db = {
    users: [],
    tournaments: [],
    fixtures: [],
    notifications: [],
    messages: []
};

let currentUser = null;
let activeChatFriendId = null;
let activeFixturesFilter = 'all';
let deferredPrompt = null;

// PWA SERVICE WORKER REGISTRATION
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('[PWA] ServiceWorker registered with scope:', reg.scope))
            .catch(err => console.warn('[PWA] ServiceWorker registration failed:', err));
    });
}

// PWA INSTALL PROMPT EVENT LISTENER
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) banner.style.display = 'flex';
});

// INITIALIZATION & ROUTING
window.addEventListener('DOMContentLoaded', async () => {
    // Setup PWA install handlers
    const installBtn = document.getElementById('pwaInstallBtn');
    const closeBtn = document.getElementById('pwaCloseBtn');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log('[PWA] User response:', outcome);
                deferredPrompt = null;
            }
            const banner = document.getElementById('pwaInstallBanner');
            if (banner) banner.style.display = 'none';
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const banner = document.getElementById('pwaInstallBanner');
            if (banner) banner.style.display = 'none';
        });
    }

    // Restore session from localStorage
    const savedUser = localStorage.getItem('epldls_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
        } catch (e) {
            localStorage.removeItem('epldls_user');
        }
    }

    await updateAndSync();
    renderTeamKitsGrid();

    if (currentUser) {
        if (currentUser.role === 'admin') {
            showPage('adminDashboard');
        } else {
            showPage('userHome');
        }
    } else {
        showPage('authPage');
    }
});

// TOAST NOTIFICATION SYSTEM
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return alert(message);

    const toast = document.createElement('div');
    toast.className = `toast-item ${type === 'error' ? 'error' : ''}`;
    const icon = type === 'error' ? '⚠️' : '✅';
    toast.innerHTML = `<span class="text-base">${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// API CLIENT WRAPPER
async function apiFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Server request failed');
        }
        return data;
    } catch (err) {
        console.warn('API Fetch Warning/Fallback:', err.message);
        throw err;
    }
}

async function updateAndSync() {
    try {
        const [tournaments, fixtures, users] = await Promise.all([
            apiFetch('/tournaments.php?action=list').catch(() => window.db.tournaments),
            apiFetch('/fixtures.php?action=list').catch(() => window.db.fixtures),
            apiFetch('/users.php?action=list').catch(() => window.db.users)
        ]);

        if (Array.isArray(tournaments)) window.db.tournaments = tournaments;
        if (Array.isArray(fixtures)) window.db.fixtures = fixtures;
        if (Array.isArray(users)) window.db.users = users;

        if (currentUser) {
            const notifs = await apiFetch(`/notifications.php?action=list&userId=${currentUser.id}`).catch(() => []);
            if (Array.isArray(notifs)) window.db.notifications = notifs;

            const friendsData = await apiFetch(`/friends.php?action=list&userId=${currentUser.id}`).catch(() => null);
            if (friendsData) {
                currentUser.friends = friendsData.friends || [];
                currentUser.friendRequests = friendsData.incomingRequests || [];
            }
        }
    } catch (e) {
        console.error('Error syncing database:', e);
    }

    renderAll();
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    // Update desktop nav active states
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Sync mobile bottom nav active states
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        if (item.getAttribute('onclick')?.includes(pageId)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    renderAll();
}

function renderAll() {
    renderNavigation();
    renderMobileNavigation();
    renderTopPlayerMarquee();
    renderNotificationsBadge();

    if (!currentUser) return;

    if (currentUser.role === 'admin') {
        renderAdminDashboard();
    } else {
        renderUserWelcomeHero();
        renderUserHome();
        renderTournamentsList();
        renderFixturesSummaryBar();
        renderUserFixturesGrouped();
        renderFriendsPage();
        renderProfilePage();
    }
}

// USER WELCOME HERO BANNER
function renderUserWelcomeHero() {
    const hero = document.getElementById('userWelcomeHero');
    if (!hero || !currentUser) return;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    const notifCount = ((window.db.notifications || []).filter(n => n.userId === currentUser.id).length) +
                       (currentUser.friendRequests?.length || 0);

    const myFixtures = (window.db.fixtures || []).filter(f =>
        !f.played && (f.home === currentUser.team || f.away === currentUser.team)
    ).length;

    const avatarHtml = currentUser.pic
        ? `<img src="${currentUser.pic}" class="user-hero-avatar" alt="Avatar" onerror="this.outerHTML='<div class=\'user-hero-avatar-placeholder\'>⚽</div>'">`
        : `<div class="user-hero-avatar-placeholder">⚽</div>`;

    hero.innerHTML = `
        <div class="user-hero">
            ${avatarHtml}
            <div class="user-hero-info">
                <div class="user-hero-greeting">${greeting}, Player 👋</div>
                <div class="user-hero-name">${currentUser.name}</div>
                <div class="user-hero-team">👕 ${currentUser.team}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;">
                <button class="user-hero-notif" onclick="openNotifications()" title="Notifications">
                    🔔
                    ${notifCount > 0 ? `<span class="badge" style="top:-4px;right:-4px;">${notifCount}</span>` : ''}
                </button>
                <div style="text-align:center;">
                    <div style="font-size:9px;color:var(--epl-text-sub);font-weight:800;text-transform:uppercase;">My Fixtures</div>
                    <div style="font-size:15px;font-weight:900;color:var(--epl-cyan);">${myFixtures}</div>
                </div>
            </div>
        </div>
    `;
}

// MOBILE BOTTOM NAVIGATION (GUARANTEED UNIVERSAL ICONS)
function renderMobileNavigation() {
    const mobileNav = document.getElementById('mobileNav');
    if (!mobileNav) return;

    if (!currentUser) {
        mobileNav.style.display = 'none';
        return;
    }

    mobileNav.style.display = 'flex';

    if (currentUser.role === 'admin') {
        mobileNav.innerHTML = `
            <button class="mobile-nav-item active" onclick="showPage('adminDashboard')">
                <span class="text-base">📊</span>
                <span>Dashboard</span>
            </button>
            <button class="mobile-nav-item" onclick="showPage('adminTournaments')">
                <span class="text-base">🏆</span>
                <span>Tournaments</span>
            </button>
            <button class="mobile-nav-item" onclick="showPage('adminFixtures')">
                <span class="text-base">📅</span>
                <span>Fixtures</span>
            </button>
            <button class="mobile-nav-item" onclick="showPage('adminUsers')">
                <span class="text-base">👥</span>
                <span>Users</span>
            </button>
            <button class="mobile-nav-item" onclick="logout()">
                <span class="text-base text-epl-pink">🚪</span>
                <span class="text-epl-pink">Logout</span>
            </button>
        `;
    } else {
        mobileNav.innerHTML = `
            <button class="mobile-nav-item active" onclick="showPage('userHome')">
                <span class="text-base">🏠</span>
                <span>Home</span>
            </button>
            <button class="mobile-nav-item" onclick="showPage('userTournaments')">
                <span class="text-base">🏆</span>
                <span>Tournaments</span>
            </button>
            <button class="mobile-nav-item" onclick="showPage('userFixtures')">
                <span class="text-base">📅</span>
                <span>Fixtures</span>
            </button>
            <button class="mobile-nav-item" onclick="showPage('userFriends')">
                <span class="text-base">💬</span>
                <span>Friends</span>
            </button>
            <button class="mobile-nav-item" onclick="showPage('userProfile')">
                <span class="text-base">👤</span>
                <span>Profile</span>
            </button>
            <button class="mobile-nav-item" onclick="confirmLogout()">
                <span class="text-base" style="color:#ff4d6d;">🚪</span>
                <span style="color:#ff4d6d;">Logout</span>
            </button>
        `;
    }
}

// AUTHENTICATION & TABS
function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginBtn = document.getElementById('loginTabBtn');
    const registerBtn = document.getElementById('registerTabBtn');

    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        loginBtn.className = 'btn btn-primary flex-1';
        registerBtn.className = 'btn flex-1 bg-white/10 text-white';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        registerBtn.className = 'btn btn-primary flex-1';
        loginBtn.className = 'btn flex-1 bg-white/10 text-white';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const name = document.getElementById('loginName').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    try {
        const res = await apiFetch('/auth.php?action=login', {
            method: 'POST',
            body: { name, pass }
        });

        currentUser = res.user;
        localStorage.setItem('epldls_user', JSON.stringify(currentUser));

        document.getElementById('loginName').value = '';
        document.getElementById('loginPass').value = '';

        showToast(`Welcome back, ${currentUser.name}!`, 'success');

        if (currentUser.role === 'admin') {
            showPage('adminDashboard');
        } else {
            showPage('userHome');
        }
        await updateAndSync();
    } catch (err) {
        showToast(err.message || 'Invalid username or password.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const team = document.getElementById('regTeam').value.trim();
    const pass = document.getElementById('regPass').value.trim();

    try {
        const res = await apiFetch('/auth.php?action=register', {
            method: 'POST',
            body: { name, team, pass }
        });

        currentUser = res.user;
        localStorage.setItem('epldls_user', JSON.stringify(currentUser));

        document.getElementById('regName').value = '';
        document.getElementById('regTeam').value = '';
        document.getElementById('regPass').value = '';

        showToast('Account created successfully! Welcome to EPL DLS Hub.', 'success');
        showPage('userHome');
        await updateAndSync();
    } catch (err) {
        showToast(err.message || 'Failed to create account.', 'error');
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const name = document.getElementById('resetName').value.trim();
    const newPass = document.getElementById('resetNewPass').value.trim();

    try {
        await apiFetch('/auth.php?action=reset_password', {
            method: 'POST',
            body: { name, newPass }
        });

        closeModal('forgotPassModal');
        showToast('Password reset successfully! You can now log in.', 'success');
    } catch (err) {
        showToast(err.message || 'User not found with that name.', 'error');
    }
}

function confirmLogout() {
    // Show inline confirm toast instead of browser confirm()
    const toastEl = document.createElement('div');
    toastEl.id = 'logoutConfirmToast';
    toastEl.style.cssText = `
        position:fixed; bottom:100px; left:50%; transform:translateX(-50%);
        background:rgba(15,5,29,0.98); border:1px solid rgba(233,0,82,0.5);
        border-radius:16px; padding:16px 20px; z-index:9999;
        box-shadow:0 8px 32px rgba(0,0,0,0.6); min-width:260px; text-align:center;
        backdrop-filter:blur(20px);
    `;
    toastEl.innerHTML = `
        <div style="font-size:24px;margin-bottom:8px;">🚪</div>
        <div style="font-size:13px;font-weight:800;color:#fff;margin-bottom:4px;">Log out?</div>
        <div style="font-size:11px;color:#aaa;margin-bottom:14px;">You'll need to sign in again to access your account.</div>
        <div style="display:flex;gap:8px;justify-content:center;">
            <button onclick="document.getElementById('logoutConfirmToast').remove()" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:#aaa;font-size:12px;font-weight:700;cursor:pointer;">Cancel</button>
            <button onclick="logout()" style="flex:1;padding:8px;border-radius:8px;border:none;background:linear-gradient(135deg,#e90052,#c4003d);color:#fff;font-size:12px;font-weight:800;cursor:pointer;">Yes, Logout</button>
        </div>
    `;
    // Remove any existing confirm toast
    document.getElementById('logoutConfirmToast')?.remove();
    document.body.appendChild(toastEl);
    // Auto-dismiss after 8 seconds
    setTimeout(() => toastEl?.remove(), 8000);
}

function logout() {
    document.getElementById('logoutConfirmToast')?.remove();
    currentUser = null;
    localStorage.removeItem('epldls_user');
    sessionStorage.clear();
    const userNav = document.getElementById('userNav');
    const adminNav = document.getElementById('adminNav');
    const mobileNav = document.getElementById('mobileNav');
    if (userNav) userNav.style.display = 'none';
    if (adminNav) adminNav.style.display = 'none';
    if (mobileNav) mobileNav.style.display = 'none';
    showToast('🚪 Logged out successfully. See you soon!', 'info');
    showPage('authPage');
}


function renderNavigation() {
    const userNav = document.getElementById('userNav');
    const adminNav = document.getElementById('adminNav');

    if (!currentUser) {
        userNav.style.display = 'none';
        adminNav.style.display = 'none';
    } else if (currentUser.role === 'admin') {
        userNav.style.display = 'none';
        adminNav.style.display = 'flex';
        adminNav.style.alignItems = 'center';
        adminNav.style.gap = '10px';
    } else {
        userNav.style.display = 'flex';
        userNav.style.alignItems = 'center';
        userNav.style.gap = '10px';
        adminNav.style.display = 'none';
    }
}

// DAILY TOP PLAYER MARQUEE
function renderTopPlayerMarquee() {
    const banner = document.getElementById('topPlayerBanner');
    if (!banner) return;

    const playedFixtures = (window.db.fixtures || []).filter(f => f.played && f.homeScore !== null && f.awayScore !== null);
    if (playedFixtures.length === 0) {
        banner.innerText = '🏆 TOP PLAYER OF THE DAY: NO COMPLETED MATCHES YET TODAY 🏆';
        return;
    }

    const latest = playedFixtures[playedFixtures.length - 1];
    const winningTeam = latest.homeScore > latest.awayScore ? latest.home : latest.away;
    const topPlayerUser = (window.db.users || []).find(u => u.team === winningTeam) || currentUser;

    banner.innerText = `🏆 TOP PLAYER OF THE DAY: ${topPlayerUser ? topPlayerUser.name.toUpperCase() : 'STAR PLAYER'} (${winningTeam}) - LEADING THE LEAGUE STANDINGS! 🏆`;
}

// USER: HOME & TOURNAMENTS
function renderUserHome() {
    const container = document.getElementById('userTournamentsFeed');
    if (!container) return;

    const tournaments = window.db.tournaments || [];
    if (tournaments.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:32px 0;">
                <div style="font-size:40px;margin-bottom:10px;">🏆</div>
                <div style="font-size:13px;color:var(--epl-text-sub);font-weight:700;">No active tournaments yet</div>
                <div style="font-size:11px;color:#555;margin-top:4px;">Check back soon for upcoming fixtures!</div>
            </div>`;
        return;
    }

    const searchQuery = (document.getElementById('userTeamSearch')?.value || '').toLowerCase();

    container.innerHTML = tournaments.map(t => {
        const tFixtures = (window.db.fixtures || []).filter(f => f.tournId === t.id);
        const filteredFixtures = tFixtures.filter(f =>
            !searchQuery || f.home.toLowerCase().includes(searchQuery) || f.away.toLowerCase().includes(searchQuery)
        );
        const playedCount = tFixtures.filter(f => f.played).length;

        return `
            <div class="card tournament-card mb-4" style="${t.bgImage ? `background: linear-gradient(rgba(15,5,29,0.88), rgba(15,5,29,0.96)), url('${t.bgImage}'); background-size: cover; background-position: center;` : ''}">
                <div class="card-header">
                    <span style="display:flex;align-items:center;gap:8px;">🏆 ${t.name}</span>
                    <span style="font-size:10px;background:rgba(0,255,135,0.1);border:1px solid rgba(0,255,135,0.25);color:var(--epl-mint);padding:2px 8px;border-radius:20px;font-weight:800;">${playedCount}/${tFixtures.length} Played</span>
                </div>
                ${t.rules ? `<p style="font-size:11px;color:var(--epl-text-sub);margin-bottom:12px;line-height:1.5;">${t.rules.substring(0, 120)}${t.rules.length > 120 ? '...' : ''}</p>` : ''}
                <div class="tournament-section-header">
                    <span style="font-size:14px;">📅</span>
                    <h4>Match Fixtures</h4>
                    <span style="font-size:10px;color:var(--epl-text-sub);font-weight:700;margin-left:auto;">${filteredFixtures.length} matches</span>
                </div>
                ${filteredFixtures.length === 0
                    ? `<p style="font-size:11px;color:#555;text-align:center;padding:12px 0;">No fixtures found matching your search.</p>`
                    : filteredFixtures.slice(0, 5).map(f => {
                        const isMyTeam = currentUser && (f.home === currentUser.team || f.away === currentUser.team);
                        return isMyTeam
                            ? `<div class="my-match-card">
                                <div style="padding-top:10px;">
                                    <span class="fixture-time">⏰ ${f.weekday}, ${f.date} · ${f.time}</span>
                                    <div class="fixture-matchup" style="color:var(--epl-mint);">${f.home} <span style="color:var(--epl-text-sub);">vs</span> ${f.away}</div>
                                </div>
                                ${f.played
                                    ? `<div class="fixture-score-badge">${f.homeScore} – ${f.awayScore}</div>`
                                    : `<div class="fixture-upcoming-badge">⏳ Upcoming</div>`}
                               </div>`
                            : `<div class="fixture-row ${f.played ? 'opacity-60' : ''}">
                                <div>
                                    <span class="fixture-time">⏰ ${f.weekday}, ${f.date} · ${f.time}</span>
                                    <div class="fixture-matchup">${f.home} <span style="color:var(--epl-text-sub);">vs</span> ${f.away}</div>
                                </div>
                                ${f.played
                                    ? `<div class="fixture-score-badge">${f.homeScore} – ${f.awayScore}</div>`
                                    : `<div class="fixture-upcoming-badge">Upcoming</div>`}
                               </div>`;
                    }).join('')
                }
                ${filteredFixtures.length > 5 ? `<button onclick="showPage('userFixtures')" style="width:100%;margin-top:8px;padding:9px;background:rgba(255,255,255,0.05);border:1px solid var(--epl-border);border-radius:8px;color:var(--epl-cyan);font-size:11px;font-weight:800;cursor:pointer;text-transform:uppercase;letter-spacing:0.5px;">View All ${filteredFixtures.length} Fixtures ➔</button>` : ''}
            </div>
        `;
    }).join('');
}

function renderTournamentsList() {
    const container = document.getElementById('tournamentsListContainer');
    if (!container) return;

    const searchQ = (document.getElementById('tournamentSearch')?.value || '').toLowerCase();
    let tournaments = window.db.tournaments || [];

    if (searchQ) {
        tournaments = tournaments.filter(t => t.name.toLowerCase().includes(searchQ));
    }

    if (tournaments.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px 0;grid-column:1/-1;">
                <div style="font-size:40px;margin-bottom:10px;">🏆</div>
                <div style="font-size:13px;color:var(--epl-text-sub);font-weight:700;">${searchQ ? 'No tournaments match your search' : 'No tournaments available yet'}</div>
                <div style="font-size:11px;color:#555;margin-top:4px;">Check back soon for upcoming tournaments!</div>
            </div>`;
        return;
    }

    container.innerHTML = tournaments.map(t => {
        const tFixtures = (window.db.fixtures || []).filter(f => f.tournId === t.id);
        const playedCount = tFixtures.filter(f => f.played).length;
        const upcomingCount = tFixtures.filter(f => !f.played).length;
        const myFixtures = currentUser ? tFixtures.filter(f => f.home === currentUser.team || f.away === currentUser.team).length : 0;
        const progress = tFixtures.length > 0 ? Math.round((playedCount / tFixtures.length) * 100) : 0;

        return `
            <div class="tourn-list-card" onclick="openTournamentDetails(${t.id})" ${t.bgImage ? `style="background: linear-gradient(rgba(15,5,29,0.90), rgba(15,5,29,0.97)), url('${t.bgImage}'); background-size:cover; background-position:center;"` : ''}>
                <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
                    <span style="font-size:24px;line-height:1;">🏆</span>
                    <span style="font-size:10px;background:rgba(0,255,135,0.1);border:1px solid rgba(0,255,135,0.25);color:var(--epl-mint);padding:3px 10px;border-radius:20px;font-weight:800;">${playedCount}/${tFixtures.length}</span>
                </div>
                <div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:5px;line-height:1.2;">${t.name}</div>
                <p style="font-size:11px;color:var(--epl-text-sub);margin-bottom:12px;line-height:1.5;">${(t.rules || '').substring(0, 75)}${(t.rules || '').length > 75 ? '...' : ''}</p>
                <!-- Progress Bar -->
                <div style="height:3px;background:rgba(255,255,255,0.08);border-radius:3px;margin-bottom:10px;overflow:hidden;">
                    <div style="height:100%;width:${progress}%;background:linear-gradient(90deg, var(--epl-mint), var(--epl-cyan));border-radius:3px;transition:width 0.5s;"></div>
                </div>
                <!-- Stats Row -->
                <div style="display:flex;gap:8px;margin-bottom:12px;">
                    <span style="font-size:10px;color:var(--epl-cyan);font-weight:700;">⏰ ${upcomingCount} upcoming</span>
                    <span style="font-size:10px;color:var(--epl-text-sub);">|</span>
                    <span style="font-size:10px;color:var(--epl-mint);font-weight:700;">✅ ${playedCount} played</span>
                    ${myFixtures > 0 ? `<span style="font-size:10px;color:var(--epl-text-sub);">|</span><span style="font-size:10px;color:#ffd700;font-weight:700;">⭐ ${myFixtures} mine</span>` : ''}
                </div>
                <button class="btn btn-primary" style="width:100%;font-size:11px;padding:9px;">📋 View Fixtures & Standings ➔</button>
            </div>
        `;
    }).join('');
}


function openTournamentDetails(id) {
    const t = (window.db.tournaments || []).find(x => x.id === id);
    if (!t) return;

    document.getElementById('modalTournTitle').innerText = t.name;
    document.getElementById('modalTournRules').innerText = t.rules;

    const tFixtures = (window.db.fixtures || []).filter(f => f.tournId === t.id);

    // Compute Standings Table
    const stats = {};
    tFixtures.forEach(f => {
        if (!stats[f.home]) stats[f.home] = { team: f.home, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };
        if (!stats[f.away]) stats[f.away] = { team: f.away, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };

        if (f.played && f.homeScore !== null && f.awayScore !== null) {
            stats[f.home].P++;
            stats[f.away].P++;
            stats[f.home].GF += f.homeScore;
            stats[f.home].GA += f.awayScore;
            stats[f.away].GF += f.awayScore;
            stats[f.away].GA += f.homeScore;

            if (f.homeScore > f.awayScore) {
                stats[f.home].W++;
                stats[f.home].Pts += 3;
                stats[f.away].L++;
            } else if (f.awayScore > f.homeScore) {
                stats[f.away].W++;
                stats[f.away].Pts += 3;
                stats[f.home].L++;
            } else {
                stats[f.home].D++;
                stats[f.away].D++;
                stats[f.home].Pts += 1;
                stats[f.away].Pts += 1;
            }
        }
    });

    Object.values(stats).forEach(s => {
        s.GD = s.GF - s.GA;
    });

    const sortedStandings = Object.values(stats).sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF);

    const standingsBody = document.getElementById('modalTournStandingsBody');
    if (sortedStandings.length === 0) {
        standingsBody.innerHTML = '<tr><td colspan="10" class="text-center text-xs py-3 text-gray-400">No teams scheduled in this tournament yet.</td></tr>';
    } else {
        standingsBody.innerHTML = sortedStandings.map((s, idx) => `
            <tr>
                <td class="font-bold ${idx === 0 ? 'text-epl-mint' : ''}">${idx + 1}</td>
                <td class="font-bold">${s.team}</td>
                <td>${s.P}</td>
                <td>${s.W}</td>
                <td>${s.D}</td>
                <td>${s.L}</td>
                <td>${s.GF}</td>
                <td>${s.GA}</td>
                <td>${s.GD > 0 ? '+' + s.GD : s.GD}</td>
                <td class="font-bold text-epl-mint">${s.Pts}</td>
            </tr>
        `).join('');
    }

    const fixturesList = document.getElementById('modalTournFixturesList');
    if (tFixtures.length === 0) {
        fixturesList.innerHTML = '<p class="text-xs text-gray-400">No fixtures scheduled.</p>';
    } else {
        fixturesList.innerHTML = tFixtures.map(f => `
            <div class="bg-black/40 p-2.5 rounded-lg mb-2 flex justify-between items-center">
                <div>
                    <span class="text-[10px] text-epl-cyan font-semibold block">${f.weekday}, ${f.date} (${f.time})</span>
                    <div class="font-bold text-xs text-white">${f.home} vs ${f.away}</div>
                </div>
                <div>${f.played ? `<strong class="text-epl-mint text-xs">${f.homeScore} - ${f.awayScore}</strong>` : '<span class="text-[10px] bg-epl-purple text-epl-mint px-2 py-0.5 rounded font-bold">Upcoming</span>'}</div>
            </div>
        `).join('');
    }

    openModal('openTournModal');
}

// USER: FIXTURES GROUPED BY DATE
function filterFixturesTab(filter, btn) {
    activeFixturesFilter = filter;
    // Highlight active tab
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderFixturesSummaryBar();
    renderUserFixturesGrouped();
}

function renderFixturesSummaryBar() {
    const bar = document.getElementById('fixturesSummaryBar');
    if (!bar) return;
    const all = window.db.fixtures || [];
    const total = all.length;
    const played = all.filter(f => f.played).length;
    const upcoming = all.filter(f => !f.played).length;
    const myMatches = currentUser ? all.filter(f => f.home === currentUser.team || f.away === currentUser.team).length : 0;
    bar.innerHTML = `
        <span class="summary-pill total">📋 ${total} Total</span>
        <span class="summary-pill upcoming">⏰ ${upcoming} Upcoming</span>
        <span class="summary-pill played">✅ ${played} Played</span>
        <span class="summary-pill" style="border-color:rgba(255,215,0,0.3);color:#ffd700;">⭐ ${myMatches} Mine</span>
    `;
}

function renderUserFixturesGrouped() {
    const container = document.getElementById('userFixturesGroupedList');
    if (!container) return;

    let fixtures = window.db.fixtures || [];

    if (activeFixturesFilter === 'upcoming') {
        fixtures = fixtures.filter(f => !f.played);
    } else if (activeFixturesFilter === 'played') {
        fixtures = fixtures.filter(f => f.played);
    } else if (activeFixturesFilter === 'my_team' && currentUser) {
        fixtures = fixtures.filter(f => f.home === currentUser.team || f.away === currentUser.team);
    }

    if (fixtures.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:32px 0;"><div style="font-size:36px;">📅</div><p style="color:var(--epl-text-sub);font-size:12px;margin-top:8px;">No fixtures for this filter.</p></div>`;
        return;
    }

    // Group by date
    const grouped = {};
    fixtures.forEach(f => {
        if (!grouped[f.date]) grouped[f.date] = [];
        grouped[f.date].push(f);
    });

    container.innerHTML = Object.keys(grouped).map((dateKey, idx) => {
        const dayFixtures = grouped[dateKey];
        const weekday = dayFixtures[0]?.weekday || '';
        return `
            <div style="margin-top:${idx === 0 ? '0' : '4px'}">
                <div class="date-group-header">
                    <span class="date-group-label">📅 ${weekday} · ${dateKey}</span>
                </div>
                ${dayFixtures.map(f => {
                    const isMyTeam = currentUser && (f.home === currentUser.team || f.away === currentUser.team);
                    return isMyTeam
                        ? `<div class="my-match-card">
                            <div style="padding-top:10px;">
                                <span class="fixture-time">⏰ ${f.time}</span>
                                <div class="fixture-matchup" style="color:var(--epl-mint);">${f.home} <span style="color:var(--epl-text-sub);">vs</span> ${f.away}</div>
                            </div>
                            ${f.played
                                ? `<div class="fixture-score-badge">${f.homeScore} – ${f.awayScore}</div>`
                                : `<div class="fixture-upcoming-badge">⏳ Upcoming</div>`}
                           </div>`
                        : `<div class="fixture-row ${f.played ? '' : ''}">
                            <div>
                                <span class="fixture-time">⏰ ${f.time}</span>
                                <div class="fixture-matchup">${f.home} <span style="color:var(--epl-text-sub);">vs</span> ${f.away}</div>
                            </div>
                            ${f.played
                                ? `<div class="fixture-score-badge">${f.homeScore} – ${f.awayScore}</div>`
                                : `<div class="fixture-upcoming-badge">Upcoming</div>`}
                           </div>`;
                }).join('')}
            </div>`;
    }).join('');
}

// USER: DLS KITS DIRECTORY DATA & RENDERER
const DLS_TEAMS_KITS = [
    {
        name: "Arsenal FC",
        category: "Premier League",
        logo: "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg",
        kits: {
            home: "https://i.ibb.co/3s4t8N2/arsenal-home.png",
            away: "https://i.ibb.co/C0hYJ4n/arsenal-away.png",
            third: "https://i.ibb.co/XzJ7P7g/arsenal-third.png",
            gk: "https://i.ibb.co/YyY1qFh/arsenal-gk.png"
        }
    },
    {
        name: "Chelsea FC",
        category: "Premier League",
        logo: "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg",
        kits: {
            home: "https://i.ibb.co/3zP92hX/chelsea-home.png",
            away: "https://i.ibb.co/PZT744w/chelsea-away.png",
            third: "https://i.ibb.co/K2sY4XN/chelsea-third.png",
            gk: "https://i.ibb.co/D86ZzJ2/chelsea-gk.png"
        }
    },
    {
        name: "Liverpool FC",
        category: "Premier League",
        logo: "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg",
        kits: {
            home: "https://i.ibb.co/4T7t44X/liverpool-home.png",
            away: "https://i.ibb.co/Bcd4X4n/liverpool-away.png",
            third: "https://i.ibb.co/PZT744w/liverpool-third.png",
            gk: "https://i.ibb.co/D86ZzJ2/liverpool-gk.png"
        }
    },
    {
        name: "Manchester City",
        category: "Premier League",
        logo: "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg",
        kits: {
            home: "https://i.ibb.co/xS2kM4N/mancity-home.png",
            away: "https://i.ibb.co/Hq8T94w/mancity-away.png",
            third: "https://i.ibb.co/C0hYJ4n/mancity-third.png",
            gk: "https://i.ibb.co/YyY1qFh/mancity-gk.png"
        }
    },
    {
        name: "Manchester United",
        category: "Premier League",
        logo: "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg",
        kits: {
            home: "https://i.ibb.co/9v4Z00N/manutd-home.png",
            away: "https://i.ibb.co/PZT744w/manutd-away.png",
            third: "https://i.ibb.co/K2sY4XN/manutd-third.png",
            gk: "https://i.ibb.co/D86ZzJ2/manutd-gk.png"
        }
    },
    {
        name: "Real Madrid",
        category: "La Liga",
        logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg",
        kits: {
            home: "https://i.ibb.co/Z1Bw9Yh/realmadrid-home.png",
            away: "https://i.ibb.co/C0hYJ4n/realmadrid-away.png",
            third: "https://i.ibb.co/K2sY4XN/realmadrid-third.png",
            gk: "https://i.ibb.co/YyY1qFh/realmadrid-gk.png"
        }
    }
];

function renderTeamKitsGrid() {
    const grid = document.getElementById('teamKitsGrid');
    if (!grid) return;

    grid.innerHTML = DLS_TEAMS_KITS.map((team, idx) => `
        <div class="team-kit-card flex flex-col items-center justify-center p-4 bg-black/40 border border-epl-border rounded-xl cursor-pointer hover:border-epl-mint transition-all" onclick="openTeamKitsModal(${idx})">
            <img src="${team.logo}" alt="${team.name}" class="w-14 h-14 object-contain mb-2">
            <h5 class="text-xs font-bold text-white text-center">${team.name}</h5>
            <span class="text-[10px] text-epl-cyan mt-1 font-semibold">${team.category}</span>
        </div>
    `).join('');
}

function openTeamKitsModal(idx) {
    const team = DLS_TEAMS_KITS[idx];
    if (!team) return;

    document.getElementById('modalTeamName').innerText = `${team.name} Locker Room`;
    document.getElementById('modalTeamLogoImg').src = team.logo;
    document.getElementById('modalLogoUrlInput').value = team.logo;

    const modalKitsGrid = document.getElementById('modalKitsGrid');
    modalKitsGrid.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="bg-black/50 p-3 rounded-lg border border-epl-border">
                <h5 class="text-xs font-bold text-epl-mint mb-2 flex items-center gap-1">👕 Home Kit</h5>
                <input type="text" readonly id="kit_home" value="${team.kits.home}" class="w-full p-2 bg-black border border-epl-border text-white text-xs rounded mb-2 font-mono">
                <button class="btn btn-primary text-xs w-full py-1.5" onclick="copyInputUrl('kit_home')">📋 Copy Home Kit URL</button>
            </div>
            <div class="bg-black/50 p-3 rounded-lg border border-epl-border">
                <h5 class="text-xs font-bold text-epl-cyan mb-2 flex items-center gap-1">👕 Away Kit</h5>
                <input type="text" readonly id="kit_away" value="${team.kits.away}" class="w-full p-2 bg-black border border-epl-border text-white text-xs rounded mb-2 font-mono">
                <button class="btn btn-primary text-xs w-full py-1.5" onclick="copyInputUrl('kit_away')">📋 Copy Away Kit URL</button>
            </div>
            <div class="bg-black/50 p-3 rounded-lg border border-epl-border">
                <h5 class="text-xs font-bold text-epl-pink mb-2 flex items-center gap-1">👕 Third Kit</h5>
                <input type="text" readonly id="kit_third" value="${team.kits.third}" class="w-full p-2 bg-black border border-epl-border text-white text-xs rounded mb-2 font-mono">
                <button class="btn btn-primary text-xs w-full py-1.5" onclick="copyInputUrl('kit_third')">📋 Copy Third Kit URL</button>
            </div>
            <div class="bg-black/50 p-3 rounded-lg border border-epl-border">
                <h5 class="text-xs font-bold text-yellow-400 mb-2 flex items-center gap-1">👕 Goalkeeper Kit</h5>
                <input type="text" readonly id="kit_gk" value="${team.kits.gk}" class="w-full p-2 bg-black border border-epl-border text-white text-xs rounded mb-2 font-mono">
                <button class="btn btn-primary text-xs w-full py-1.5" onclick="copyInputUrl('kit_gk')">📋 Copy GK Kit URL</button>
            </div>
        </div>
    `;

    openModal('teamKitsModal');
}

function copyInputUrl(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value).then(() => {
        showToast('PNG URL copied to clipboard! Ready to paste in DLS 26.', 'success');
    }).catch(() => {
        showToast('Copied to clipboard!', 'success');
    });
}

// USER: FRIENDS & CHAT
function renderFriendsPage() {
    if (!currentUser) return;
    const container = document.getElementById('friendsListContainer');
    if (!container) return;

    const query = (document.getElementById('friendSearchInput')?.value || '').toLowerCase();
    const otherUsers = (window.db.users || []).filter(u => u.id !== currentUser.id && u.role !== 'admin');
    const filtered = otherUsers.filter(u => u.name.toLowerCase().includes(query) || u.team.toLowerCase().includes(query));

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:20px 0;"><div style="font-size:28px;">👥</div><p style="color:var(--epl-text-sub);font-size:11px;margin-top:6px;">No players found.</p></div>`;
        return;
    }

    container.innerHTML = filtered.map(u => {
        const isFriend = (currentUser.friends || []).includes(u.id);
        const hasRequested = (currentUser.friendRequests || []).includes(u.id);
        return `
            <div class="friend-card">
                <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                    <div class="friend-avatar-wrap">
                        <img src="${u.pic || 'https://via.placeholder.com/40?text=⚽'}" class="friend-avatar" alt="${u.name}" onerror="this.src='https://via.placeholder.com/40?text=⚽'">
                        <span class="online-dot ${u.online ? 'online' : 'offline'}"></span>
                    </div>
                    <div style="min-width:0;">
                        <div style="font-size:12px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.name}</div>
                        <div style="font-size:10px;color:var(--epl-cyan);font-weight:700;">👕 ${u.team}</div>
                    </div>
                </div>
                <div style="flex-shrink:0;">
                    ${isFriend
                        ? `<button class="btn btn-primary" style="font-size:10px;padding:6px 12px;" onclick="selectChatFriend(${u.id})">💬 Chat</button>`
                        : hasRequested
                            ? `<span style="font-size:9px;background:rgba(0,255,135,0.1);border:1px solid rgba(0,255,135,0.2);color:var(--epl-mint);padding:4px 8px;border-radius:20px;font-weight:900;">✓ Sent</span>`
                            : `<button class="btn" style="font-size:10px;padding:6px 12px;background:rgba(233,0,82,0.15);border:1px solid rgba(233,0,82,0.35);color:var(--epl-pink);" onclick="sendFriendRequest(${u.id})">+ Add</button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

// FRIENDS TAB TOGGLE (Players / Chat panels)
function switchFriendsTab(tab) {
    const friendsPanel = document.getElementById('friendsPanel');
    const chatPanel = document.getElementById('chatPanel');
    const friendsBtn = document.getElementById('friendsTabBtn');
    const chatBtn = document.getElementById('chatTabBtn');
    if (!friendsPanel || !chatPanel) return;
    if (tab === 'list') {
        friendsPanel.style.display = '';
        chatPanel.style.display = 'none';
        friendsBtn?.classList.add('active');
        chatBtn?.classList.remove('active');
    } else {
        friendsPanel.style.display = 'none';
        chatPanel.style.display = '';
        chatBtn?.classList.add('active');
        friendsBtn?.classList.remove('active');
        const box = document.getElementById('chatBoxContainer');
        if (box) setTimeout(() => { box.scrollTop = box.scrollHeight; }, 50);
    }
}

// PROFILE: Live preview avatar
function previewProfilePic() {
    const url = document.getElementById('profilePicUrl')?.value?.trim();
    const img = document.getElementById('profilePreviewImg');
    if (!img) return;
    img.src = url || 'https://via.placeholder.com/100?text=⚽';
    img.onerror = () => { img.src = 'https://via.placeholder.com/100?text=⚽'; };
}


async function sendFriendRequest(targetId) {
    if (!currentUser) return;
    try {
        await apiFetch('/friends.php?action=request', {
            method: 'POST',
            body: { userId: currentUser.id, targetId }
        });
        showToast("Friend request sent!", 'success');
        await updateAndSync();
    } catch (err) {
        showToast(err.message || "Failed to send friend request.", 'error');
    }
}

async function selectChatFriend(friendId) {
    activeChatFriendId = friendId;
    const friend = (window.db.users || []).find(u => u.id === friendId);
    // Auto-switch to chat tab on mobile
    switchFriendsTab('chat');
    const header = document.getElementById('chatHeaderTitle');
    if (header) header.innerHTML = friend ? `💬 ${friend.name} · 👕 ${friend.team}` : '💬 Chat Room';
    const form = document.getElementById('chatForm');
    if (form) form.style.display = 'flex';
    await renderChatMessages();
}


async function renderChatMessages() {
    const container = document.getElementById('chatBoxContainer');
    if (!container || !activeChatFriendId || !currentUser) return;

    try {
        const msgs = await apiFetch(`/messages.php?action=list&user_id=${currentUser.id}&friend_id=${activeChatFriendId}`).catch(() => []);

        if (msgs.length === 0) {
            container.innerHTML = `<div class="chat-empty-state"><div style="font-size:28px;margin-bottom:6px;">👋</div><p>No messages yet — say hello!</p></div>`;
            return;
        }

        container.innerHTML = msgs.map(m => {
            const isMe = m.senderId === currentUser.id;
            return `
                <div class="${isMe ? 'chat-msg-me' : 'chat-msg-other'}">
                    <div class="chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}">${m.message || m.text}</div>
                </div>`;
        }).join('');
        container.scrollTop = container.scrollHeight;
    } catch (e) {
        container.innerHTML = `<div class="chat-empty-state"><p style="color:var(--epl-pink);">Unable to load messages.</p></div>`;
    }
}


async function handleSendMessage(e) {
    e.preventDefault();
    if (!activeChatFriendId || !currentUser) return;

    const input = document.getElementById('chatMessageInput');
    const message = input.value.trim();
    if (!message) return;

    try {
        await apiFetch('/messages.php?action=send', {
            method: 'POST',
            body: { senderId: currentUser.id, receiverId: activeChatFriendId, message }
        });
        input.value = '';
        await renderChatMessages();
    } catch (err) {
        showToast(err.message || 'Failed to send message.', 'error');
    }
}

// USER: PROFILE
function renderProfilePage() {
    if (!currentUser) return;
    document.getElementById('profileFullName').value = currentUser.name || '';
    document.getElementById('profileTeamName').value = currentUser.team || '';
    document.getElementById('profilePicUrl').value = currentUser.pic || '';
    document.getElementById('profilePreviewImg').src = currentUser.pic || 'https://via.placeholder.com/100?text=⚽';
    document.getElementById('profilePreviewImg').onerror = function() { this.src = 'https://via.placeholder.com/100?text=⚽'; };

    // Refresh stats row every render
    const statsContainer = document.getElementById('profileStatsRow');
    if (!statsContainer) return;
    const myFixtures = (window.db.fixtures || []).filter(f => f.home === currentUser.team || f.away === currentUser.team);
    const myWins = myFixtures.filter(f => f.played && ((f.home === currentUser.team && f.homeScore > f.awayScore) || (f.away === currentUser.team && f.awayScore > f.homeScore))).length;
    const myPlayed = myFixtures.filter(f => f.played).length;
    const myFriends = (currentUser.friends || []).length;
    statsContainer.innerHTML = `
        <div class="profile-stat-row">
            <div class="profile-stat-pill">
                <div class="label">📅 Matches</div>
                <div class="value">${myPlayed}</div>
            </div>
            <div class="profile-stat-pill">
                <div class="label">🏆 Wins</div>
                <div class="value">${myWins}</div>
            </div>
            <div class="profile-stat-pill">
                <div class="label">👥 Friends</div>
                <div class="value">${myFriends}</div>
            </div>
            <div class="profile-stat-pill">
                <div class="label">⭐ Level</div>
                <div class="value" style="color:var(--epl-cyan);">Pro</div>
            </div>
        </div>
    `;
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    if (!currentUser) return;

    const pic = document.getElementById('profilePicUrl').value.trim();
    const team = document.getElementById('profileTeamName').value.trim();

    try {
        const res = await apiFetch('/auth.php?action=update_profile', {
            method: 'POST',
            body: { id: currentUser.id, pic, team }
        });

        currentUser = { ...currentUser, ...res.user };
        localStorage.setItem('epldls_user', JSON.stringify(currentUser));

        showToast("Profile updated successfully!", 'success');
        await updateAndSync();
    } catch (err) {
        showToast(err.message || "Failed to update profile.", 'error');
    }
}

// NOTIFICATIONS SYSTEM
function openNotifications() {
    if (!currentUser) return;
    const userNotifs = (window.db.notifications || []).filter(n => n.userId === currentUser.id);

    const container = document.getElementById('notificationsList');
    if (!container) return;

    let html = '';

    if (currentUser.friendRequests && currentUser.friendRequests.length > 0) {
        html += '<h4 class="text-epl-mint text-xs font-bold uppercase mb-2">Pending Friend Requests</h4>';
        html += currentUser.friendRequests.map(reqId => {
            const reqUser = (window.db.users || []).find(u => u.id === reqId);
            return `
                <div class="bg-black/50 p-2.5 rounded-lg mb-2 flex justify-between items-center border border-epl-border">
                    <span class="text-xs text-white">${reqUser ? reqUser.name : 'User'} wants to connect</span>
                    <button class="btn btn-primary text-xs px-3 py-1" onclick="acceptFriendRequest(${reqId})">✅ Accept</button>
                </div>
            `;
        }).join('');
    }

    if (userNotifs.length > 0) {
        html += '<h4 class="text-epl-cyan text-xs font-bold uppercase my-2">Broadcasting Updates</h4>';
        html += userNotifs.map(n => `
            <div class="bg-black/40 p-2.5 rounded-lg mb-2 text-xs text-gray-200 border border-white/5">
                📢 ${n.text}
            </div>
        `).join('');
    }

    if (!html) {
        html = '<p class="text-gray-400 text-xs text-center py-4">No pending notifications.</p>';
    }

    container.innerHTML = html;
    openModal('notificationsModal');
}

async function acceptFriendRequest(reqId) {
    if (!currentUser) return;
    try {
        await apiFetch('/friends.php?action=accept', {
            method: 'POST',
            body: { userId: currentUser.id, requesterId: reqId }
        });
        showToast("Friend request accepted!", 'success');
        closeModal('notificationsModal');
        await updateAndSync();
    } catch (err) {
        showToast(err.message || "Failed to accept friend request.", 'error');
    }
}

function renderNotificationsBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge || !currentUser) return;
    const count = ((window.db.notifications || []).filter(n => n.userId === currentUser.id).length) + (currentUser.friendRequests?.length || 0);
    badge.innerText = count;
}

// ADMIN: DASHBOARD & MANAGEMENT (COMPACT MOBILE RESPONSIVE)
function renderAdminDashboard() {
    document.getElementById('statTotalUsers').innerText = (window.db.users || []).filter(u => u.role !== 'admin').length;
    document.getElementById('statTotalTournaments').innerText = (window.db.tournaments || []).length;
    document.getElementById('statTotalFixtures').innerText = (window.db.fixtures || []).length;

    const tbody = document.getElementById('adminUsersTableBody');
    if (tbody) {
        const users = (window.db.users || []).filter(u => u.role !== 'admin');
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-xs py-3 text-gray-400">No registered members yet.</td></tr>';
        } else {
            tbody.innerHTML = users.map((u, index) => `
                <tr class="border-b border-white/5 hover:bg-white/5">
                    <td class="py-2 px-2 text-center text-gray-400 font-mono">${index + 1}</td>
                    <td class="py-2 px-2 font-bold text-white">${u.name}</td>
                    <td class="py-2 px-2 text-epl-cyan">${u.team}</td>
                    <td class="py-2 px-2 text-center">
                        <span class="inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${u.online ? 'bg-epl-mint/20 text-epl-mint border border-epl-mint/30' : 'bg-gray-500/20 text-gray-400'}">
                            ${u.online ? 'Online' : 'Offline'}
                        </span>
                    </td>
                    <td class="py-2 px-2 text-center">
                        <button class="btn text-[10px] px-2 py-1 bg-epl-pink/90 hover:bg-epl-pink text-white rounded" onclick="deleteUser(${u.id})">
                            🗑️
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }

    renderAdminTournamentsList();
    renderAdminFixturesManagement();
    renderAdminModeration();
}

function previewTournBgFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        document.getElementById('adminTournBgBase64').value = evt.target.result;
    };
    reader.readAsDataURL(file);
}

async function handleCreateTournament(e) {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') return;

    const name = document.getElementById('adminTournName').value.trim();
    const rules = document.getElementById('adminTournRules').value.trim();
    const bgImage = document.getElementById('adminTournBgBase64').value.trim();

    if (!name) return showToast("Tournament name is required.", 'error');

    try {
        await apiFetch('/tournaments.php?action=create', {
            method: 'POST',
            body: { name, rules: rules || "No rules specified.", bgImage: bgImage || "" }
        });

        document.getElementById('adminTournName').value = '';
        document.getElementById('adminTournRules').value = '';
        document.getElementById('adminTournFile').value = '';
        document.getElementById('adminTournBgBase64').value = '';

        showToast("Tournament created successfully!", 'success');
        await updateAndSync();
    } catch (err) {
        showToast(err.message || "Failed to create tournament.", 'error');
    }
}

function renderAdminTournamentsList() {
    const container = document.getElementById('adminTournamentsList');
    if (!container) return;

    const list = window.db.tournaments || [];
    if (list.length === 0) {
        container.innerHTML = '<p class="text-sub py-3">No tournaments.</p>';
        return;
    }

    container.innerHTML = list.map(t => `
        <div class="bg-black/40 p-2.5 rounded-lg mb-2 flex justify-between items-center border border-epl-border">
            <div>
                <div class="font-bold text-xs text-white">${t.name}</div>
                <div class="text-[10px] text-gray-400">${(t.rules || '').substring(0, 40)}...</div>
            </div>
            <button class="btn text-xs px-2.5 py-1 bg-epl-pink text-white" onclick="deleteTournament(${t.id})">🗑️ Delete</button>
        </div>
    `).join('');
}

async function deleteTournament(id) {
    try {
        await apiFetch(`/tournaments.php?action=delete&id=${id}`, { method: 'DELETE' });
        showToast("Tournament deleted.", 'info');
        await updateAndSync();
    } catch (err) {
        showToast(err.message || "Failed to delete tournament.", 'error');
    }
}

// ADMIN: FIXTURES MANAGEMENT
function calcWeekday(e) {
    const dateVal = e.target.value;
    if (!dateVal) return;
    const d = new Date(dateVal);
    const options = { weekday: 'long' };
    const dayName = d.toLocaleDateString('en-US', options);
    document.getElementById('displayWeekday').innerText = `Weekday: ${dayName}`;
    window.tempSelectedWeekday = dayName;
}

function renderAdminFixturesManagement() {
    const tournSelect = document.getElementById('fixTournSelect');
    const homeSelect = document.getElementById('fixHomeTeam');
    const awaySelect = document.getElementById('fixAwayTeam');

    if (tournSelect) {
        tournSelect.innerHTML = (window.db.tournaments || []).map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    }

    const regularUsers = (window.db.users || []).filter(u => u.role !== 'admin');
    if (homeSelect && awaySelect) {
        const optionsHtml = regularUsers.map(u => `<option value="${u.team}">${u.team} (${u.name})</option>`).join('');
        homeSelect.innerHTML = optionsHtml;
        awaySelect.innerHTML = optionsHtml;
    }

    const container = document.getElementById('adminFixturesManagementList');
    if (!container) return;

    const fixtures = window.db.fixtures || [];
    if (fixtures.length === 0) {
        container.innerHTML = '<p class="text-sub py-3">No fixtures scheduled.</p>';
        return;
    }

    container.innerHTML = fixtures.map(f => `
        <div class="bg-black/50 p-2.5 rounded-lg mb-2 flex flex-wrap justify-between items-center gap-2 border border-epl-border">
            <div>
                <span class="text-[10px] text-epl-cyan font-semibold block">${f.weekday}, ${f.date} | ${f.time}</span>
                <div class="font-bold text-xs text-white">${f.home} vs ${f.away}</div>
            </div>
            <div class="flex items-center gap-2">
                ${f.played ? `<span class="text-xs font-bold text-epl-mint">${f.homeScore} - ${f.awayScore} (Played)</span>` : `
                    <input type="number" id="homeScore_${f.id}" placeholder="H" class="w-10 p-1 text-center bg-black border border-epl-border text-white text-xs rounded">
                    <span class="text-white text-xs">-</span>
                    <input type="number" id="awayScore_${f.id}" placeholder="A" class="w-10 p-1 text-center bg-black border border-epl-border text-white text-xs rounded">
                    <button class="btn btn-primary text-xs px-2 py-1" onclick="submitMatchResult(${f.id})">Save</button>
                `}
                <button class="btn text-xs px-2 py-1 bg-epl-pink text-white" onclick="deleteFixture(${f.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

async function handleCreateFixture(e) {
    e.preventDefault();
    const tournId = parseInt(document.getElementById('fixTournSelect').value);
    const home = document.getElementById('fixHomeTeam').value;
    const away = document.getElementById('fixAwayTeam').value;
    const date = document.getElementById('fixDate').value;
    const time = document.getElementById('fixTime').value;
    const weekday = window.tempSelectedWeekday || 'Thursday';

    if (home === away) {
        return showToast("Home team and Away team cannot be the same.", 'error');
    }

    try {
        await apiFetch('/fixtures.php?action=create', {
            method: 'POST',
            body: { tournId, home, away, date, weekday, time }
        });

        showToast("Fixture scheduled successfully!", 'success');
        await updateAndSync();
    } catch (err) {
        showToast(err.message || "Failed to create fixture.", 'error');
    }
}

async function submitMatchResult(fixId) {
    const homeInput = document.getElementById(`homeScore_${fixId}`);
    const awayInput = document.getElementById(`awayScore_${fixId}`);

    const homeScore = parseInt(homeInput.value);
    const awayScore = parseInt(awayInput.value);

    if (isNaN(homeScore) || isNaN(awayScore)) {
        return showToast("Please enter valid scores for both teams.", 'error');
    }

    try {
        await apiFetch('/fixtures.php?action=submit_score', {
            method: 'POST',
            body: { id: fixId, homeScore, awayScore }
        });

        showToast("Match result updated successfully!", 'success');
        await updateAndSync();
    } catch (err) {
        showToast(err.message || "Failed to update match result.", 'error');
    }
}

async function deleteFixture(id) {
    try {
        await apiFetch(`/fixtures.php?action=delete&id=${id}`, { method: 'DELETE' });
        showToast("Fixture deleted.", 'info');
        await updateAndSync();
    } catch (err) {
        showToast(err.message || "Failed to delete fixture.", 'error');
    }
}

async function handleSendAdminNotification(e) {
    e.preventDefault();
    const text = document.getElementById('adminNotifText').value.trim();
    if (!text) return;

    try {
        await apiFetch('/notifications.php?action=broadcast', {
            method: 'POST',
            body: { text }
        });

        document.getElementById('adminNotifText').value = '';
        showToast("Notification broadcasted to all users successfully!", 'success');
        await updateAndSync();
    } catch (err) {
        showToast(err.message || "Failed to send notification.", 'error');
    }
}

async function deleteUser(id) {
    try {
        await apiFetch(`/users.php?action=delete&id=${id}`, { method: 'DELETE' });
        showToast("User removed.", 'info');
        await updateAndSync();
    } catch (err) {
        showToast(err.message || "Failed to delete user.", 'error');
    }
}

function renderAdminModeration() {
    const tbody = document.getElementById('adminModerationTableBody');
    if (!tbody) return;

    const users = (window.db.users || []).filter(u => u.role !== 'admin');
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-xs py-3 text-gray-400">No users to moderate.</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(u => `
        <tr class="border-b border-white/5 hover:bg-white/5">
            <td class="py-2 px-3 font-bold text-white">${u.name}</td>
            <td class="py-2 px-3 text-epl-cyan">${u.team}</td>
            <td class="py-2 px-3"><span class="text-[10px] bg-epl-purple text-epl-mint px-2 py-0.5 rounded font-bold uppercase">Player</span></td>
            <td class="py-2 px-3 text-center">
                <button class="btn text-[10px] px-2.5 py-1 bg-epl-pink text-white rounded inline-flex items-center gap-1" onclick="deleteUser(${u.id})">
                    🚫 Ban / Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// GENERAL UTILS
function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}
