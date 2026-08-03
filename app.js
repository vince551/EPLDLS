/* ==========================================================================
   EPL DLS HUB - COMPLETE APP CONTROLLER & RUNTIME ENGINE
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

// INITIALIZATION & ROUTING
window.addEventListener('DOMContentLoaded', async () => {
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

    // Update nav active states
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (window.event && window.event.target) window.event.target.classList.add('active');

    renderAll();
}

function renderAll() {
    renderNavigation();
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

// AUTHENTICATION & TABS
function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginBtn = document.getElementById('loginTabBtn');
    const registerBtn = document.getElementById('registerTabBtn');

    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        loginBtn.className = 'btn btn-primary';
        registerBtn.style.background = 'rgba(255,255,255,0.06)';
        registerBtn.style.color = '#fff';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        registerBtn.className = 'btn btn-primary';
        loginBtn.style.background = 'rgba(255,255,255,0.06)';
        loginBtn.style.color = '#fff';
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

        if (currentUser.role === 'admin') {
            showPage('adminDashboard');
        } else {
            showPage('userHome');
        }
        await updateAndSync();
    } catch (err) {
        alert(err.message || 'Invalid username or password.');
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

        alert('Account created successfully!');
        showPage('userHome');
        await updateAndSync();
    } catch (err) {
        alert(err.message || 'Failed to create account.');
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
        alert('Password reset successfully! You can now log in.');
    } catch (err) {
        alert(err.message || 'User not found with that name.');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('epldls_user');
    document.getElementById('userNav').style.display = 'none';
    document.getElementById('adminNav').style.display = 'none';
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
        container.innerHTML = '<p class="text-sub">No tournaments active right now.</p>';
        return;
    }

    const searchQuery = (document.getElementById('userTeamSearch')?.value || '').toLowerCase();

    container.innerHTML = tournaments.map(t => {
        const tFixtures = (window.db.fixtures || []).filter(f => f.tournId === t.id);
        const filteredFixtures = tFixtures.filter(f =>
            !searchQuery || f.home.toLowerCase().includes(searchQuery) || f.away.toLowerCase().includes(searchQuery)
        );

        return `
            <div class="card tournament-card" style="margin-bottom:16px; ${t.bgImage ? `background: linear-gradient(rgba(18,0,22,0.85), rgba(18,0,22,0.92)), url('${t.bgImage}'); background-size: cover; background-position: center;` : ''}">
                <div class="card-header">
                    <span>🏆 ${t.name}</span>
                </div>
                <p style="font-size:13px; color:var(--epl-text-sub); margin-bottom:12px;">${t.rules}</p>
                <div style="margin-bottom:12px;">
                    <h5 style="color:var(--epl-mint); margin-bottom:6px;">Fixtures</h5>
                    ${filteredFixtures.length === 0 ? '<p style="font-size:12px; color:var(--epl-text-sub);">No fixtures found matching search.</p>' :
                        filteredFixtures.map(f => {
                            const isMyTeam = currentUser && (f.home === currentUser.team || f.away === currentUser.team);
                            return `
                                <div style="background:rgba(0,0,0,0.5); padding:10px; border-radius:8px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; ${isMyTeam ? 'border:1px solid var(--epl-mint);' : ''} ${f.played ? 'opacity:0.5; filter:blur(0.3px);' : ''}">
                                    <div>
                                        <span style="font-size:11px; color:var(--epl-cyan);">${f.weekday}, ${f.date} (${f.time})</span>
                                        <div style="font-weight:700; ${isMyTeam ? 'color:var(--epl-mint);' : ''}">${f.home} vs ${f.away}</div>
                                    </div>
                                    <div>${f.played ? `<strong>${f.homeScore} - ${f.awayScore}</strong>` : '<span class="badge-tag">Upcoming</span>'}</div>
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
        container.innerHTML = '<p class="text-sub">No tournaments available.</p>';
        return;
    }

    container.innerHTML = tournaments.map(t => `
        <div class="card" style="margin-bottom:0; cursor:pointer;" onclick="openTournamentDetails(${t.id})">
            <div class="card-header"><span>🏆 ${t.name}</span></div>
            <p style="font-size:13px; color:var(--epl-text-sub); margin-bottom:12px; white-space:pre-line;">${t.rules.substring(0, 90)}...</p>
            <button class="btn btn-primary" style="width:100%;">Open Tournament</button>
        </div>
    `).join('');
}

function openTournamentDetails(id) {
    const t = (window.db.tournaments || []).find(x => x.id === id);
    if (!t) return;

    document.getElementById('modalTournTitle').innerText = t.name;
    document.getElementById('modalTournRules').innerText = t.rules;

    const tFixtures = (window.db.fixtures || []).filter(f => f.tournId === t.id);

    const stats = {};
    (window.db.users || []).forEach(u => {
        if (u.role !== 'admin' && u.team) {
            stats[u.team] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
        }
    });

    tFixtures.forEach(f => {
        if (!stats[f.home]) stats[f.home] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
        if (!stats[f.away]) stats[f.away] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };

        if (f.played && f.homeScore !== null && f.awayScore !== null) {
            const hStats = stats[f.home];
            const aStats = stats[f.away];

            hStats.played += 1;
            aStats.played += 1;
            hStats.gf += f.homeScore;
            hStats.ga += f.awayScore;
            aStats.gf += f.awayScore;
            aStats.ga += f.homeScore;

            if (f.homeScore > f.awayScore) {
                hStats.won += 1;
                hStats.pts += 3;
                aStats.lost += 1;
            } else if (f.homeScore < f.awayScore) {
                aStats.won += 1;
                aStats.pts += 3;
                hStats.lost += 1;
            } else {
                hStats.drawn += 1;
                hStats.pts += 1;
                aStats.drawn += 1;
                aStats.pts += 1;
            }
        }
    });

    const standingsArray = Object.keys(stats).map(teamName => {
        const s = stats[teamName];
        return {
            team: teamName,
            ...s,
            gd: s.gf - s.ga
        };
    }).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    });

    const standingsBody = document.getElementById('modalTournStandingsBody');
    if (standingsArray.length === 0 || standingsArray.every(s => s.played === 0 && s.pts === 0 && Object.keys(stats).length === 0)) {
        standingsBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--epl-text-sub);">No match stats available yet.</td></tr>`;
    } else {
        standingsBody.innerHTML = standingsArray.map((row, index) => `
            <tr style="${currentUser && row.team === currentUser.team ? 'background:rgba(0,255,135,0.08); font-weight:bold;' : ''}">
                <td>${index + 1}</td>
                <td>${row.team}</td>
                <td>${row.played}</td>
                <td>${row.won}</td>
                <td>${row.drawn}</td>
                <td>${row.lost}</td>
                <td>${row.gf}</td>
                <td>${row.ga}</td>
                <td>${row.gd > 0 ? '+' + row.gd : row.gd}</td>
                <td style="color:var(--epl-mint); font-weight:900;">${row.pts}</td>
            </tr>
        `).join('');
    }

    const container = document.getElementById('modalTournFixturesList');
    if (tFixtures.length === 0) {
        container.innerHTML = '<p style="font-size:13px; color:var(--epl-text-sub);">No fixtures scheduled for this tournament yet.</p>';
    } else {
        container.innerHTML = tFixtures.map(f => `
            <div style="background:rgba(0,0,0,0.5); padding:10px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; ${f.played ? 'opacity:0.6;' : ''}">
                <div>
                    <span style="font-size:11px; color:var(--epl-cyan);">${f.weekday}, ${f.date} | ${f.time}</span>
                    <div style="font-weight:700;">${f.home} vs ${f.away}</div>
                </div>
                <div>${f.played ? `<strong>${f.homeScore} - ${f.awayScore}</strong>` : '<span class="badge-tag">Upcoming</span>'}</div>
            </div>
        `).join('');
    }

    document.getElementById('openTournModal').classList.add('active');
}

// USER: FIXTURES GROUPED
function filterFixturesTab(tab) {
    activeFixturesFilter = tab;
    renderUserFixturesGrouped();
}

function renderUserFixturesGrouped() {
    const container = document.getElementById('userFixturesGroupedList');
    if (!container) return;

    let fixtures = window.db.fixtures || [];
    if (activeFixturesFilter === 'upcoming') fixtures = fixtures.filter(f => !f.played);
    if (activeFixturesFilter === 'played') fixtures = fixtures.filter(f => f.played);

    if (fixtures.length === 0) {
        container.innerHTML = '<p class="text-sub">No fixtures found.</p>';
        return;
    }

    const groups = {};
    fixtures.forEach(f => {
        const key = `${f.weekday}, ${f.date}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(f);
    });

    container.innerHTML = Object.keys(groups).map(dateKey => `
        <div style="margin-bottom:20px;">
            <h4 style="color:var(--epl-mint); margin-bottom:10px; border-bottom:1px solid var(--epl-border); padding-bottom:6px;">${dateKey}</h4>
            ${groups[dateKey].map(f => `
                <div style="background:rgba(0,0,0,0.4); padding:12px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; ${f.played ? 'opacity:0.55; filter:blur(0.3px); background:rgba(20,0,25,0.7);' : ''}">
                    <div>
                        <span style="font-size:11px; color:var(--epl-cyan);">${f.time}</span>
                        <div style="font-weight:700; font-size:14px; margin-top:2px;">${f.home} vs ${f.away}</div>
                    </div>
                    <div>
                        ${f.played ? `<span style="font-size:15px; font-weight:900; color:var(--epl-mint);">${f.homeScore} - ${f.awayScore}</span>` : '<span class="badge-tag">Upcoming</span>'}
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');
}

function filterUserFixtures() {
    renderUserHome();
}

// KITS DIRECTORY SOURCED FROM DLS KIT URL
const dlsTeamsData = [
    {
        id: "spain-wc",
        name: "Spain (World Cup)",
        logo: "https://dlskiturl.com/wp-content/uploads/Spain-National-Team-Logo.png",
        kits: [
            { type: "Home Kit", img: "https://dlskiturl.com/wp-content/uploads/Spain-World-Cup-Home-Kit.png" },
            { type: "Away Kit", img: "https://dlskiturl.com/wp-content/uploads/Spain-World-Cup-Away-Kit.png" },
            { type: "GK Kit", img: "https://dlskiturl.com/wp-content/uploads/Spain-World-Cup-GK-Kit.png" }
        ]
    },
    {
        id: "france-wc",
        name: "France (World Cup)",
        logo: "https://dlskiturl.com/wp-content/uploads/France-National-Team-Logo.png",
        kits: [
            { type: "Home Kit", img: "https://dlskiturl.com/wp-content/uploads/France-World-Cup-Home-Kit.png" },
            { type: "Away Kit", img: "https://dlskiturl.com/wp-content/uploads/France-World-Cup-Away-Kit.png" },
            { type: "GK Kit", img: "https://dlskiturl.com/wp-content/uploads/France-World-Cup-GK-Kit.png" }
        ]
    },
    {
        id: "argentina-wc",
        name: "Argentina (World Cup)",
        logo: "https://dlskiturl.com/wp-content/uploads/Argentina-National-Team-Logo.png",
        kits: [
            { type: "Home Kit", img: "https://dlskiturl.com/wp-content/uploads/Argentina-World-Cup-Home-Kit.png" },
            { type: "Away Kit", img: "https://dlskiturl.com/wp-content/uploads/Argentina-World-Cup-Away-Kit.png" },
            { type: "Third Kit", img: "https://dlskiturl.com/wp-content/uploads/Argentina-World-Cup-Third-Kit.png" }
        ]
    },
    {
        id: "england-wc",
        name: "England (World Cup)",
        logo: "https://dlskiturl.com/wp-content/uploads/England-National-Team-Logo.png",
        kits: [
            { type: "Home Kit", img: "https://dlskiturl.com/wp-content/uploads/England-World-Cup-Home-Kit.png" },
            { type: "Away Kit", img: "https://dlskiturl.com/wp-content/uploads/England-World-Cup-Away-Kit.png" }
        ]
    },
    {
        id: "brazil-wc",
        name: "Brazil (World Cup)",
        logo: "https://dlskiturl.com/wp-content/uploads/Brazil-National-Team-Logo.png",
        kits: [
            { type: "Home Kit", img: "https://dlskiturl.com/wp-content/uploads/Brazil-World-Cup-Home-Kit.png" },
            { type: "Away Kit", img: "https://dlskiturl.com/wp-content/uploads/Brazil-World-Cup-Away-Kit.png" }
        ]
    },
    {
        id: "portugal-wc",
        name: "Portugal (World Cup)",
        logo: "https://dlskiturl.com/wp-content/uploads/Portugal-National-Team-Logo.png",
        kits: [
            { type: "Home Kit", img: "https://dlskiturl.com/wp-content/uploads/Portugal-World-Cup-Home-Kit.png" },
            { type: "Away Kit", img: "https://dlskiturl.com/wp-content/uploads/Portugal-World-Cup-Away-Kit.png" }
        ]
    }
];

function renderTeamKitsGrid() {
    const grid = document.getElementById('teamKitsGrid');
    if (!grid) return;

    grid.innerHTML = dlsTeamsData.map(team => `
        <div class="team-select-card" onclick="openTeamKitsModal('${team.id}')" style="background:rgba(10,0,15,0.6); border:1px solid var(--epl-border); border-radius:10px; padding:16px; text-align:center; cursor:pointer; transition:all 0.2s;">
            <div class="team-card-logo" style="width:70px; height:70px; margin:0 auto 10px; display:flex; justify-content:center; align-items:center;">
                <img src="${team.logo}" alt="${team.name}" onerror="this.src='https://via.placeholder.com/80?text=Logo'" style="max-width:100%; max-height:100%; object-fit:contain;">
            </div>
            <h3 style="font-size:14px; color:#fff; margin-bottom:6px;">${team.name}</h3>
            <span class="badge-tag">${team.kits.length} Kits + Logo</span>
        </div>
    `).join('');
}

function openTeamKitsModal(teamId) {
    const team = dlsTeamsData.find(t => t.id === teamId);
    if (!team) return;

    document.getElementById('modalTeamName').innerText = team.name;
    document.getElementById('modalTeamLogoImg').src = team.logo;
    document.getElementById('modalLogoUrlInput').value = team.logo;

    const kitsContainer = document.getElementById('modalKitsGrid');
    kitsContainer.innerHTML = team.kits.map((kit, index) => `
        <div class="kit-modal-card" style="background:rgba(0,0,0,0.5); border:1px solid var(--epl-border); border-radius:8px; padding:12px; text-align:center;">
            <div class="kit-img-wrapper" style="height:120px; display:flex; justify-content:center; align-items:center; margin-bottom:10px;">
                <img src="${kit.img}" alt="${kit.type}" onerror="this.src='https://via.placeholder.com/150?text=Kit'" style="max-height:100%; object-fit:contain;">
            </div>
            <h5 style="color:#fff; font-size:13px; margin-bottom:8px;">${kit.type}</h5>
            <div class="kit-url-box" style="display:flex; gap:6px;">
                <input type="text" readonly id="kitInput_${index}" value="${kit.img}" class="kit-url-input" style="flex:1; padding:6px; background:#000; border:1px solid var(--epl-border); color:#fff; border-radius:4px; font-size:11px;">
                <button class="btn btn-primary" onclick="copyInputUrl('kitInput_${index}')" style="padding:6px 10px; font-size:11px;">Copy</button>
            </div>
        </div>
    `).join('');

    document.getElementById('teamKitsModal').classList.add('active');
}

function copyInputUrl(inputId) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl) return;

    inputEl.select();
    navigator.clipboard.writeText(inputEl.value).then(() => {
        alert("Copied to clipboard! Paste directly inside DLS 26 Custom Kit menu.");
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
        container.innerHTML = '<p class="text-sub">No players found.</p>';
        return;
    }

    container.innerHTML = filtered.map(u => {
        const isFriend = (currentUser.friends || []).includes(u.id);
        const hasRequested = (currentUser.friendRequests || []).includes(u.id);

        return `
            <div style="background:rgba(0,0,0,0.4); padding:10px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="position:relative;">
                        <img src="${u.pic || 'https://via.placeholder.com/40'}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                        <span style="position:absolute; bottom:0; right:0; width:10px; height:10px; border-radius:50%; background:${u.online ? 'var(--epl-mint)' : '#666'}; border:2px solid #000;"></span>
                    </div>
                    <div>
                        <div style="font-weight:700; font-size:13px;">${u.name}</div>
                        <div style="font-size:11px; color:var(--epl-text-sub);">${u.team}</div>
                    </div>
                </div>
                <div>
                    ${isFriend ? `<button class="btn btn-primary" onclick="selectChatFriend(${u.id})" style="padding:6px 12px; font-size:11px;">Chat</button>` :
                      hasRequested ? `<span class="badge-tag">Request Sent</span>` :
                      `<button class="btn" onclick="sendFriendRequest(${u.id})" style="padding:6px 12px; font-size:11px; background:var(--epl-pink); color:#fff;">Add Friend</button>`
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
        alert("Friend request sent!");
        await updateAndSync();
    } catch (err) {
        alert(err.message || "Failed to send friend request.");
    }
}

async function selectChatFriend(friendId) {
    activeChatFriendId = friendId;
    const friend = (window.db.users || []).find(u => u.id === friendId);

    document.getElementById('chatHeaderTitle').innerText = friend ? `Chat with ${friend.name} (${friend.team})` : 'Chat Room';
    document.getElementById('chatForm').style.display = 'flex';
    await renderChatMessages();
}

async function renderChatMessages() {
    const container = document.getElementById('chatBoxContainer');
    if (!container || !activeChatFriendId || !currentUser) return;

    try {
        const msgs = await apiFetch(`/messages.php?action=list&user_id=${currentUser.id}&friend_id=${activeChatFriendId}`).catch(() => []);

        if (msgs.length === 0) {
            container.innerHTML = '<p class="text-sub">No messages yet. Say hello!</p>';
            return;
        }

        container.innerHTML = msgs.map(m => `
            <div style="margin-bottom:8px; text-align:${m.senderId === currentUser.id ? 'right' : 'left'};">
                <span style="display:inline-block; padding:6px 10px; border-radius:8px; background:${m.senderId === currentUser.id ? 'var(--epl-purple)' : 'rgba(255,255,255,0.1)'}; color:#fff; font-size:12px;">${m.message || m.text}</span>
            </div>
        `).join('');
        container.scrollTop = container.scrollHeight;
    } catch (e) {
        container.innerHTML = '<p class="text-sub">Unable to load messages.</p>';
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
        alert(err.message || 'Failed to send message.');
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

        alert("Profile updated successfully!");
        await updateAndSync();
    } catch (err) {
        alert(err.message || "Failed to update profile.");
    }
}

// NOTIFICATIONS SYSTEM
function openNotifications() {
    if (!currentUser) return;
    const userNotifs = (window.db.notifications || []).filter(n => n.userId === currentUser.id);

    let reqsHtml = '';
    if (currentUser.friendRequests && currentUser.friendRequests.length > 0) {
        reqsHtml = '<h4 style="color:var(--epl-mint); margin-bottom:8px;">Friend Requests</h4>';
        reqsHtml += currentUser.friendRequests.map(reqId => {
            const reqUser = (window.db.users || []).find(u => u.id === reqId);
            return `
                <div style="background:rgba(0,0,0,0.4); padding:8px; border-radius:6px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                    <span>${reqUser ? reqUser.name : 'User'} wants to connect</span>
                    <button class="btn btn-primary" onclick="acceptFriendRequest(${reqId})" style="padding:4px 8px; font-size:11px;">Accept</button>
                </div>
            `;
        }).join('');
    }

    let notifHtml = '';
    if (userNotifs.length > 0) {
        notifHtml += userNotifs.map(n => n.text).join('\n• ');
    }

    const messageAlert = (currentUser.friendRequests?.length ? "You have pending friend requests!\n" : "") + (notifHtml ? "Notifications:\n• " + notifHtml : "No pending notifications.");
    alert(messageAlert);
}

async function acceptFriendRequest(reqId) {
    if (!currentUser) return;
    try {
        await apiFetch('/friends.php?action=accept', {
            method: 'POST',
            body: { userId: currentUser.id, requesterId: reqId }
        });
        alert("Friend request accepted!");
        await updateAndSync();
    } catch (err) {
        alert(err.message || "Failed to accept friend request.");
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
                <td>${u.name}</td>
                <td>${u.team}</td>
                <td>*****</td>
                <td><span class="badge-tag" style="background:${u.online ? 'rgba(0,255,135,0.1)' : 'rgba(255,255,255,0.05)'}; color:${u.online ? 'var(--epl-mint)' : '#888'};">${u.online ? 'Online' : 'Offline'}</span></td>
                <td><button class="btn" onclick="deleteUser(${u.id})" style="background:var(--epl-pink); color:#fff; padding:4px 8px; font-size:11px;">Delete</button></td>
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

    if (!name) return alert("Tournament name is required.");

    try {
        await apiFetch('/tournaments.php?action=create', {
            method: 'POST',
            body: { name, rules: rules || "No rules specified.", bgImage: bgImage || "" }
        });

        document.getElementById('adminTournName').value = '';
        document.getElementById('adminTournRules').value = '';
        document.getElementById('adminTournFile').value = '';
        document.getElementById('adminTournBgBase64').value = '';

        alert("Tournament created successfully!");
        await updateAndSync();
    } catch (err) {
        alert(err.message || "Failed to create tournament.");
    }
}

function renderAdminTournamentsList() {
    const container = document.getElementById('adminTournamentsList');
    if (!container) return;

    const list = window.db.tournaments || [];
    if (list.length === 0) {
        container.innerHTML = '<p class="text-sub">No tournaments.</p>';
        return;
    }

    container.innerHTML = list.map(t => `
        <div style="background:rgba(0,0,0,0.4); padding:12px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="font-weight:700;">${t.name}</div>
                <div style="font-size:11px; color:var(--epl-text-sub);">${(t.rules || '').substring(0, 50)}...</div>
            </div>
            <button class="btn" onclick="deleteTournament(${t.id})" style="background:var(--epl-pink); color:#fff; padding:6px 10px; font-size:11px;">Delete</button>
        </div>
    `).join('');
}

async function deleteTournament(id) {
    try {
        await apiFetch(`/tournaments.php?action=delete&id=${id}`, { method: 'DELETE' });
        await updateAndSync();
    } catch (err) {
        alert(err.message || "Failed to delete tournament.");
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
        container.innerHTML = '<p class="text-sub">No fixtures scheduled.</p>';
        return;
    }

    container.innerHTML = fixtures.map(f => `
        <div style="background:rgba(0,0,0,0.5); padding:14px; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <span style="font-size:11px; color:var(--epl-cyan);">${f.weekday}, ${f.date} | ${f.time}</span>
                <div style="font-weight:700; font-size:14px; margin-top:2px;">${f.home} vs ${f.away}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                ${f.played ? `<span style="font-size:13px; font-weight:700; color:var(--epl-mint);">${f.homeScore} - ${f.awayScore} (Played)</span>` : `
                    <input type="number" id="homeScore_${f.id}" placeholder="Home" style="width:50px; padding:6px; background:#000; border:1px solid var(--epl-border); color:#fff; border-radius:4px;">
                    <span>-</span>
                    <input type="number" id="awayScore_${f.id}" placeholder="Away" style="width:50px; padding:6px; background:#000; border:1px solid var(--epl-border); color:#fff; border-radius:4px;">
                    <button class="btn btn-primary" onclick="submitMatchResult(${f.id})" style="padding:6px 10px; font-size:11px;">Save</button>
                `}
                <button class="btn" onclick="deleteFixture(${f.id})" style="background:var(--epl-pink); color:#fff; padding:6px 10px; font-size:11px;">Delete</button>
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
        return alert("Home team and Away team cannot be the same.");
    }

    try {
        await apiFetch('/fixtures.php?action=create', {
            method: 'POST',
            body: { tournId, home, away, date, weekday, time }
        });

        alert("Fixture scheduled successfully!");
        await updateAndSync();
    } catch (err) {
        alert(err.message || "Failed to create fixture.");
    }
}

async function submitMatchResult(fixId) {
    const homeInput = document.getElementById(`homeScore_${fixId}`);
    const awayInput = document.getElementById(`awayScore_${fixId}`);

    const homeScore = parseInt(homeInput.value);
    const awayScore = parseInt(awayInput.value);

    if (isNaN(homeScore) || isNaN(awayScore)) {
        return alert("Please enter valid scores for both teams.");
    }

    try {
        await apiFetch('/fixtures.php?action=submit_score', {
            method: 'POST',
            body: { id: fixId, homeScore, awayScore }
        });

        alert("Match result updated successfully!");
        await updateAndSync();
    } catch (err) {
        alert(err.message || "Failed to update match result.");
    }
}

async function deleteFixture(id) {
    try {
        await apiFetch(`/fixtures.php?action=delete&id=${id}`, { method: 'DELETE' });
        await updateAndSync();
    } catch (err) {
        alert(err.message || "Failed to delete fixture.");
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
        alert("Notification broadcasted to all users successfully!");
        await updateAndSync();
    } catch (err) {
        alert(err.message || "Failed to send notification.");
    }
}

async function deleteUser(id) {
    try {
        await apiFetch(`/users.php?action=delete&id=${id}`, { method: 'DELETE' });
        await updateAndSync();
    } catch (err) {
        alert(err.message || "Failed to delete user.");
    }
}

function renderAdminModeration() {
    const tbody = document.getElementById('adminModerationTableBody');
    if (!tbody) return;

    const users = (window.db.users || []).filter(u => u.role !== 'admin');
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>${u.name}</td>
            <td>${u.team}</td>
            <td>Player</td>
            <td>
                <button class="btn" onclick="deleteUser(${u.id})" style="background:var(--epl-pink); color:#fff; padding:4px 8px; font-size:11px;">Ban / Delete</button>
            </td>
        </tr>
    `).join('');
}

// GENERAL UTILS
function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}
