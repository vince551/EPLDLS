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
    const icon = type === 'error' ? 'fa-triangle-exclamation text-epl-pink' : 'fa-circle-check text-epl-mint';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    
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
        renderUserHome();
        renderTournamentsList();
        renderUserFixturesGrouped();
        renderFriendsPage();
        renderProfilePage();
    }
}

// MOBILE BOTTOM NAVIGATION
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
                <i class="fa-solid fa-chart-pie"></i>
                <span>Dashboard</span>
            </button>
            <button class="mobile-nav-item" onclick="showPage('adminTournaments')">
                <i class="fa-solid fa-trophy"></i>
                <span>Tournaments</span>
            </button>
            <button class="mobile-nav-item" onclick="showPage('adminFixtures')">
                <i class="fa-solid fa-calendar-plus"></i>
                <span>Fixtures</span>
            </button>
            <button class="mobile-nav-item" onclick="showPage('adminUsers')">
                <i class="fa-solid fa-users"></i>
                <span>Users</span>
            </button>
            <button class="mobile-nav-item" onclick="logout()">
                <i class="fa-solid fa-right-from-bracket text-epl-pink"></i>
                <span class="text-epl-pink">Logout</span>
            </button>
        `;
    } else {
        mobileNav.innerHTML = `
            <button class="mobile-nav-item active" onclick="showPage('userHome')">
                <i class="fa-solid fa-house"></i>
                <span>Home</span>
            </button>
            <button class="mobile-nav-item" onclick="showPage('userTournaments')">
                <i class="fa-solid fa-trophy"></i>
                <span>Tournaments</span>
            </button>
            <button class="mobile-nav-item" onclick="showPage('userFixtures')">
                <i class="fa-solid fa-calendar-days"></i>
                <span>Fixtures</span>
            </button>
            <button class="mobile-nav-item" onclick="showPage('userKits')">
                <i class="fa-solid fa-shirt"></i>
                <span>Kits</span>
            </button>
            <button class="mobile-nav-item" onclick="showPage('userProfile')">
                <i class="fa-solid fa-user-gear"></i>
                <span>Profile</span>
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

function logout() {
    currentUser = null;
    localStorage.removeItem('epldls_user');
    document.getElementById('userNav').style.display = 'none';
    document.getElementById('adminNav').style.display = 'none';
    const mobileNav = document.getElementById('mobileNav');
    if (mobileNav) mobileNav.style.display = 'none';
    showToast('Logged out successfully.', 'info');
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
        container.innerHTML = '<p class="text-sub py-4">No tournaments active right now.</p>';
        return;
    }

    const searchQuery = (document.getElementById('userTeamSearch')?.value || '').toLowerCase();

    container.innerHTML = tournaments.map(t => {
        const tFixtures = (window.db.fixtures || []).filter(f => f.tournId === t.id);
        const filteredFixtures = tFixtures.filter(f =>
            !searchQuery || f.home.toLowerCase().includes(searchQuery) || f.away.toLowerCase().includes(searchQuery)
        );

        return `
            <div class="card tournament-card mb-4" style="${t.bgImage ? `background: linear-gradient(rgba(15,5,29,0.85), rgba(15,5,29,0.94)), url('${t.bgImage}'); background-size: cover; background-position: center;` : ''}">
                <div class="card-header">
                    <span class="flex items-center gap-2"><i class="fa-solid fa-trophy text-epl-mint"></i> ${t.name}</span>
                </div>
                <p class="text-xs text-gray-300 mb-3">${t.rules}</p>
                <div class="mb-3">
                    <h5 class="text-epl-mint text-xs font-bold uppercase mb-2 flex items-center gap-1">
                        <i class="fa-solid fa-calendar-days"></i> Fixtures
                    </h5>
                    ${filteredFixtures.length === 0 ? '<p class="text-xs text-gray-400">No fixtures found matching search.</p>' :
                        filteredFixtures.map(f => {
                            const isMyTeam = currentUser && (f.home === currentUser.team || f.away === currentUser.team);
                            return `
                                <div class="bg-black/50 p-2.5 rounded-lg mb-2 flex justify-between items-center ${isMyTeam ? 'border border-epl-mint' : ''} ${f.played ? 'opacity-60' : ''}">
                                    <div>
                                        <span class="text-[10px] text-epl-cyan font-semibold block"><i class="fa-solid fa-clock mr-1"></i> ${f.weekday}, ${f.date} (${f.time})</span>
                                        <div class="font-bold text-xs ${isMyTeam ? 'text-epl-mint' : 'text-white'}">${f.home} vs ${f.away}</div>
                                    </div>
                                    <div>${f.played ? `<strong class="text-epl-mint text-xs px-2 py-1 bg-black/60 rounded">${f.homeScore} - ${f.awayScore}</strong>` : '<span class="text-[10px] bg-epl-purple text-epl-mint px-2 py-0.5 rounded font-bold uppercase">Upcoming</span>'}</div>
                                </div>
                            `;
                        }).join('')
                    }
                </div>
            </div>
        `;
    }).join('');
}

function renderTournamentsList() {
    const container = document.getElementById('tournamentsListContainer');
    if (!container) return;

    const tournaments = window.db.tournaments || [];
    if (tournaments.length === 0) {
        container.innerHTML = '<p class="text-sub py-4">No tournaments available.</p>';
        return;
    }

    container.innerHTML = tournaments.map(t => `
        <div class="card mb-0 cursor-pointer hover:scale-[1.02] transition-transform" onclick="openTournamentDetails(${t.id})">
            <div class="card-header">
                <span class="flex items-center gap-2"><i class="fa-solid fa-trophy text-epl-mint"></i> ${t.name}</span>
            </div>
            <p class="text-xs text-gray-300 mb-3 whitespace-pre-line">${t.rules.substring(0, 90)}...</p>
            <button class="btn btn-primary w-full"><i class="fa-solid fa-arrow-right-long"></i> Open Tournament</button>
        </div>
    `).join('');
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
function filterFixturesTab(filter) {
    activeFixturesFilter = filter;
    renderUserFixturesGrouped();
}

function renderUserFixturesGrouped() {
    const container = document.getElementById('userFixturesGroupedList');
    if (!container) return;

    let fixtures = window.db.fixtures || [];
    if (activeFixturesFilter === 'upcoming') {
        fixtures = fixtures.filter(f => !f.played);
    } else if (activeFixturesFilter === 'played') {
        fixtures = fixtures.filter(f => f.played);
    }

    if (fixtures.length === 0) {
        container.innerHTML = '<p class="text-sub py-4">No fixtures available for this view.</p>';
        return;
    }

    // Group by Date
    const grouped = {};
    fixtures.forEach(f => {
        if (!grouped[f.date]) grouped[f.date] = [];
        grouped[f.date].push(f);
    });

    container.innerHTML = Object.keys(grouped).map(dateKey => `
        <div class="mb-4">
            <h4 class="text-epl-cyan text-xs font-bold uppercase tracking-wider mb-2 border-b border-epl-border pb-1">
                <i class="fa-solid fa-calendar-day mr-1"></i> ${grouped[dateKey][0]?.weekday || 'Scheduled Date'}: ${dateKey}
            </h4>
            ${grouped[dateKey].map(f => `
                <div class="bg-black/50 p-3 rounded-lg mb-2 flex justify-between items-center border border-white/5">
                    <div>
                        <div class="text-[10px] text-gray-400 mb-0.5"><i class="fa-solid fa-clock mr-1"></i> ${f.time}</div>
                        <div class="font-bold text-xs text-white">${f.home} vs ${f.away}</div>
                    </div>
                    <div>
                        ${f.played ? `<strong class="text-epl-mint text-xs px-2 py-1 bg-black/60 rounded">${f.homeScore} - ${f.awayScore}</strong>` : '<span class="text-[10px] bg-epl-purple text-epl-mint px-2 py-0.5 rounded font-bold uppercase">Upcoming</span>'}
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');
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
            <img src="${team.logo}" alt="${team.name}" class="w-16 h-16 object-contain mb-2">
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
                <h5 class="text-xs font-bold text-epl-mint mb-2 flex items-center gap-1"><i class="fa-solid fa-shirt"></i> Home Kit</h5>
                <input type="text" readonly id="kit_home" value="${team.kits.home}" class="w-full p-2 bg-black border border-epl-border text-white text-xs rounded mb-2 font-mono">
                <button class="btn btn-primary text-xs w-full py-1.5" onclick="copyInputUrl('kit_home')"><i class="fa-solid fa-copy"></i> Copy Home Kit URL</button>
            </div>
            <div class="bg-black/50 p-3 rounded-lg border border-epl-border">
                <h5 class="text-xs font-bold text-epl-cyan mb-2 flex items-center gap-1"><i class="fa-solid fa-shirt"></i> Away Kit</h5>
                <input type="text" readonly id="kit_away" value="${team.kits.away}" class="w-full p-2 bg-black border border-epl-border text-white text-xs rounded mb-2 font-mono">
                <button class="btn btn-primary text-xs w-full py-1.5" onclick="copyInputUrl('kit_away')"><i class="fa-solid fa-copy"></i> Copy Away Kit URL</button>
            </div>
            <div class="bg-black/50 p-3 rounded-lg border border-epl-border">
                <h5 class="text-xs font-bold text-epl-pink mb-2 flex items-center gap-1"><i class="fa-solid fa-shirt"></i> Third Kit</h5>
                <input type="text" readonly id="kit_third" value="${team.kits.third}" class="w-full p-2 bg-black border border-epl-border text-white text-xs rounded mb-2 font-mono">
                <button class="btn btn-primary text-xs w-full py-1.5" onclick="copyInputUrl('kit_third')"><i class="fa-solid fa-copy"></i> Copy Third Kit URL</button>
            </div>
            <div class="bg-black/50 p-3 rounded-lg border border-epl-border">
                <h5 class="text-xs font-bold text-yellow-400 mb-2 flex items-center gap-1"><i class="fa-solid fa-shirt"></i> Goalkeeper Kit</h5>
                <input type="text" readonly id="kit_gk" value="${team.kits.gk}" class="w-full p-2 bg-black border border-epl-border text-white text-xs rounded mb-2 font-mono">
                <button class="btn btn-primary text-xs w-full py-1.5" onclick="copyInputUrl('kit_gk')"><i class="fa-solid fa-copy"></i> Copy GK Kit URL</button>
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
        container.innerHTML = '<p class="text-sub py-3">No players found.</p>';
        return;
    }

    container.innerHTML = filtered.map(u => {
        const isFriend = (currentUser.friends || []).includes(u.id);
        const hasRequested = (currentUser.friendRequests || []).includes(u.id);

        return `
            <div class="bg-black/40 p-2.5 rounded-lg mb-2 flex justify-between items-center border border-epl-border">
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <img src="${u.pic || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-full object-cover border border-epl-mint">
                        <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${u.online ? 'bg-epl-mint' : 'bg-gray-500'} border border-black"></span>
                    </div>
                    <div>
                        <div class="font-bold text-xs text-white">${u.name}</div>
                        <div class="text-[10px] text-epl-cyan">${u.team}</div>
                    </div>
                </div>
                <div>
                    ${isFriend ? `<button class="btn btn-primary text-xs px-3 py-1" onclick="selectChatFriend(${u.id})"><i class="fa-solid fa-comments"></i> Chat</button>` :
                      hasRequested ? `<span class="text-[10px] bg-epl-purple text-epl-mint px-2 py-1 rounded font-bold">Request Sent</span>` :
                      `<button class="btn text-xs px-3 py-1 bg-epl-pink text-white" onclick="sendFriendRequest(${u.id})"><i class="fa-solid fa-user-plus"></i> Add</button>`
                    }
                </div>
            </div>
        `;
    }).join('');
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

    document.getElementById('chatHeaderTitle').innerHTML = friend ? `<i class="fa-solid fa-comments text-epl-pink"></i> Chat with ${friend.name} (${friend.team})` : 'Chat Room';
    document.getElementById('chatForm').style.display = 'flex';
    await renderChatMessages();
}

async function renderChatMessages() {
    const container = document.getElementById('chatBoxContainer');
    if (!container || !activeChatFriendId || !currentUser) return;

    try {
        const msgs = await apiFetch(`/messages.php?action=list&user_id=${currentUser.id}&friend_id=${activeChatFriendId}`).catch(() => []);

        if (msgs.length === 0) {
            container.innerHTML = '<p class="text-sub text-center py-6">No messages yet. Say hello!</p>';
            return;
        }

        container.innerHTML = msgs.map(m => `
            <div class="mb-2 text-${m.senderId === currentUser.id ? 'right' : 'left'}">
                <span class="inline-block px-3 py-1.5 rounded-lg ${m.senderId === currentUser.id ? 'bg-epl-purple text-white border border-epl-mint/30' : 'bg-white/10 text-white'} text-xs max-w-[80%] break-words">
                    ${m.message || m.text}
                </span>
            </div>
        `).join('');
        container.scrollTop = container.scrollHeight;
    } catch (e) {
        container.innerHTML = '<p class="text-sub text-center py-4">Unable to load messages.</p>';
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
    document.getElementById('profilePreviewImg').src = currentUser.pic || 'https://via.placeholder.com/100?text=Avatar';
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
                    <button class="btn btn-primary text-xs px-3 py-1" onclick="acceptFriendRequest(${reqId})"><i class="fa-solid fa-check"></i> Accept</button>
                </div>
            `;
        }).join('');
    }

    if (userNotifs.length > 0) {
        html += '<h4 class="text-epl-cyan text-xs font-bold uppercase my-2">Broadcasting Updates</h4>';
        html += userNotifs.map(n => `
            <div class="bg-black/40 p-2.5 rounded-lg mb-2 text-xs text-gray-200 border border-white/5">
                <i class="fa-solid fa-bullhorn text-epl-pink mr-1"></i> ${n.text}
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

// ADMIN: DASHBOARD & MANAGEMENT
function renderAdminDashboard() {
    document.getElementById('statTotalUsers').innerText = (window.db.users || []).filter(u => u.role !== 'admin').length;
    document.getElementById('statTotalTournaments').innerText = (window.db.tournaments || []).length;
    document.getElementById('statTotalFixtures').innerText = (window.db.fixtures || []).length;

    const tbody = document.getElementById('adminUsersTableBody');
    if (tbody) {
        tbody.innerHTML = (window.db.users || []).map((u, index) => `
            <tr>
                <td>${index + 1}</td>
                <td class="font-bold">${u.name}</td>
                <td>${u.team}</td>
                <td>*****</td>
                <td><span class="text-[10px] px-2 py-0.5 rounded font-bold ${u.online ? 'bg-epl-mint/20 text-epl-mint' : 'bg-gray-500/20 text-gray-400'}">${u.online ? 'Online' : 'Offline'}</span></td>
                <td><button class="btn text-xs px-2 py-1 bg-epl-pink text-white" onclick="deleteUser(${u.id})"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('');
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
        <div class="bg-black/40 p-3 rounded-lg mb-2 flex justify-between items-center border border-epl-border">
            <div>
                <div class="font-bold text-xs text-white">${t.name}</div>
                <div class="text-[10px] text-gray-400">${(t.rules || '').substring(0, 50)}...</div>
            </div>
            <button class="btn text-xs px-2.5 py-1 bg-epl-pink text-white" onclick="deleteTournament(${t.id})"><i class="fa-solid fa-trash"></i> Delete</button>
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
        <div class="bg-black/50 p-3 rounded-lg mb-2 flex flex-wrap justify-between items-center gap-2 border border-epl-border">
            <div>
                <span class="text-[10px] text-epl-cyan font-semibold block">${f.weekday}, ${f.date} | ${f.time}</span>
                <div class="font-bold text-xs text-white">${f.home} vs ${f.away}</div>
            </div>
            <div class="flex items-center gap-2">
                ${f.played ? `<span class="text-xs font-bold text-epl-mint">${f.homeScore} - ${f.awayScore} (Played)</span>` : `
                    <input type="number" id="homeScore_${f.id}" placeholder="H" class="w-12 p-1 text-center bg-black border border-epl-border text-white text-xs rounded">
                    <span class="text-white text-xs">-</span>
                    <input type="number" id="awayScore_${f.id}" placeholder="A" class="w-12 p-1 text-center bg-black border border-epl-border text-white text-xs rounded">
                    <button class="btn btn-primary text-xs px-2.5 py-1" onclick="submitMatchResult(${f.id})">Save</button>
                `}
                <button class="btn text-xs px-2 py-1 bg-epl-pink text-white" onclick="deleteFixture(${f.id})"><i class="fa-solid fa-trash"></i></button>
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
    tbody.innerHTML = users.map(u => `
        <tr>
            <td class="font-bold">${u.name}</td>
            <td>${u.team}</td>
            <td>Player</td>
            <td>
                <button class="btn text-xs px-2 py-1 bg-epl-pink text-white" onclick="deleteUser(${u.id})"><i class="fa-solid fa-ban"></i> Ban / Delete</button>
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
