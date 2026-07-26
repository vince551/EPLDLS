/* ==========================================================================
   EPL DLS HUB - APP CONTROLLER (WITH COMPLETE ADMIN FUNCTIONALITY)
   ========================================================================== */

// Initialize or reference database state
window.db = window.db || {
    users: [
        { id: 1, name: "Admin", team: "System HQ", pass: "admin123", role: "admin", online: true, statusColor: "status-online", pic: "", friendRequests: [], friends: [] },
        { id: 2, name: "Alex Mercer", team: "Shadow Strikers", pass: "1234", role: "user", online: true, statusColor: "status-online", pic: "", friendRequests: [], friends: [] },
        { id: 3, name: "John Doe", team: "Red Dragons", pass: "1234", role: "user", online: false, statusColor: "status-offline", pic: "", friendRequests: [], friends: [] }
    ],
    tournaments: [
        { id: 1, name: "Premier League DLS Cup", rules: "1. Respect match times.\n2. Submit screenshot proofs." }
    ],
    fixtures: [],
    topScorers: [],
    notifications: [],
    messages: []
};

let currentUser = null;

// Global State Sync Trigger
function updateAndSync() {
    if (typeof window.saveToFirebase === 'function') {
        window.saveToFirebase();
    }
    renderAll();
}

// Main View Renderer
window.renderAll = function() {
    if (currentUser) {
        if (currentUser.role === 'admin') {
            renderAdminMembers();
            renderAdminTournaments();
            renderAdminFixturesSelects();
            renderAdminFixturesList();
            renderAdminNotifications();
        } else {
            renderUserTournaments();
            renderUserFixtures();
            updateNotificationBadge();
        }
    }
    calculateTopPlayer();
};

// ------------------- AUTHENTICATION -------------------
function switchAuthTab(type) {
    const tLogin = document.getElementById('toggleLogin');
    const tReg = document.getElementById('toggleReg');
    const fLogin = document.getElementById('loginForm');
    const fReg = document.getElementById('regForm');

    if (!tLogin || !tReg || !fLogin || !fReg) return;

    const isLogin = type === 'login';
    tLogin.classList.toggle('active', isLogin);
    tReg.classList.toggle('active', !isLogin);
    fLogin.style.display = isLogin ? 'block' : 'none';
    fReg.style.display = isLogin ? 'none' : 'block';
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUser')?.value.trim();
    const pass = document.getElementById('loginPass')?.value.trim();

    const user = window.db.users.find(u => u.name.toLowerCase() === username?.toLowerCase() && u.pass === pass);

    if (user) {
        if (user.banned) {
            return alert("This account/team has been banned from participating in tournaments.");
        }

        currentUser = user;
        currentUser.online = true;
        currentUser.statusColor = 'status-online';

        document.getElementById('authPage')?.classList.remove('active');

        const navId = currentUser.role === 'admin' ? 'adminNav' : 'userNav';
        const startPage = currentUser.role === 'admin' ? 'adminHome' : 'userHome';
        
        const nav = document.getElementById(navId);
        if (nav) nav.style.display = 'flex';
        showPage(startPage);

        updateAndSync();
    } else {
        alert("Invalid Username or Password!");
    }
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName')?.value.trim();
    const team = document.getElementById('regTeam')?.value.trim();
    const pass = document.getElementById('regPass')?.value.trim();

    if (!name || !team || !pass) return alert("Please fill out all fields.");

    if (window.db.users.some(u => u.name.toLowerCase() === name.toLowerCase())) {
        return alert("Username already taken.");
    }

    const newUser = {
        id: Date.now(),
        name,
        team,
        pass,
        role: "user",
        online: true,
        statusColor: "status-online",
        pic: "",
        banned: false,
        friendRequests: [],
        friends: []
    };

    window.db.users.push(newUser);
    currentUser = newUser;

    document.getElementById('authPage')?.classList.remove('active');
    const userNav = document.getElementById('userNav');
    if (userNav) userNav.style.display = 'flex';
    
    showPage('userHome');
    updateAndSync();
}

function logout() {
    if (currentUser) {
        currentUser.online = false;
        currentUser.statusColor = 'status-offline';
    }
    currentUser = null;

    ['userNav', 'adminNav'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('authPage')?.classList.add('active');
    updateAndSync();
}

// ------------------- NAVIGATION -------------------
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    const navId = (currentUser && currentUser.role === 'admin') ? 'adminNav' : 'userNav';
    document.querySelectorAll(`#${navId} .nav-btn`).forEach(btn => btn.classList.remove('active'));

    const activeBtn = document.querySelector(`#${navId} button[onclick="showPage('${pageId}')"]`);
    if (activeBtn) activeBtn.classList.add('active');
}

// ------------------- DYNAMIC TICKER -------------------
function calculateTopPlayer() {
    const banner = document.getElementById('topPlayerBanner');
    if (!banner) return;

    let topScorerText = "🏆 TOP SCORER: NO GOALS LOGGED YET";
    if (window.db.topScorers && window.db.topScorers.length > 0) {
        const leader = window.db.topScorers[0];
        topScorerText = `🏆 GOLDEN BOOT LEADER: ${leader.name.toUpperCase()} (${leader.team}) - ${leader.goals} GOALS`;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let todaysFixtures = (window.db.fixtures || []).filter(f => f.date === todayStr);

    let isUpcoming = false;
    if (todaysFixtures.length === 0) {
        todaysFixtures = (window.db.fixtures || []).filter(f => !f.played).slice(0, 5);
        isUpcoming = true;
    }

    let fixtureText = "";
    if (todaysFixtures.length > 0) {
        const fixtureList = todaysFixtures.map(f => 
            f.played 
                ? `⚽ ${f.home} ${f.scoreHome} - ${f.scoreAway} ${f.away} (FT)`
                : `⏳ ${f.home} VS ${f.away} (${f.time})`
        ).join("  |  ");

        const label = isUpcoming ? "UPCOMING MATCHES" : "TODAY'S FIXTURES";
        fixtureText = `  ||  📅 ${label}: ${fixtureList}`;
    } else {
        fixtureText = `  ||  📅 NO MATCHES SCHEDULED`;
    }

    banner.innerHTML = `${topScorerText}${fixtureText}`;
}

// ------------------- USER VIEWS -------------------
function renderUserTournaments() {
    const container = document.getElementById('userTournamentList');
    const homeContainer = document.getElementById('userHomeTournaments');
    if (!container) return;

    if (!window.db.tournaments || window.db.tournaments.length === 0) {
        const emptyMsg = '<p class="text-sub">No tournaments active currently.</p>';
        container.innerHTML = emptyMsg;
        if (homeContainer) homeContainer.innerHTML = emptyMsg;
        return;
    }

    const html = window.db.tournaments.map(t => `
        <div class="tournament-item card" style="margin-bottom: 10px;">
            <h3>${t.name}</h3>
            <p style="font-size:12px; color:var(--epl-text-sub); margin-top:6px; white-space:pre-line;">${t.rules || 'No rules defined.'}</p>
        </div>
    `).join('');

    container.innerHTML = html;
    if (homeContainer) homeContainer.innerHTML = html;
}

function renderUserFixtures() {
    const container = document.getElementById('fixturesContainer');
    if (!container) return;

    const filter = document.getElementById('fixtureFilter')?.value || 'all';
    const search = document.getElementById('teamSearchInput')?.value.toLowerCase() || '';

    let list = window.db.fixtures || [];
    if (filter === 'upcoming') list = list.filter(f => !f.played);
    if (filter === 'played') list = list.filter(f => f.played);
    if (search) {
        list = list.filter(f => f.home.toLowerCase().includes(search) || f.away.toLowerCase().includes(search));
    }

    if (list.length === 0) {
        container.innerHTML = '<p class="text-sub">No fixtures found matching criteria.</p>';
        return;
    }

    container.innerHTML = list.map(f => {
        const opacityStyle = f.played ? 'opacity: 0.55; filter: grayscale(30%);' : '';
        const scoreDisplay = f.played ? `${f.scoreHome} - ${f.scoreAway}` : 'VS';
        return `
            <div class="fixture-card card" style="margin-bottom:8px; ${opacityStyle}">
                <div style="font-size:11px; color:var(--epl-mint); font-weight:bold;">${f.day || f.date} @ ${f.time} ${f.played ? '(FINISHED)' : '(SCHEDULED)'}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin: 12px 0; font-weight:bold;">
                    <span style="font-size:15px;">${f.home}</span>
                    <span style="background:var(--epl-pink); padding:6px 14px; border-radius:4px; font-weight:900;">${scoreDisplay}</span>
                    <span style="font-size:15px;">${f.away}</span>
                </div>
            </div>
        `;
    }).join('');
}

function updateNotificationBadge() {
    const badge = document.getElementById('notifBadge');
    if (badge) {
        badge.innerText = window.db.notifications ? window.db.notifications.length : 0;
    }
}

// ==========================================================================
// 3. ADMIN MANAGEMENT FUNCTIONS
// ==========================================================================

// --- MEMBER DIRECTORY & ONLINE STATUS ---
function renderAdminMembers() {
    const tbody = document.getElementById('adminMembersTableBody');
    const countBadge = document.getElementById('onlineUsersCount');
    if (!tbody) return;

    const users = window.db.users || [];
    const onlineUsers = users.filter(u => u.online);
    
    if (countBadge) {
        countBadge.innerText = `Online: ${onlineUsers.length} / ${users.length}`;
    }

    tbody.innerHTML = users.map((u, index) => {
        const isOnline = u.online;
        const statusDot = `<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:${isOnline ? '#00ff87' : '#888'}; box-shadow:${isOnline ? '0 0 8px #00ff87' : 'none'}; margin-right:6px;"></span>`;
        const bannedLabel = u.banned ? '<span style="color:var(--epl-pink); font-weight:bold;"> (BANNED)</span>' : '';

        return `
            <tr style="border-bottom: 1px solid var(--epl-border);">
                <td style="padding:10px;">${index + 1}</td>
                <td style="padding:10px;">${statusDot} ${isOnline ? 'Online' : 'Offline'}</td>
                <td style="padding:10px; font-weight:bold;">${u.name}${bannedLabel}</td>
                <td style="padding:10px;">${u.team}</td>
                <td style="padding:10px; color:var(--epl-text-sub); font-family:monospace;">${u.pass}</td>
                <td style="padding:10px;">
                    ${u.role !== 'admin' ? `
                        <button style="background:var(--epl-pink); color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px;" onclick="deleteUser(${u.id})">Delete</button>
                        <button style="background:${u.banned ? '#00ff87' : '#e90052'}; color:${u.banned ? '#000' : '#fff'}; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px; margin-left:4px;" onclick="toggleBanUser(${u.id})">
                            ${u.banned ? 'Unban' : 'Ban Team'}
                        </button>
                    ` : '<span style="font-size:11px; color:var(--epl-mint);">System HQ</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

function deleteUser(id) {
    if (!confirm("Are you sure you want to delete this player and team?")) return;
    window.db.users = window.db.users.filter(u => u.id !== id);
    updateAndSync();
}

function toggleBanUser(id) {
    const user = window.db.users.find(u => u.id === id);
    if (user) {
        user.banned = !user.banned;
        alert(`${user.name} (${user.team}) has been ${user.banned ? 'banned' : 'unbanned'}.`);
        updateAndSync();
    }
}

// --- TOURNAMENT MANAGEMENT & RULES ---
function handleCreateTournament(e) {
    e.preventDefault();
    const nameInput = document.getElementById('adminTournName');
    const rulesInput = document.getElementById('adminTournRules');

    if (!nameInput.value.trim()) return;

    const newTourn = {
        id: Date.now(),
        name: nameInput.value.trim(),
        rules: rulesInput.value.trim()
    };

    window.db.tournaments.push(newTourn);
    nameInput.value = '';
    rulesInput.value = '';

    alert("Tournament Created Successfully!");
    updateAndSync();
}

function renderAdminTournaments() {
    const container = document.getElementById('adminTournamentsList');
    if (!container) return;

    const tourns = window.db.tournaments || [];
    if (tourns.length === 0) {
        container.innerHTML = '<p class="text-sub">No tournaments active.</p>';
        return;
    }

    container.innerHTML = tourns.map(t => `
        <div class="card" style="background:rgba(0,0,0,0.3); margin-bottom:12px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="color:var(--epl-mint);">${t.name}</h3>
                <button style="background:var(--epl-pink); color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;" onclick="deleteTournament(${t.id})">Delete Tournament</button>
            </div>
            <div style="margin-top:10px;">
                <label style="font-size:11px; color:var(--epl-text-sub); display:block; margin-bottom:4px;">Edit Tournament Rules:</label>
                <textarea id="rules_${t.id}" rows="3" style="width:100%;">${t.rules || ''}</textarea>
                <button class="btn btn-primary" style="margin-top:8px; padding:6px 12px; font-size:12px;" onclick="saveTournamentRules(${t.id})">Save Rules</button>
            </div>
        </div>
    `).join('');
}

function saveTournamentRules(id) {
    const rulesText = document.getElementById(`rules_${id}`)?.value;
    const tourn = window.db.tournaments.find(t => t.id === id);
    if (tourn) {
        tourn.rules = rulesText;
        alert("Tournament rules updated successfully!");
        updateAndSync();
    }
}

function deleteTournament(id) {
    if (!confirm("Delete this tournament?")) return;
    window.db.tournaments = window.db.tournaments.filter(t => t.id !== id);
    updateAndSync();
}

// --- FIXTURE MANAGEMENT & AUTO WEEKDAY DETECTION ---
function renderAdminFixturesSelects() {
    const homeSelect = document.getElementById('fixtureHomeSelect');
    const awaySelect = document.getElementById('fixtureAwaySelect');
    if (!homeSelect || !awaySelect) return;

    const users = (window.db.users || []).filter(u => u.role !== 'admin' && !u.banned);
    const options = users.map(u => `<option value="${u.team}">${u.team} (${u.name})</option>`).join('');

    homeSelect.innerHTML = `<option value="">Select Home Team</option>` + options;
    awaySelect.innerHTML = `<option value="">Select Away Team</option>` + options;
}

function handleDateChange(dateValue) {
    const dayInput = document.getElementById('fixtureDay');
    if (!dayInput || !dateValue) return;

    const dateObj = new Date(dateValue + 'T00:00:00');
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    dayInput.value = weekday;
}

function handleCreateFixture(e) {
    e.preventDefault();
    const home = document.getElementById('fixtureHomeSelect')?.value;
    const away = document.getElementById('fixtureAwaySelect')?.value;
    const date = document.getElementById('fixtureDate')?.value;
    const day = document.getElementById('fixtureDay')?.value;
    const time = document.getElementById('fixtureTime')?.value;

    if (!home || !away || !date || !time) {
        return alert("Please select Home Team, Away Team, Date, and Time.");
    }

    if (home === away) {
        return alert("Home and Away teams must be different!");
    }

    const newFixture = {
        id: Date.now(),
        home,
        away,
        date,
        day,
        time,
        played: false,
        scoreHome: 0,
        scoreAway: 0
    };

    window.db.fixtures.push(newFixture);
    alert("Fixture Scheduled Successfully!");
    updateAndSync();
}

function renderAdminFixturesList() {
    const container = document.getElementById('adminFixturesList');
    if (!container) return;

    const list = window.db.fixtures || [];
    if (list.length === 0) {
        container.innerHTML = '<p class="text-sub">No fixtures scheduled.</p>';
        return;
    }

    container.innerHTML = list.map(f => `
        <div class="card" style="margin-bottom:12px; background:rgba(0,0,0,0.3); ${f.played ? 'opacity:0.65;' : ''}">
            <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--epl-mint);">
                <span>${f.day || f.date} @ ${f.time}</span>
                <span>Status: ${f.played ? 'Completed (Played)' : 'Scheduled'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin:12px 0;">
                <span style="font-weight:bold; width:35%;">${f.home}</span>
                
                <div style="display:flex; gap:6px; align-items:center;">
                    <input type="number" id="scoreH_${f.id}" value="${f.scoreHome}" style="width:50px; text-align:center;">
                    <span>-</span>
                    <input type="number" id="scoreA_${f.id}" value="${f.scoreAway}" style="width:50px; text-align:center;">
                </div>

                <span style="font-weight:bold; width:35%; text-align:right;">${f.away}</span>
            </div>

            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button class="btn btn-primary" style="width:auto; padding:6px 14px; font-size:11px;" onclick="updateFixtureScore(${f.id})">
                    ${f.played ? 'Update Score' : 'Submit Final Score'}
                </button>
                <button style="background:var(--epl-pink); color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:11px;" onclick="deleteFixture(${f.id})">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

function updateFixtureScore(id) {
    const fixture = window.db.fixtures.find(f => f.id === id);
    if (!fixture) return;

    const sH = parseInt(document.getElementById(`scoreH_${id}`)?.value || 0);
    const sA = parseInt(document.getElementById(`scoreA_${id}`)?.value || 0);

    fixture.scoreHome = sH;
    fixture.scoreAway = sA;
    fixture.played = true;

    alert(`Result set: ${fixture.home} ${sH} - ${sA} ${fixture.away}`);
    updateAndSync();
}

function deleteFixture(id) {
    if (!confirm("Delete this match fixture?")) return;
    window.db.fixtures = window.db.fixtures.filter(f => f.id !== id);
    updateAndSync();
}

// --- NOTIFICATION MANAGEMENT ---
function handleSendNotification(e) {
    e.preventDefault();
    const type = document.getElementById('notifType')?.value;
    const msg = document.getElementById('notifMessage')?.value.trim();

    if (!msg) return;

    const notif = {
        id: Date.now(),
        type,
        message: msg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    window.db.notifications = window.db.notifications || [];
    window.db.notifications.unshift(notif);

    document.getElementById('notifMessage').value = '';
    alert("Notification sent to all users!");
    updateAndSync();
}

function renderAdminNotifications() {
    const container = document.getElementById('adminNotificationLogs');
    if (!container) return;

    const logs = window.db.notifications || [];
    if (logs.length === 0) {
        container.innerHTML = '<p class="text-sub">No notifications logged yet.</p>';
        return;
    }

    container.innerHTML = logs.map(n => `
        <div style="padding:10px; border-bottom:1px solid var(--epl-border); font-size:12px;">
            <span style="color:var(--epl-mint); font-weight:bold;">[${n.type}] ${n.timestamp}</span>: ${n.message}
        </div>
    `).join('');
}

// Add 'userProfile' rendering into renderAll()
const originalRenderAll = renderAll;
renderAll = function() {
    if (typeof originalRenderAll === 'function') originalRenderAll();
    if (currentUser && currentUser.role === 'user') {
        renderUserProfile();
    }
};

// --- RENDER & EDIT USER PROFILE ---
function renderUserProfile() {
    const container = document.getElementById('profileDetails');
    if (!container || !currentUser) return;

    const currentPic = currentUser.pic || 'https://via.placeholder.com/100?text=Avatar';

    container.innerHTML = `
        <form onsubmit="handleUpdateProfile(event)" class="profile-form">
            <div class="avatar-preview-container">
                <img id="avatarPreview" src="${currentPic}" alt="Profile Picture" class="avatar-img">
            </div>

            <div class="form-group">
                <label for="profPicUrl">Profile Picture URL / Upload</label>
                <input type="text" id="profPicUrl" value="${currentUser.pic || ''}" placeholder="Paste image URL..." oninput="previewAvatarUrl(this.value)">
                <input type="file" id="profPicFile" accept="image/*" onchange="handleFileUpload(event)" style="margin-top: 8px;">
            </div>

            <div class="form-group">
                <label for="profName">Full Name</label>
                <input type="text" id="profName" value="${currentUser.name}" required>
            </div>

            <div class="form-group">
                <label for="profTeam">Team Name</label>
                <input type="text" id="profTeam" value="${currentUser.team}" required>
            </div>

            <div class="form-group">
                <label for="profPass">New Password (leave blank to keep current)</label>
                <input type="password" id="profPass" placeholder="••••••••">
            </div>

            <button class="btn btn-primary" type="submit">Update Profile</button>
        </form>
    `;
}

function previewAvatarUrl(url) {
    const img = document.getElementById('avatarPreview');
    if (img && url) {
        img.src = url;
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const base64Url = evt.target.result;
        document.getElementById('profPicUrl').value = base64Url;
        document.getElementById('avatarPreview').src = base64Url;
    };
    reader.readAsDataURL(file);
}

function handleUpdateProfile(e) {
    e.preventDefault();
    if (!currentUser) return;

    const newName = document.getElementById('profName').value.trim();
    const newTeam = document.getElementById('profTeam').value.trim();
    const newPic = document.getElementById('profPicUrl').value.trim();
    const newPass = document.getElementById('profPass').value.trim();

    if (!newName || !newTeam) {
        return alert("Name and Team Name cannot be empty.");
    }

    // Check username conflict
    const nameConflict = window.db.users.some(u => u.id !== currentUser.id && u.name.toLowerCase() === newName.toLowerCase());
    if (nameConflict) {
        return alert("That username is already taken by another player.");
    }

    // Apply updates to local user object
    currentUser.name = newName;
    currentUser.team = newTeam;
    currentUser.pic = newPic;
    if (newPass) {
        currentUser.pass = newPass;
    }

    // Update in global array
    const idx = window.db.users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
        window.db.users[idx] = currentUser;
    }

    alert("Profile updated successfully!");
    updateAndSync();
}

// --- FORGOT PASSWORD HANDLER ---
function handleForgotPassword(e) {
    e.preventDefault();
    const name = document.getElementById('resetName')?.value.trim();
    const newPass = document.getElementById('resetNewPass')?.value.trim();

    const user = window.db.users.find(u => u.name.toLowerCase() === name.toLowerCase());

    if (!user) {
        return alert("User with that name was not found.");
    }

    user.pass = newPass;
    alert("Password reset successfully! You can now log in with your new password.");
    closeModal('forgotPassModal');
    updateAndSync();
}

// --- OPEN TOURNAMENT MODAL HANDLER ---
function openTournamentModal(tournId) {
    const tourn = window.db.tournaments.find(t => t.id === tournId);
    if (!tourn) return;

    document.getElementById('modalTournTitle').innerText = tourn.name;
    document.getElementById('modalTournRules').innerText = tourn.rules || 'No rules published yet.';

    const fixtures = window.db.fixtures || [];
    let fixHtml = '';

    if (fixtures.length === 0) {
        fixHtml = '<p class="text-sub">No fixtures scheduled yet.</p>';
    } else {
        fixHtml = fixtures.map(f => `
            <div style="padding:8px; border-bottom:1px solid var(--epl-border); font-size:12px; display:flex; justify-content:space-between;">
                <span>${f.home} vs ${f.away}</span>
                <span style="color:var(--epl-mint); font-weight:bold;">${f.played ? f.scoreHome + ' - ' + f.scoreAway : f.time}</span>
            </div>
        `).join('');
    }

    document.getElementById('modalTournFixtures').innerHTML = fixHtml;
    document.getElementById('openTournModal').classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// --- ENHANCED USER FIXTURES (GROUPED BY DATE & TEAM HIGHLIGHTING) ---
function renderUserFixturesGrouped() {
    const container = document.getElementById('fixturesContainer');
    if (!container) return;

    const filter = document.getElementById('fixtureFilter')?.value || 'all';
    const search = document.getElementById('teamSearchInput')?.value.toLowerCase() || '';
    const userTeam = currentUser?.team?.toLowerCase();

    let list = window.db.fixtures || [];
    if (filter === 'upcoming') list = list.filter(f => !f.played);
    if (filter === 'played') list = list.filter(f => f.played);
    if (search) {
        list = list.filter(f => f.home.toLowerCase().includes(search) || f.away.toLowerCase().includes(search));
    }

    if (list.length === 0) {
        container.innerHTML = '<p class="text-sub">No fixtures available.</p>';
        return;
    }

    // Grouping by Date / Day
    const grouped = {};
    list.forEach(f => {
        const key = `${f.day || 'Scheduled Date'}, ${f.date}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(f);
    });

    let html = '';
    for (const groupDate in grouped) {
        html += `<h3 style="color:var(--epl-mint); margin: 16px 0 8px 0; font-size:14px; border-bottom:1px solid var(--epl-border); padding-bottom:4px;">${groupDate}</h3>`;

        grouped[groupDate].forEach(f => {
            const opacityStyle = f.played ? 'opacity: 0.55; filter: grayscale(30%);' : '';
            const scoreDisplay = f.played ? `${f.scoreHome} - ${f.scoreAway}` : 'VS';
            
            // Highlight user's team if present
            const isUserMatch = userTeam && (f.home.toLowerCase().includes(userTeam) || f.away.toLowerCase().includes(userTeam));
            const highlightBorder = isUserMatch ? 'border: 2px solid var(--epl-mint); box-shadow: 0 0 10px rgba(0,255,135,0.3);' : '';

            html += `
                <div class="fixture-card card" style="margin-bottom:8px; ${opacityStyle} ${highlightBorder}">
                    <div style="font-size:11px; color:var(--epl-cyan); font-weight:bold;">${f.time} ${f.played ? '(FINISHED)' : '(UPCOMING)'}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin: 10px 0; font-weight:bold;">
                        <span style="font-size:14px; ${isUserMatch && f.home.toLowerCase().includes(userTeam) ? 'color:var(--epl-mint);' : ''}">${f.home}</span>
                        <span style="background:var(--epl-pink); padding:4px 12px; border-radius:4px; font-weight:900; font-size:13px;">${scoreDisplay}</span>
                        <span style="font-size:14px; ${isUserMatch && f.away.toLowerCase().includes(userTeam) ? 'color:var(--epl-mint);' : ''}">${f.away}</span>
                    </div>
                </div>
            `;
        });
    }

    container.innerHTML = html;
}
// DLS KITS & LOGO DATABASE
const dlsTeamsData = [
    {
        id: "arsenal",
        name: "Arsenal FC",
        logo: "https://dlskits.com/wp-content/uploads/2023/07/Arsenal-DLS-Logo.png",
        kits: [
            { type: "Home Kit", img: "https://dlskits.com/wp-content/uploads/2023/07/Arsenal-DLS-Kits-2023-2024-Home.png" },
            { type: "Away Kit", img: "https://dlskits.com/wp-content/uploads/2023/07/Arsenal-DLS-Kits-2023-2024-Away.png" },
            { type: "Third Kit", img: "https://dlskits.com/wp-content/uploads/2023/07/Arsenal-DLS-Kits-2023-2024-Third.png" },
            { type: "GK Kit", img: "https://dlskits.com/wp-content/uploads/2023/07/Arsenal-DLS-Kits-2023-2024-GK.png" }
        ]
    },
    {
        id: "chelsea",
        name: "Chelsea FC",
        logo: "https://dlskits.com/wp-content/uploads/2023/07/Chelsea-DLS-Logo.png",
        kits: [
            { type: "Home Kit", img: "https://dlskits.com/wp-content/uploads/2023/07/Chelsea-DLS-Kits-2023-2024-Home.png" },
            { type: "Away Kit", img: "https://dlskits.com/wp-content/uploads/2023/07/Chelsea-DLS-Kits-2023-2024-Away.png" },
            { type: "GK Kit", img: "https://dlskits.com/wp-content/uploads/2023/07/Chelsea-DLS-Kits-2023-2024-GK.png" }
        ]
    },
    {
        id: "mancity",
        name: "Manchester City",
        logo: "https://dlskits.com/wp-content/uploads/2023/07/Manchester-City-DLS-Logo.png",
        kits: [
            { type: "Home Kit", img: "https://dlskits.com/wp-content/uploads/2023/07/Manchester-City-DLS-Kits-2023-2024-Home.png" },
            { type: "Away Kit", img: "https://dlskits.com/wp-content/uploads/2023/07/Manchester-City-DLS-Kits-2023-2024-Away.png" },
            { type: "Third Kit", img: "https://dlskits.com/wp-content/uploads/2023/07/Manchester-City-DLS-Kits-2023-2024-Third.png" }
        ]
    },
    {
        id: "realmadrid",
        name: "Real Madrid",
        logo: "https://dlskits.com/wp-content/uploads/2023/07/Real-Madrid-DLS-Logo.png",
        kits: [
            { type: "Home Kit", img: "https://dlskits.com/wp-content/uploads/2023/07/Real-Madrid-DLS-Kits-2023-2024-Home.png" },
            { type: "Away Kit", img: "https://dlskits.com/wp-content/uploads/2023/07/Real-Madrid-DLS-Kits-2023-2024-Away.png" }
        ]
    }
];

// RENDER TEAM CARDS ON KITS PAGE
function renderTeamKitsGrid() {
    const grid = document.getElementById('teamKitsGrid');
    if (!grid) return;

    grid.innerHTML = dlsTeamsData.map(team => `
        <div class="team-select-card" onclick="openTeamKitsModal('${team.id}')">
            <div class="team-card-logo">
                <img src="${team.logo}" alt="${team.name}" onerror="this.src='https://via.placeholder.com/100?text=Logo'">
            </div>
            <h3>${team.name}</h3>
            <span class="badge-tag">${team.kits.length} Kits + Logo Available</span>
        </div>
    `).join('');
}

// OPEN SPECIFIC TEAM MODAL
function openTeamKitsModal(teamId) {
    const team = dlsTeamsData.find(t => t.id === teamId);
    if (!team) return;

    document.getElementById('modalTeamName').innerText = team.name;
    document.getElementById('modalTeamLogoImg').src = team.logo;
    document.getElementById('modalLogoPreview').src = team.logo;
    document.getElementById('modalLogoUrlInput').value = team.logo;

    const kitsContainer = document.getElementById('modalKitsGrid');
    kitsContainer.innerHTML = team.kits.map((kit, index) => `
        <div class="kit-modal-card">
            <div class="kit-img-wrapper">
                <img src="${kit.img}" alt="${kit.type}" onerror="this.src='https://via.placeholder.com/200?text=Kit+Preview'">
            </div>
            <h5>${kit.type}</h5>
            <div class="kit-url-box">
                <input type="text" readonly id="kitInput_${index}" value="${kit.img}" class="kit-url-input">
                <button class="btn btn-primary" onclick="copyInputUrl('kitInput_${index}')">Copy</button>
            </div>
        </div>
    `).join('');

    document.getElementById('teamKitsModal').classList.add('active');
}

// GENERIC CLIPBOARD COPY FUNCTION
function copyInputUrl(inputId) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl) return;

    inputEl.select();
    navigator.clipboard.writeText(inputEl.value).then(() => {
        alert("Copied to clipboard! Ready to paste into DLS customization menu.");
    });
}

// Call renderer on page initialization
window.addEventListener('DOMContentLoaded', () => {
    renderTeamKitsGrid();
});

// Convert uploaded device file to Base64 for tournament background
function previewTournBgFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        document.getElementById('adminTournBgBase64').value = evt.target.result;
    };
    reader.readAsDataURL(file);
}

function handleCreateTournament(e) {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') return;

    const name = document.getElementById('adminTournName').value.trim();
    const rules = document.getElementById('adminTournRules').value.trim();
    const bgImage = document.getElementById('adminTournBgBase64').value.trim();

    if (!name) {
        return alert("Tournament name is required.");
    }

    const newTournament = {
        id: Date.now(),
        name: name,
        rules: rules || "No specific rules provided.",
        bgImage: bgImage || ""
    };

    window.db.tournaments = window.db.tournaments || [];
    window.db.tournaments.push(newTournament);

    // Reset form fields
    document.getElementById('adminTournName').value = '';
    document.getElementById('adminTournRules').value = '';
    document.getElementById('adminTournFile').value = '';
    document.getElementById('adminTournBgBase64').value = '';

    alert("Tournament created with device background successfully!");
    updateAndSync();
}