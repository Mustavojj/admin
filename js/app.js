const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBX5ACaFjmygFxMb1FvZBHp3nLoxUB7rdc",
  authDomain: "veltrix-999.firebaseapp.com",
  databaseURL: "https://veltrix-999-default-rtdb.firebaseio.com",
  projectId: "veltrix-999",
  storageBucket: "veltrix-999.firebasestorage.app",
  messagingSenderId: "152153110774",
  appId: "1:152153110774:web:0e3049619d0cb84f11d4d7",
  measurementId: "G-FY1LF425BH"
};

const BOT_TOKEN = "8644664050:AAEo3FBkHkBNq10c0oiI76SfsABddvZ4HMg";
const ADMIN_PASSWORDS = ["Mostafa$500"];
const ADMIN_TELEGRAM_ID = "1891231976";

const DEFAULT_IMAGE_URL = "https://i.ibb.co/XxXhyZYf/file-000000006f8c720e9ab4c76b6e560062.png";

class VeltrixAdminPanel {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.botToken = BOT_TOKEN;
        this.currentTaskTab = 'main';
        
        // New database structure paths
        this.dbPaths = {
            users: 'users',
            devices: 'devices',
            referrals: 'referrals',
            tasks: 'tasks',
            promoCodes: 'promoCodes',
            usedPromoCodes: 'usedPromoCodes',
            withdrawals: 'withdrawals',
            status: 'Status'
        };
        
        this.elements = {
            loginContainer: document.getElementById('login-container'),
            appContainer: document.getElementById('app-container'),
            loginButton: document.getElementById('login-button'),
            loginPassword: document.getElementById('login-password'),
            loginMessage: document.getElementById('login-message'),
            contentArea: document.getElementById('content-area'),
            pageTitle: document.getElementById('page-title'),
            sidebar: document.getElementById('sidebar'),
            sidebarOverlay: document.getElementById('sidebar-overlay'),
            menuToggle: document.getElementById('menu-toggle'),
            logoutBtn: document.getElementById('logout-btn'),
            sidebarClose: document.querySelector('.sidebar-close')
        };
        
        this.initializeFirebase();
    }

    async initializeFirebase() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }
            
            this.db = firebase.database();
            this.auth = firebase.auth();
            
            console.log("✅ Veltrix Admin Panel initialized");
            
            this.setupEventListeners();
            
        } catch (error) {
            console.error("❌ Firebase initialization error:", error);
            this.showLoginMessage("Failed to initialize", "error");
        }
    }

    setupEventListeners() {
        this.elements.loginButton.addEventListener('click', () => this.handleLogin());
        this.elements.loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        
        this.elements.menuToggle.addEventListener('click', () => this.toggleSidebar());
        this.elements.sidebarOverlay.addEventListener('click', () => this.hideSidebar());
        this.elements.sidebarClose.addEventListener('click', () => this.hideSidebar());
        this.elements.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        this.setupNavigation();
    }

    toggleSidebar() {
        this.elements.sidebar.classList.toggle('show');
        this.elements.sidebarOverlay.classList.toggle('show');
    }

    hideSidebar() {
        this.elements.sidebar.classList.remove('show');
        this.elements.sidebarOverlay.classList.remove('show');
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const pageKey = e.currentTarget.dataset.page;
                if (pageKey) {
                    navItems.forEach(nav => nav.classList.remove('active'));
                    item.classList.add('active');
                    this.showPage(pageKey);
                    this.hideSidebar();
                }
            });
        });
    }

    showLoginMessage(message, type) {
        const messageEl = this.elements.loginMessage;
        messageEl.textContent = message;
        messageEl.className = `login-message ${type}`;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }

    async handleLogin() {
        const password = this.elements.loginPassword.value.trim();
        
        if (!password) {
            this.showLoginMessage("Please enter a password", "error");
            return;
        }

        this.elements.loginButton.disabled = true;
        this.elements.loginButton.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Authenticating...';
        
        try {
            const userCredential = await this.auth.signInAnonymously();
            this.currentUser = userCredential.user;
            
            const isValid = ADMIN_PASSWORDS.includes(password);
            
            if (isValid) {
                this.showLoginMessage("Login successful!", "success");
                
                setTimeout(() => {
                    this.elements.loginContainer.style.display = 'none';
                    this.elements.appContainer.style.display = 'flex';
                    this.showPage('dashboard');
                }, 1000);
            } else {
                this.showLoginMessage("Invalid password!", "error");
                this.elements.loginPassword.focus();
            }
            
        } catch (error) {
            console.error("Login error:", error);
            this.showLoginMessage("Authentication failed", "error");
        } finally {
            this.elements.loginButton.disabled = false;
            this.elements.loginButton.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> Login';
        }
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.auth.signOut();
            this.elements.appContainer.style.display = 'none';
            this.elements.loginContainer.style.display = 'flex';
            this.elements.loginPassword.value = '';
            this.elements.loginPassword.focus();
        }
    }

    async showPage(pageName) {
        this.elements.pageTitle.textContent = this.getPageTitle(pageName);
        
        switch(pageName) {
            case 'dashboard':
                await this.renderDashboard();
                break;
            case 'users':
                await this.renderUsers();
                break;
            case 'tasks':
                await this.renderTasks();
                break;
            case 'promoCodes':
                await this.renderPromoCodes();
                break;
            case 'withdrawals':
                await this.renderWithdrawals();
                break;
            case 'broadcast':
                await this.renderBroadcast();
                break;
            case 'myUid':
                await this.renderMyUid();
                break;
            default:
                await this.renderDashboard();
        }
    }

    getPageTitle(pageName) {
        const titles = {
            'dashboard': 'VELTRIX Dashboard',
            'users': 'Users Management',
            'tasks': 'Tasks Management',
            'promoCodes': 'Promo Codes',
            'withdrawals': 'Withdrawals',
            'broadcast': 'Broadcast',
            'myUid': 'My UID'
        };
        return titles[pageName] || 'VELTRIX Mining';
    }

    async renderDashboard() {
        this.elements.contentArea.innerHTML = `
            <div class="dashboard-page">
                <div class="page-header">
                    <h2><i class="fas fa-chart-pie"></i> Dashboard Overview</h2>
                    <p>Welcome to VELTRIX Mining Admin Panel</p>
                </div>
                
                <div class="loading" id="dashboardLoading">
                    <div class="spinner"></div>
                    <p>Loading Dashboard Data...</p>
                </div>
                
                <div id="dashboardContent" class="dashboard-content" style="display: none;">
                    <div class="stats-grid">
                        <div class="stats-row">
                            <div class="stat-card">
                                <div class="stat-card-header">
                                    <i class="fas fa-chart-line"></i>
                                    <h3>App Statistics</h3>
                                </div>
                                <div class="stat-card-body">
                                    <div class="stat-item">
                                        <span class="stat-label">Total Users</span>
                                        <span class="stat-value" id="totalUsersStat">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Total Withdrawals</span>
                                        <span class="stat-value" id="totalWithdrawalsStat">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Total TON Paid</span>
                                        <span class="stat-value" id="totalTonPaidStat">0 TON</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Active Miners</span>
                                        <span class="stat-value" id="activeMinersStat">0</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-card-header">
                                    <i class="fas fa-list-check"></i>
                                    <h3>Tasks Statistics</h3>
                                </div>
                                <div class="stat-card-body">
                                    <div class="stat-item">
                                        <span class="stat-label">Total Tasks</span>
                                        <span class="stat-value" id="totalTasksStat">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Main Tasks</span>
                                        <span class="stat-value" id="mainTasksStat">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Partner Tasks</span>
                                        <span class="stat-value" id="partnerTasksStat">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Completed Tasks</span>
                                        <span class="stat-value" id="completedTasksStat">0</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        await this.loadDashboardData();
    }

    async loadDashboardData() {
        try {
            const statusSnap = await this.db.ref(this.dbPaths.status).once('value');
            const status = statusSnap.val() || {};
            
            const totalUsers = status.totalUsers || 0;
            const totalWithdrawals = status.totalWithdrawals || 0;
            const totalTonPaid = status.totalTonPaid || 0;
            
            const tasksSnap = await this.db.ref(this.dbPaths.tasks).once('value');
            let mainTasks = 0;
            let partnerTasks = 0;
            let completedTasks = 0;
            
            if (tasksSnap.exists()) {
                tasksSnap.forEach(child => {
                    const task = child.val();
                    if (task.category === 'main') mainTasks++;
                    if (task.category === 'partner') partnerTasks++;
                    if (task.total) completedTasks += task.total;
                });
            }
            
            // Count active miners (users with miningActive = true)
            const usersSnap = await this.db.ref(this.dbPaths.users).once('value');
            let activeMiners = 0;
            if (usersSnap.exists()) {
                usersSnap.forEach(child => {
                    const user = child.val();
                    if (user.miningActive === true) activeMiners++;
                });
            }
            
            document.getElementById('dashboardLoading').style.display = 'none';
            document.getElementById('dashboardContent').style.display = 'block';
            
            document.getElementById('totalUsersStat').textContent = totalUsers;
            document.getElementById('totalWithdrawalsStat').textContent = totalWithdrawals;
            document.getElementById('totalTonPaidStat').textContent = totalTonPaid.toFixed(3) + ' TON';
            document.getElementById('activeMinersStat').textContent = activeMiners;
            document.getElementById('totalTasksStat').textContent = mainTasks + partnerTasks;
            document.getElementById('mainTasksStat').textContent = mainTasks;
            document.getElementById('partnerTasksStat').textContent = partnerTasks;
            document.getElementById('completedTasksStat').textContent = completedTasks;
            
        } catch (error) {
            console.error("Error loading dashboard:", error);
            document.getElementById('dashboardLoading').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading dashboard data</p>
                </div>
            `;
        }
    }

    async renderUsers() {
        this.elements.contentArea.innerHTML = `
            <div class="users-page">
                <div class="page-header">
                    <h2><i class="fas fa-users"></i> Users Management</h2>
                    <p>Search and manage VELTRIX miners</p>
                </div>
                
                <div class="search-section">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="searchUserInput" placeholder="Search by User ID, Username, or Telegram ID">
                        <button class="search-btn" onclick="admin.searchUser()">
                            <i class="fas fa-search"></i> Search
                        </button>
                    </div>
                    <button class="action-btn btn-secondary" onclick="admin.clearSearch()">
                        <i class="fas fa-times"></i> Clear
                    </button>
                </div>
                
                <div id="userResults" class="user-results">
                    <div class="empty-state">
                        <i class="fas fa-user-search"></i>
                        <p>Search for a miner by ID, username, or Telegram ID</p>
                    </div>
                </div>
            </div>
        `;
    }

    async searchUser() {
        const searchTerm = document.getElementById('searchUserInput').value.trim();
        
        if (!searchTerm) {
            this.showNotification("Info", "Please enter search term", "info");
            return;
        }
        
        try {
            const usersSnap = await this.db.ref(this.dbPaths.users).once('value');
            const results = [];
            
            usersSnap.forEach(child => {
                const user = child.val();
                const userId = child.key;
                const username = user.username || '';
                const firstName = user.firstName || '';
                const telegramId = user.id || '';
                
                const searchStr = `${userId} ${username} ${firstName} ${telegramId}`.toLowerCase();
                
                if (searchStr.includes(searchTerm.toLowerCase())) {
                    results.push({
                        id: userId,
                        ...user
                    });
                }
            });
            
            if (results.length === 0) {
                document.getElementById('userResults').innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-times"></i>
                        <p>No users found for "${searchTerm}"</p>
                    </div>
                `;
            } else {
                this.displayUsers(results);
            }
            
        } catch (error) {
            console.error("Error searching users:", error);
            this.showNotification("Error", "Search failed", "error");
        }
    }

    clearSearch() {
        document.getElementById('searchUserInput').value = '';
        document.getElementById('userResults').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-search"></i>
                <p>Search for a miner by ID, username, or Telegram ID</p>
            </div>
        `;
    }

    async displayUsers(users) {
        const container = document.getElementById('userResults');
        
        if (users.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>No users found</p></div>`;
            return;
        }
        
        let html = '<div class="users-list">';
        
        for (const user of users) {
            const powerBalance = this.safeNumber(user.powerBalance || 0);
            const tonBalance = this.safeNumber(user.tonBalance || 0);
            const level = this.safeNumber(user.level || 1);
            const totalReferrals = this.safeNumber(user.totalReferrals || 0);
            const verifiedReferrals = this.safeNumber(user.verifiedReferrals || 0);
            const referralPower = this.safeNumber(user.referralPower || 0);
            const referralTon = this.safeNumber(user.referralTon || 0);
            const miningActive = user.miningActive || false;
            const isVerified = user.isVerified || false;
            const username = user.username || '';
            const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
            const firstName = user.firstName || 'Miner';
            const joinedAt = user.createdAt ? this.formatDateTime(user.createdAt) : 'N/A';
            const photoUrl = user.photoUrl || DEFAULT_IMAGE_URL;
            const telegramProfileUrl = cleanUsername ? `https://t.me/${cleanUsername}` : '#';
            const status = user.status === 'banned' ? 'banned' : 'active';
            
            html += `
                <div class="user-card">
                    <div class="user-card-header">
                        <div class="user-avatar">
                            ${user.photoUrl ? 
                                `<img src="${user.photoUrl}" alt="${firstName}" onerror="this.src='${DEFAULT_IMAGE_URL}'">` : 
                                `<i class="fas fa-user-circle"></i>`
                            }
                        </div>
                        <div class="user-info">
                            <h4>${cleanUsername || firstName}</h4>
                            <div class="user-status ${status}">
                                ${status === 'banned' ? 'BANNED' : 'ACTIVE MINER'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="user-stats-grid">
                        <div class="user-stat-item">
                            <i class="fas fa-bolt"></i>
                            <div class="user-stat-info">
                                <div class="user-stat-label">Power</div>
                                <div class="user-stat-value">${Math.floor(powerBalance)}</div>
                            </div>
                        </div>
                        <div class="user-stat-item">
                            <i class="fas fa-coins"></i>
                            <div class="user-stat-info">
                                <div class="user-stat-label">TON Balance</div>
                                <div class="user-stat-value">${tonBalance.toFixed(5)} TON</div>
                            </div>
                        </div>
                        <div class="user-stat-item">
                            <i class="fas fa-chart-line"></i>
                            <div class="user-stat-info">
                                <div class="user-stat-label">Mining Level</div>
                                <div class="user-stat-value">${level}</div>
                            </div>
                        </div>
                        <div class="user-stat-item">
                            <i class="fas fa-users"></i>
                            <div class="user-stat-info">
                                <div class="user-stat-label">Referrals</div>
                                <div class="user-stat-value">${totalReferrals}</div>
                            </div>
                        </div>
                        <div class="user-stat-item">
                            <i class="fas fa-user-check"></i>
                            <div class="user-stat-info">
                                <div class="user-stat-label">Verified Referrals</div>
                                <div class="user-stat-value">${verifiedReferrals}</div>
                            </div>
                        </div>
                        <div class="user-stat-item">
                            <i class="fas fa-bolt"></i>
                            <div class="user-stat-info">
                                <div class="user-stat-label">Referral Power</div>
                                <div class="user-stat-value">${Math.floor(referralPower)}</div>
                            </div>
                        </div>
                        <div class="user-stat-item">
                            <i class="fas fa-coins"></i>
                            <div class="user-stat-info">
                                <div class="user-stat-label">Referral TON</div>
                                <div class="user-stat-value">${referralTon.toFixed(5)} TON</div>
                            </div>
                        </div>
                        <div class="user-stat-item">
                            <i class="fas fa-microchip"></i>
                            <div class="user-stat-info">
                                <div class="user-stat-label">Mining Status</div>
                                <div class="user-stat-value">${miningActive ? '🟢 ACTIVE' : '⚫ IDLE'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="user-card-actions">
                        <div class="balance-buttons">
                            <button class="action-btn btn-success" onclick="admin.showAddBalanceModal('${user.id}', '${cleanUsername || firstName}')">
                                <i class="fas fa-plus"></i> Add TON
                            </button>
                            <button class="action-btn btn-danger" onclick="admin.showRemoveBalanceModal('${user.id}', '${cleanUsername || firstName}')">
                                <i class="fas fa-minus"></i> Remove TON
                            </button>
                            <button class="action-btn btn-warning" onclick="admin.showAddPowerModal('${user.id}', '${cleanUsername || firstName}')">
                                <i class="fas fa-plus"></i> Add Power
                            </button>
                            <button class="action-btn btn-danger" onclick="admin.showRemovePowerModal('${user.id}', '${cleanUsername || firstName}')">
                                <i class="fas fa-minus"></i> Remove Power
                            </button>
                        </div>
                        <div class="action-buttons">
                            <button class="action-btn btn-info" onclick="window.open('${telegramProfileUrl}', '_blank')">
                                <i class="fas fa-eye"></i> VIEW
                            </button>
                            ${status === 'active' ? 
                                `<button class="action-btn btn-danger" onclick="admin.banUser('${user.id}', this)">
                                    <i class="fas fa-ban"></i> BAN
                                </button>` : 
                                `<button class="action-btn btn-success" onclick="admin.unbanUser('${user.id}', this)">
                                    <i class="fas fa-check"></i> UNBAN
                                </button>`
                            }
                            <button class="action-btn btn-info" onclick="admin.getUserReferrals('${user.id}', '${cleanUsername || firstName}')">
                                <i class="fas fa-users"></i> Referrals
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    async getUserReferrals(userId, userName) {
        try {
            const referralsRef = await this.db.ref(`${this.dbPaths.referrals}/${userId}`).once('value');
            const referrals = [];
            
            if (referralsRef.exists()) {
                referralsRef.forEach(child => {
                    const referral = child.val();
                    referrals.push({
                        id: child.key,
                        userId: referral.userId,
                        username: referral.userName,
                        firstName: referral.userName,
                        state: referral.state,
                        joinedAt: referral.joinedAt,
                        verifiedAt: referral.verifiedAt
                    });
                });
            }
            
            referrals.sort((a, b) => (b.joinedAt || 0) - (a.joinedAt || 0));
            const recentReferrals = referrals.slice(0, 30);
            
            let message = `<b>👥 Referrals of ${userName}</b>\n\n`;
            
            if (recentReferrals.length === 0) {
                message += "No referrals found for this user.";
            } else {
                message += `📊 Total Referrals: ${referrals.length}\n📋 Last ${recentReferrals.length} Referrals:\n\n`;
                
                recentReferrals.forEach((ref, index) => {
                    const joinedDate = ref.joinedAt ? this.formatDateTime(ref.joinedAt) : 'N/A';
                    const verifiedDate = ref.verifiedAt ? this.formatDateTime(ref.verifiedAt) : 'Not verified';
                    message += `${index + 1}. <b>${ref.firstName || 'User'}</b>\n`;
                    message += `   🆔 ID: ${ref.userId || ref.id}\n`;
                    message += `   📊 Status: ${ref.state === 'Verified' ? '✅ Verified' : '⏳ Not Verified'}\n`;
                    message += `   📅 Joined: ${joinedDate}\n`;
                    if (ref.state === 'Verified') message += `   ✅ Verified: ${verifiedDate}\n`;
                    message += `\n`;
                });
            }
            
            await this.sendTelegramMessage(ADMIN_TELEGRAM_ID, message);
            this.showNotification("Success", "Referrals list sent to admin", "success");
            
        } catch (error) {
            console.error("Error getting referrals:", error);
            this.showNotification("Error", "Failed to get referrals", "error");
        }
    }

    showAddBalanceModal(userId, userName) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-plus-circle"></i> Add TON Balance</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Add TON balance to miner:</p>
                    <div class="user-info-modal">
                        <strong>${userName}</strong>
                    </div>
                    <div class="form-group">
                        <label>Amount (TON)</label>
                        <input type="number" id="addBalanceAmount" step="0.001" min="0.001" value="0.100">
                    </div>
                    <div class="form-group">
                        <label>Reason (Optional)</label>
                        <input type="text" id="addBalanceReason" placeholder="Admin added TON">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="action-btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="action-btn btn-success" onclick="admin.addBalance('${userId}')">
                        <i class="fas fa-check"></i> Add TON
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    async addBalance(userId) {
        const amount = parseFloat(document.getElementById('addBalanceAmount').value);
        const reason = document.getElementById('addBalanceReason').value.trim() || 'Admin added TON';

        if (!amount || amount <= 0) {
            this.showNotification("Error", "Please enter a valid amount", "error");
            return;
        }

        try {
            const userRef = this.db.ref(`${this.dbPaths.users}/${userId}`);
            const snapshot = await userRef.once('value');
            
            if (!snapshot.exists()) {
                this.showNotification("Error", "User not found", "error");
                return;
            }

            const user = snapshot.val();
            const currentBalance = this.safeNumber(user.tonBalance);
            const newBalance = currentBalance + amount;

            await userRef.update({
                tonBalance: newBalance
            });

            this.showNotification("Success", `Added ${amount.toFixed(5)} TON to miner`, "success");
            
            document.querySelector('.modal-overlay.show')?.remove();
            await this.searchUser();
            
        } catch (error) {
            console.error("Error adding balance:", error);
            this.showNotification("Error", "Failed to add balance", "error");
        }
    }

    showRemoveBalanceModal(userId, userName) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-minus-circle"></i> Remove TON Balance</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Remove TON balance from miner:</p>
                    <div class="user-info-modal">
                        <strong>${userName}</strong>
                    </div>
                    <div class="form-group">
                        <label>Amount to Remove (TON)</label>
                        <input type="number" id="removeBalanceAmount" step="0.001" min="0.001" value="0.100">
                    </div>
                    <div class="form-group">
                        <label>Reason (Optional)</label>
                        <input type="text" id="removeBalanceReason" placeholder="Admin removed TON">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="action-btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="action-btn btn-danger" onclick="admin.removeBalance('${userId}')">
                        <i class="fas fa-check"></i> Remove TON
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    async removeBalance(userId) {
        const amount = parseFloat(document.getElementById('removeBalanceAmount').value);
        const reason = document.getElementById('removeBalanceReason').value.trim() || 'Admin removed TON';

        if (!amount || amount <= 0) {
            this.showNotification("Error", "Please enter a valid amount", "error");
            return;
        }

        try {
            const userRef = this.db.ref(`${this.dbPaths.users}/${userId}`);
            const snapshot = await userRef.once('value');
            
            if (!snapshot.exists()) {
                this.showNotification("Error", "User not found", "error");
                return;
            }

            const user = snapshot.val();
            const currentBalance = this.safeNumber(user.tonBalance);
            
            if (currentBalance < amount) {
                this.showNotification("Error", "Insufficient balance", "error");
                return;
            }
            
            const newBalance = currentBalance - amount;

            await userRef.update({
                tonBalance: newBalance
            });

            this.showNotification("Success", `Removed ${amount.toFixed(5)} TON from miner`, "success");
            
            document.querySelector('.modal-overlay.show')?.remove();
            await this.searchUser();
            
        } catch (error) {
            console.error("Error removing balance:", error);
            this.showNotification("Error", "Failed to remove balance", "error");
        }
    }

    showAddPowerModal(userId, userName) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-bolt"></i> Add Power Points</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Add Power Points to miner:</p>
                    <div class="user-info-modal">
                        <strong>${userName}</strong>
                    </div>
                    <div class="form-group">
                        <label>Amount (Power)</label>
                        <input type="number" id="addPowerAmount" step="1" min="1" value="100">
                    </div>
                    <div class="form-group">
                        <label>Reason (Optional)</label>
                        <input type="text" id="addPowerReason" placeholder="Admin added Power">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="action-btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="action-btn btn-warning" onclick="admin.addPower('${userId}')">
                        <i class="fas fa-check"></i> Add Power
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    async addPower(userId) {
        const amount = parseInt(document.getElementById('addPowerAmount').value);
        const reason = document.getElementById('addPowerReason').value.trim() || 'Admin added Power';

        if (!amount || amount <= 0) {
            this.showNotification("Error", "Please enter a valid amount", "error");
            return;
        }

        try {
            const userRef = this.db.ref(`${this.dbPaths.users}/${userId}`);
            const snapshot = await userRef.once('value');
            
            if (!snapshot.exists()) {
                this.showNotification("Error", "User not found", "error");
                return;
            }

            const user = snapshot.val();
            const currentPower = this.safeNumber(user.powerBalance);
            const newPower = currentPower + amount;

            await userRef.update({
                powerBalance: newPower
            });

            this.showNotification("Success", `Added ${amount} Power to miner`, "success");
            
            document.querySelector('.modal-overlay.show')?.remove();
            await this.searchUser();
            
        } catch (error) {
            console.error("Error adding Power:", error);
            this.showNotification("Error", "Failed to add Power", "error");
        }
    }

    showRemovePowerModal(userId, userName) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-bolt"></i> Remove Power Points</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Remove Power Points from miner:</p>
                    <div class="user-info-modal">
                        <strong>${userName}</strong>
                    </div>
                    <div class="form-group">
                        <label>Amount to Remove (Power)</label>
                        <input type="number" id="removePowerAmount" step="1" min="1" value="50">
                    </div>
                    <div class="form-group">
                        <label>Reason (Optional)</label>
                        <input type="text" id="removePowerReason" placeholder="Admin removed Power">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="action-btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="action-btn btn-danger" onclick="admin.removePower('${userId}')">
                        <i class="fas fa-check"></i> Remove Power
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    async removePower(userId) {
        const amount = parseInt(document.getElementById('removePowerAmount').value);
        const reason = document.getElementById('removePowerReason').value.trim() || 'Admin removed Power';

        if (!amount || amount <= 0) {
            this.showNotification("Error", "Please enter a valid amount", "error");
            return;
        }

        try {
            const userRef = this.db.ref(`${this.dbPaths.users}/${userId}`);
            const snapshot = await userRef.once('value');
            
            if (!snapshot.exists()) {
                this.showNotification("Error", "User not found", "error");
                return;
            }

            const user = snapshot.val();
            const currentPower = this.safeNumber(user.powerBalance);
            
            if (currentPower < amount) {
                this.showNotification("Error", "Insufficient Power balance", "error");
                return;
            }
            
            const newPower = currentPower - amount;

            await userRef.update({
                powerBalance: newPower
            });

            this.showNotification("Success", `Removed ${amount} Power from miner`, "success");
            
            document.querySelector('.modal-overlay.show')?.remove();
            await this.searchUser();
            
        } catch (error) {
            console.error("Error removing Power:", error);
            this.showNotification("Error", "Failed to remove Power", "error");
        }
    }

    async banUser(userId, button) {
        if (!confirm('Are you sure you want to ban this user?')) return;

        try {
            await this.db.ref(`${this.dbPaths.users}/${userId}/status`).set('banned');
            this.showNotification("Success", "User has been banned", "success");
            
            if (button) {
                button.innerHTML = '<i class="fas fa-check"></i> UNBAN';
                button.className = 'action-btn btn-success';
                button.onclick = () => this.unbanUser(userId, button);
            }
            
        } catch (error) {
            console.error("Error banning user:", error);
            this.showNotification("Error", "Failed to ban user", "error");
        }
    }

    async unbanUser(userId, button) {
        if (!confirm('Are you sure you want to unban this user?')) return;

        try {
            await this.db.ref(`${this.dbPaths.users}/${userId}/status`).remove();
            this.showNotification("Success", "User has been unbanned", "success");
            
            if (button) {
                button.innerHTML = '<i class="fas fa-ban"></i> BAN';
                button.className = 'action-btn btn-danger';
                button.onclick = () => this.banUser(userId, button);
            }
            
        } catch (error) {
            console.error("Error unbanning user:", error);
            this.showNotification("Error", "Failed to unban user", "error");
        }
    }

    async renderTasks() {
        this.elements.contentArea.innerHTML = `
            <div class="tasks-page">
                <div class="page-header">
                    <h2><i class="fas fa-list-check"></i> Tasks Management</h2>
                    <p>Create and manage mining tasks</p>
                </div>
                
                <div class="search-section">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="searchTaskInput" placeholder="Search task by name">
                        <button class="search-btn" onclick="admin.searchTask()">
                            <i class="fas fa-search"></i> Search
                        </button>
                    </div>
                    <button class="action-btn btn-secondary" onclick="admin.clearTaskSearch()">
                        <i class="fas fa-times"></i> Clear
                    </button>
                </div>
                
                <div class="tasks-management">
                    <div class="create-task-section">
                        <div class="card">
                            <h3><i class="fas fa-plus-circle"></i> Create New Task</h3>
                            
                            <div class="form-group">
                                <label>Task Name *</label>
                                <input type="text" id="taskName" placeholder="Join our channel" maxlength="30">
                            </div>
                            
                            <div class="form-group">
                                <label>Task Link (URL) *</label>
                                <input type="text" id="taskLink" placeholder="https://t.me/... or @username">
                            </div>
                            
                            <div class="form-group">
                                <label>Task Image URL</label>
                                <input type="text" id="taskImage" placeholder="https://example.com/image.jpg">
                            </div>
                            
                            <div class="form-group">
                                <label>Task Category *</label>
                                <div class="type-selector">
                                    <button class="type-btn active" data-type="main">
                                        <i class="fas fa-star"></i> Main
                                    </button>
                                    <button class="type-btn" data-type="partner">
                                        <i class="fas fa-handshake"></i> Partner
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Task Reward (Power) *</label>
                                <input type="number" id="taskReward" step="1" min="1" value="50">
                            </div>
                            
                            <div class="form-group">
                                <label>Verification Required</label>
                                <select id="taskVerification">
                                    <option value="false">No verification</option>
                                    <option value="true">Yes (bot must be admin)</option>
                                </select>
                            </div>
                            
                            <button class="action-btn btn-success" onclick="admin.createTask()">
                                <i class="fas fa-plus-circle"></i> Create Task
                            </button>
                        </div>
                    </div>
                    
                    <div class="tasks-list-section">
                        <div class="card">
                            <div class="section-header">
                                <h3><i class="fas fa-list"></i> Active Tasks</h3>
                                <button class="action-btn btn-secondary" onclick="admin.loadTasks()">
                                    <i class="fas fa-sync-alt"></i> Refresh
                                </button>
                            </div>
                            
                            <div class="task-tabs">
                                <button class="task-tab active" data-tab="main">Main</button>
                                <button class="task-tab" data-tab="partner">Partner</button>
                            </div>
                            
                            <div id="tasksList" class="tasks-list">
                                <div class="loading">
                                    <div class="spinner"></div>
                                    <p>Loading tasks...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupTaskTypeButtons();
        this.setupTaskTabs();
        await this.loadTasks();
    }

    setupTaskTypeButtons() {
        const buttons = document.querySelectorAll('.type-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    setupTaskTabs() {
        const tabs = document.querySelectorAll('.task-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTaskTab = tab.dataset.tab;
                this.loadTasks();
            });
        });
    }

    async searchTask() {
        const searchTerm = document.getElementById('searchTaskInput').value.trim().toLowerCase();
        
        if (!searchTerm) {
            await this.loadTasks();
            return;
        }
        
        try {
            const tasksSnap = await this.db.ref(this.dbPaths.tasks).once('value');
            let tasks = [];
            
            if (tasksSnap.exists()) {
                tasksSnap.forEach(child => {
                    const task = child.val();
                    if (task.name && task.name.toLowerCase().includes(searchTerm)) {
                        tasks.push({
                            id: child.key,
                            ...task
                        });
                    }
                });
            }
            
            tasks = tasks.filter(t => t.category === this.currentTaskTab);
            this.displayTasks(tasks);
            
        } catch (error) {
            console.error("Error searching tasks:", error);
            this.showNotification("Error", "Failed to search tasks", "error");
        }
    }

    clearTaskSearch() {
        document.getElementById('searchTaskInput').value = '';
        this.loadTasks();
    }

    async loadTasks() {
        try {
            const tasksSnap = await this.db.ref(this.dbPaths.tasks).once('value');
            let tasks = [];
            
            if (tasksSnap.exists()) {
                tasksSnap.forEach(child => {
                    const task = child.val();
                    if (task.category === this.currentTaskTab) {
                        tasks.push({
                            id: child.key,
                            ...task
                        });
                    }
                });
            }
            
            this.displayTasks(tasks);
            
        } catch (error) {
            console.error("Error loading tasks:", error);
            document.getElementById('tasksList').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load tasks</p>
                </div>
            `;
        }
    }

    displayTasks(tasks) {
        const container = document.getElementById('tasksList');
        
        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list-check"></i>
                    <p>No active tasks</p>
                    <p>Create your first task above</p>
                </div>
            `;
            return;
        }
        
        tasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        let html = '';
        
        tasks.forEach(task => {
            const typeClass = task.category === 'main' ? 'badge-main' : 'badge-partner';
            const typeText = task.category === 'main' ? 'Main' : 'Partner';
            const imageUrl = task.img || DEFAULT_IMAGE_URL;
            const reward = this.safeNumber(task.reward || 50);
            const total = task.total || 0;
            const verify = task.verify ? '🔒 Verified' : '🔓';
            
            html += `
                <div class="task-item">
                    <div class="task-card">
                        <div class="task-card-image">
                            <img src="${imageUrl}" alt="${task.name}" onerror="this.src='${DEFAULT_IMAGE_URL}'">
                        </div>
                        <div class="task-card-content">
                            <div class="task-card-header">
                                <div class="task-title">
                                    <h4>${task.name} ${verify}</h4>
                                    <div class="task-badges">
                                        <span class="task-badge ${typeClass}">${typeText}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="task-stats">
                                <div class="task-stat">
                                    <i class="fas fa-bolt"></i>
                                    <div class="task-stat-info">
                                        <div class="task-stat-label">Power Reward</div>
                                        <div class="task-stat-value">${reward} Power</div>
                                    </div>
                                </div>
                                <div class="task-stat">
                                    <i class="fas fa-users"></i>
                                    <div class="task-stat-info">
                                        <div class="task-stat-label">Completions</div>
                                        <div class="task-stat-value">${total}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="task-url">
                                <i class="fas fa-external-link-alt"></i>
                                <a href="${task.url}" target="_blank">${task.url}</a>
                                <button class="btn-copy" onclick="admin.copyToClipboard('${task.url}')" title="Copy link">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            
                            <div class="task-actions">
                                <button class="action-btn btn-danger" onclick="admin.deleteTask('${task.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    async createTask() {
        const name = document.getElementById('taskName').value.trim();
        const image = document.getElementById('taskImage').value.trim();
        const link = document.getElementById('taskLink').value.trim();
        const reward = parseInt(document.getElementById('taskReward').value) || 50;
        const typeBtn = document.querySelector('.type-btn.active');
        const category = typeBtn ? typeBtn.dataset.type : 'main';
        const verification = document.getElementById('taskVerification').value === 'true';
        
        if (!name || !link) {
            this.showNotification("Error", "Please fill all required fields", "error");
            return;
        }
        
        if (reward <= 0) {
            this.showNotification("Error", "Reward must be positive", "error");
            return;
        }
        
        try {
            let formattedLink = link.trim();
            if (!formattedLink.startsWith('http') && !formattedLink.startsWith('@')) {
                formattedLink = 'https://t.me/' + formattedLink;
            } else if (formattedLink.startsWith('@')) {
                formattedLink = 'https://t.me/' + formattedLink.substring(1);
            }
            
            const taskId = Date.now().toString();
            const taskData = {
                id: taskId,
                name: name,
                url: formattedLink,
                category: category,
                reward: reward,
                verify: verification,
                total: 0,
                createdAt: Date.now()
            };
            
            if (image) {
                taskData.img = image;
            } else {
                taskData.img = DEFAULT_IMAGE_URL;
            }
            
            await this.db.ref(`${this.dbPaths.tasks}/${taskId}`).set(taskData);
            
            document.getElementById('taskName').value = '';
            document.getElementById('taskImage').value = '';
            document.getElementById('taskLink').value = '';
            document.getElementById('taskReward').value = '50';
            
            this.showNotification("Success", "Task created successfully!", "success");
            await this.loadTasks();
            
        } catch (error) {
            console.error("Error creating task:", error);
            this.showNotification("Error", "Failed to create task", "error");
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;
        
        try {
            await this.db.ref(`${this.dbPaths.tasks}/${taskId}`).remove();
            
            this.showNotification("Success", "Task deleted", "success");
            await this.loadTasks();
            
        } catch (error) {
            console.error("Error deleting task:", error);
            this.showNotification("Error", "Failed to delete task", "error");
        }
    }

    async renderPromoCodes() {
        this.elements.contentArea.innerHTML = `
            <div class="promo-page">
                <div class="page-header">
                    <h2><i class="fas fa-ticket"></i> Promo Codes</h2>
                    <p>Create and manage promo codes for miners</p>
                </div>
                
                <div class="promo-management">
                    <div class="create-promo-section">
                        <div class="card">
                            <h3><i class="fas fa-plus-circle"></i> Create New Promo</h3>
                            
                            <div class="form-group">
                                <label>Promo Code *</label>
                                <div class="code-input-group">
                                    <input type="text" id="promoCode" placeholder="Enter code or click Random" style="text-transform: uppercase;">
                                    <button class="action-btn btn-secondary" onclick="admin.generateRandomCode()">
                                        <i class="fas fa-random"></i> Random
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Reward Type</label>
                                <div class="reward-type-selector">
                                    <button class="reward-type-btn active" data-type="power">
                                        <i class="fas fa-bolt"></i> Power
                                    </button>
                                    <button class="reward-type-btn" data-type="ton">
                                        <i class="fas fa-coins"></i> TON
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Reward Amount *</label>
                                <input type="number" id="promoReward" step="1" min="1" placeholder="Enter amount...">
                            </div>
                            
                            <div class="form-group">
                                <label>Max Uses (0 = unlimited)</label>
                                <input type="number" id="promoMaxUses" value="0" min="0">
                            </div>
                            
                            <button class="action-btn btn-success" onclick="admin.createPromoCode()">
                                <i class="fas fa-plus-circle"></i> Create Promo
                            </button>
                        </div>
                    </div>
                    
                    <div class="promo-list-section">
                        <div class="card">
                            <div class="section-header">
                                <h3><i class="fas fa-list"></i> Active Promo Codes</h3>
                                <button class="action-btn btn-secondary" onclick="admin.loadPromoCodes()">
                                    <i class="fas fa-sync-alt"></i> Refresh
                                </button>
                            </div>
                            
                            <div id="promoCodesList" class="promo-codes-list">
                                <div class="loading">
                                    <div class="spinner"></div>
                                    <p>Loading promo codes...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupRewardTypeButtons();
        await this.loadPromoCodes();
    }

    setupRewardTypeButtons() {
        const buttons = document.querySelectorAll('.reward-type-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    generateRandomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        document.getElementById('promoCode').value = code;
    }

    async loadPromoCodes() {
        try {
            const promoCodesSnap = await this.db.ref(this.dbPaths.promoCodes).once('value');
            const promoCodes = [];
            
            if (promoCodesSnap.exists()) {
                promoCodesSnap.forEach(child => {
                    const promo = child.val();
                    promoCodes.push({
                        id: child.key,
                        code: child.key,
                        ...promo
                    });
                });
            }
            
            this.displayPromoCodes(promoCodes);
            
        } catch (error) {
            console.error("Error loading promo codes:", error);
            document.getElementById('promoCodesList').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load promo codes</p>
                </div>
            `;
        }
    }

    displayPromoCodes(promoCodes) {
        const container = document.getElementById('promoCodesList');
        
        if (promoCodes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ticket"></i>
                    <p>No promo codes created</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        promoCodes.forEach(promo => {
            const used = promo.total || 0;
            const max = promo.maxUses || 0;
            const remaining = max > 0 ? max - used : '∞';
            const isFullyUsed = max > 0 && used >= max;
            const rewardType = promo.rewardType || 'power';
            const rewardSymbol = rewardType === 'ton' ? 'TON' : 'Power';
            const rewardValue = promo.reward || 0;
            
            let status = 'active';
            let statusClass = 'status-active';
            
            if (isFullyUsed) {
                status = 'used up';
                statusClass = 'status-expired';
            }
            
            html += `
                <div class="promo-code-item">
                    <div class="promo-header">
                        <div>
                            <h4><i class="fas fa-ticket"></i> ${promo.code}</h4>
                            <div class="promo-meta">
                                <span class="promo-status ${statusClass}">${status.toUpperCase()}</span>
                                <span class="promo-reward">
                                    <i class="fas fa-gem"></i> ${rewardValue} ${rewardSymbol}
                                </span>
                            </div>
                        </div>
                        <div class="promo-actions">
                            <button class="action-btn btn-primary" onclick="admin.copyPromoCode('${promo.code}')">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                            <button class="action-btn btn-danger" onclick="admin.deletePromoCodePermanently('${promo.code}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                    
                    <div class="promo-details">
                        <div class="detail">
                            <span>Used:</span>
                            <span>${used} / ${max > 0 ? max : '∞'}</span>
                        </div>
                        <div class="detail">
                            <span>Remaining:</span>
                            <span>${remaining}</span>
                        </div>
                        <div class="detail">
                            <span>Created:</span>
                            <span>${promo.createdAt ? this.formatDateTime(promo.createdAt) : 'N/A'}</span>
                        </div>
                    </div>
                    
                    ${max > 0 ? `
                        <div class="promo-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min((used / max) * 100, 100)}%"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    async createPromoCode() {
        const code = document.getElementById('promoCode').value.trim().toUpperCase();
        const rewardTypeBtn = document.querySelector('.reward-type-btn.active');
        const rewardType = rewardTypeBtn ? rewardTypeBtn.dataset.type : 'power';
        const reward = parseFloat(document.getElementById('promoReward').value);
        const maxUses = parseInt(document.getElementById('promoMaxUses').value) || 0;
        
        if (!code) {
            this.showNotification("Error", "Please enter promo code", "error");
            return;
        }
        
        if (!reward || reward <= 0) {
            this.showNotification("Error", "Please enter a valid reward amount", "error");
            return;
        }
        
        try {
            const existingSnap = await this.db.ref(`${this.dbPaths.promoCodes}/${code}`).once('value');
            if (existingSnap.exists()) {
                this.showNotification("Error", "Promo code already exists", "error");
                return;
            }
            
            const promoData = {
                code: code,
                rewardType: rewardType,
                reward: reward,
                maxUses: maxUses,
                total: 0,
                createdAt: Date.now()
            };
            
            await this.db.ref(`${this.dbPaths.promoCodes}/${code}`).set(promoData);
            
            document.getElementById('promoCode').value = '';
            document.getElementById('promoReward').value = '';
            document.getElementById('promoMaxUses').value = '0';
            
            this.showNotification("Success", "Promo code created!", "success");
            await this.loadPromoCodes();
            
        } catch (error) {
            console.error("Error creating promo code:", error);
            this.showNotification("Error", "Failed to create promo code", "error");
        }
    }

    copyPromoCode(code) {
        navigator.clipboard.writeText(code).then(() => {
            this.showNotification("Copied", `Promo code "${code}" copied`, "success");
        }).catch(err => {
            this.showNotification("Error", "Failed to copy", "error");
        });
    }

    async deletePromoCodePermanently(promoCode) {
        if (!confirm('Are you sure you want to permanently delete this promo code?')) return;
        
        try {
            await this.db.ref(`${this.dbPaths.promoCodes}/${promoCode}`).remove();
            
            this.showNotification("Success", "Promo code permanently deleted", "success");
            await this.loadPromoCodes();
            
        } catch (error) {
            console.error("Error deleting promo code:", error);
            this.showNotification("Error", "Failed to delete promo code", "error");
        }
    }

    async renderWithdrawals() {
        this.elements.contentArea.innerHTML = `
            <div class="withdrawals-page">
                <div class="page-header">
                    <h2><i class="fas fa-money-bill-wave"></i> Withdrawals Management</h2>
                    <p>Process miner withdrawal requests</p>
                </div>
                
                <div class="search-section">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="searchWithdrawalUser" placeholder="Search by User ID">
                        <button class="search-btn" onclick="admin.searchUserWithdrawals()">
                            <i class="fas fa-search"></i> Search User
                        </button>
                    </div>
                    <button class="action-btn btn-secondary" onclick="admin.clearWithdrawalSearch()">
                        <i class="fas fa-times"></i> Clear
                    </button>
                </div>
                
                <div class="withdrawals-stats">
                    <div class="mini-stat-card">
                        <i class="fas fa-clock"></i>
                        <div>
                            <h4>Pending</h4>
                            <p id="pendingCount">0</p>
                        </div>
                    </div>
                    <div class="mini-stat-card">
                        <i class="fas fa-check-circle"></i>
                        <div>
                            <h4>Completed</h4>
                            <p id="completedCount">0</p>
                        </div>
                    </div>
                    <div class="mini-stat-card">
                        <i class="fas fa-times-circle"></i>
                        <div>
                            <h4>Rejected</h4>
                            <p id="rejectedCount">0</p>
                        </div>
                    </div>
                    <div class="mini-stat-card">
                        <i class="fas fa-calendar-day"></i>
                        <div>
                            <h4>Today</h4>
                            <p id="todayCount">0</p>
                        </div>
                    </div>
                </div>
                
                <div class="withdrawals-management">
                    <div class="card">
                        <div class="section-header">
                            <h3><i class="fas fa-clock"></i> Pending Withdrawals</h3>
                            <button class="action-btn btn-secondary" onclick="admin.loadWithdrawals()">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                        
                        <div id="withdrawalsList" class="withdrawals-list">
                            <div class="loading">
                                <div class="spinner"></div>
                                <p>Loading withdrawals...</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="userWithdrawalsResults" class="user-withdrawals-section" style="display: none;"></div>
            </div>
        `;
        
        await this.loadWithdrawals();
    }

    async searchUserWithdrawals() {
        const userId = document.getElementById('searchWithdrawalUser').value.trim();
        
        if (!userId) {
            this.showNotification("Info", "Please enter User ID", "info");
            return;
        }
        
        try {
            const userSnap = await this.db.ref(`${this.dbPaths.users}/${userId}`).once('value');
            if (!userSnap.exists()) {
                this.showNotification("Error", "User not found", "error");
                return;
            }
            
            const userData = userSnap.val();
            const withdrawalsRef = await this.db.ref(`${this.dbPaths.withdrawals}/${userId}`).once('value');
            
            let allWithdrawals = [];
            
            if (withdrawalsRef.exists()) {
                withdrawalsRef.forEach(child => {
                    const withdrawal = child.val();
                    allWithdrawals.push({
                        id: child.key,
                        ...withdrawal
                    });
                });
            }
            
            this.displayUserWithdrawals(allWithdrawals, userData.firstName || userData.username || userId, userId, userData.photoUrl);
            
            document.getElementById('userWithdrawalsResults').style.display = 'block';
            
        } catch (error) {
            console.error("Error searching user withdrawals:", error);
            this.showNotification("Error", "Search failed", "error");
        }
    }

    displayUserWithdrawals(withdrawals, userName, userId, photoUrl) {
        withdrawals.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        let html = `
            <div class="card">
                <div class="section-header">
                    <h3>Withdrawals for ${userName}</h3>
                    <button class="action-btn btn-secondary" onclick="document.getElementById('userWithdrawalsResults').style.display = 'none'">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
                <div class="user-withdrawals-list">
        `;
        
        withdrawals.forEach(w => {
            const date = w.timestamp ? this.formatDateTime(w.timestamp) : 'N/A';
            const processedDate = w.processedAt ? this.formatDateTime(w.processedAt) : 'N/A';
            const walletAddress = w.wallet || '';
            const walletDisplay = walletAddress.length > 10 ? 
                `${walletAddress.substring(0, 5)}...${walletAddress.substring(walletAddress.length - 5)}` : 
                walletAddress;
            
            let statusClass = '';
            let statusText = '';
            
            switch(w.status) {
                case 'pending':
                    statusClass = 'status-active';
                    statusText = 'PENDING';
                    break;
                case 'completed':
                    statusClass = 'status-completed';
                    statusText = 'COMPLETED';
                    break;
                case 'rejected':
                    statusClass = 'status-expired';
                    statusText = 'REJECTED';
                    break;
            }
            
            html += `
                <div class="withdrawal-item">
                    <div class="withdrawal-header">
                        <div class="user-info">
                            <div class="user-avatar">
                                <img src="${photoUrl || DEFAULT_IMAGE_URL}" alt="${userName}" onerror="this.src='${DEFAULT_IMAGE_URL}'">
                            </div>
                            <div>
                                <h4>${userName}</h4>
                                <p class="user-details">ID: ${userId}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="withdrawal-status ${statusClass}">${statusText}</div>
                    
                    <div class="withdrawal-details">
                        <div class="detail">
                            <span><i class="fas fa-calendar"></i> Date:</span>
                            <span>${date}</span>
                        </div>
                        <div class="detail">
                            <span><i class="fas fa-wallet"></i> Wallet:</span>
                            <span class="copyable-wallet" onclick="admin.copyToClipboard('${walletAddress}')">${walletDisplay}</span>
                        </div>
                        <div class="detail">
                            <span><i class="fas fa-coins"></i> Amount:</span>
                            <span class="copyable-amount" onclick="admin.copyToClipboard('${w.amount ? w.amount.toFixed(5) : '0.00000'} TON')">
                                ${w.amount ? w.amount.toFixed(5) : '0.00000'} TON
                            </span>
                        </div>
                        ${w.status !== 'pending' ? `
                            <div class="detail">
                                <span><i class="fas fa-calendar-check"></i> Processed:</span>
                                <span>${processedDate}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${w.status === 'pending' ? `
                        <div class="withdrawal-actions">
                            <button class="action-btn btn-success" onclick="admin.showApproveModal('${w.id}', ${w.amount}, '${w.wallet}', '${userId}', '${userName}')">
                                <i class="fas fa-check"></i> Confirm
                            </button>
                            <button class="action-btn btn-danger" onclick="admin.rejectWithdrawal('${userId}', '${w.id}')">
                                <i class="fas fa-times"></i> Reject
                            </button>
                            <button class="action-btn btn-primary" onclick="admin.directPay('${w.wallet}', ${w.amount})">
                                <i class="fas fa-arrow-right"></i> Direct PAY
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        html += `</div></div>`;
        document.getElementById('userWithdrawalsResults').innerHTML = html;
    }

    viewWallet(walletAddress) {
        if (walletAddress) {
            window.open(`https://tonviewer.com/${walletAddress}`, '_blank');
        }
    }

    directPay(walletAddress, amount) {
        const nanoAmount = Math.floor(amount * 1000000000);
        const payUrl = `https://app.tonkeeper.com/transfer/${walletAddress}?amount=${nanoAmount}`;
        window.open(payUrl, '_blank');
    }

    clearWithdrawalSearch() {
        document.getElementById('searchWithdrawalUser').value = '';
        document.getElementById('userWithdrawalsResults').style.display = 'none';
    }

    async loadWithdrawals() {
      try {
    const withdrawalsSnap = await this.db.ref(this.dbPaths.withdrawals).once('value');
    let pendingCount = 0;
    let completedCount = 0;
    let rejectedCount = 0;
    let todayCount = 0;
    const today = new Date().setHours(0, 0, 0, 0);
    const pendingWithdrawals = [];
    
    if (withdrawalsSnap.exists()) {
        withdrawalsSnap.forEach(userWithdrawals => {
            const userId = userWithdrawals.key;
            userWithdrawals.forEach(child => {
                const withdrawal = child.val();
                if (withdrawal.status === 'pending') {
                    pendingCount++;
                    pendingWithdrawals.push({
                        id: child.key,
                        userId: userId,
                        ...withdrawal
                    });
                } else if (withdrawal.status === 'completed') {
                    completedCount++;
                    if (withdrawal.timestamp && withdrawal.timestamp >= today) {
                        todayCount++;
                    }
                } else if (withdrawal.status === 'rejected') {
                    rejectedCount++;
                }
            });
        });
    }
    
    document.getElementById('pendingCount').textContent = pendingCount;
    document.getElementById('completedCount').textContent = completedCount;
    document.getElementById('rejectedCount').textContent = rejectedCount;
    document.getElementById('todayCount').textContent = todayCount;
    
    await this.displayPendingWithdrawals(pendingWithdrawals);
    
} catch (error) {
    console.error("Error loading withdrawals:", error);
    document.getElementById('withdrawalsList').innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Failed to load withdrawals</p>
        </div>
    `;
            }  
    }

    async displayPendingWithdrawals(pendingWithdrawals) {
        const container = document.getElementById('withdrawalsList');
        
        if (pendingWithdrawals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-wallet"></i>
                    <p>No pending withdrawals</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        for (const withdrawal of pendingWithdrawals) {
            const userSnap = await this.db.ref(`${this.dbPaths.users}/${withdrawal.userId}`).once('value');
            const userData = userSnap.val() || {};
            const date = withdrawal.timestamp ? this.formatDateTime(withdrawal.timestamp) : 'N/A';
            const walletAddress = withdrawal.wallet || '';
            const walletDisplay = walletAddress.length > 10 ? 
                `${walletAddress.substring(0, 5)}...${walletAddress.substring(walletAddress.length - 5)}` : 
                walletAddress;
            const username = userData.username || '';
            const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
            const photoUrl = userData.photoUrl || DEFAULT_IMAGE_URL;
            
            html += `
                <div class="withdrawal-item">
                    <div class="withdrawal-header">
                        <div class="user-info">
                            <div class="user-avatar">
                                <img src="${photoUrl}" alt="${cleanUsername || 'User'}" onerror="this.src='${DEFAULT_IMAGE_URL}'">
                            </div>
                            <div>
                                <h4>${cleanUsername || userData.firstName || 'Unknown User'}</h4>
                                <p class="user-details">ID: ${withdrawal.userId}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="withdrawal-details">
                        <div class="detail">
                            <span><i class="fas fa-calendar"></i> Date:</span>
                            <span>${date}</span>
                        </div>
                        <div class="detail">
                            <span><i class="fas fa-wallet"></i> Wallet:</span>
                            <span class="copyable-wallet" onclick="admin.copyToClipboard('${walletAddress}')">${walletDisplay}</span>
                        </div>
                        <div class="detail">
                            <span><i class="fas fa-coins"></i> Amount:</span>
                            <span class="copyable-amount" onclick="admin.copyToClipboard('${withdrawal.amount ? withdrawal.amount.toFixed(5) : '0.00000'} TON')">
                                ${withdrawal.amount ? withdrawal.amount.toFixed(5) : '0.00000'} TON
                            </span>
                        </div>
                    </div>
                    
                    <div class="withdrawal-actions">
                        <button class="action-btn btn-info" onclick="admin.getUserReferrals('${withdrawal.userId}', '${cleanUsername || ''}')">
                            <i class="fas fa-users"></i> Referrals
                        </button>
                        <button class="action-btn btn-info" onclick="admin.viewWallet('${walletAddress}')">
                            <i class="fas fa-wallet"></i> View Wallet
                        </button>
                        <button class="action-btn btn-success" onclick="admin.showApproveModal('${withdrawal.id}', ${withdrawal.amount}, '${walletAddress}', '${withdrawal.userId}', '${cleanUsername || ''}')">
                            <i class="fas fa-check"></i> Confirm
                        </button>
                        <button class="action-btn btn-danger" onclick="admin.rejectWithdrawal('${withdrawal.userId}', '${withdrawal.id}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                        <button class="action-btn btn-primary" onclick="admin.directPay('${walletAddress}', ${withdrawal.amount})">
                            <i class="fas fa-arrow-right"></i> Direct PAY
                        </button>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }

    showApproveModal(requestId, amount, wallet, userId, userName) {
        const nanoAmount = Math.floor(amount * 1000000000);
        const directPayUrl = `https://app.tonkeeper.com/transfer/${wallet}?amount=${nanoAmount}`;
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-check-circle"></i> Approve Withdrawal</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Approve withdrawal for:</p>
                    <div class="user-info-modal">
                        <strong>${userName}</strong>
                    </div>
                    
                    <div class="withdrawal-summary">
                        <div class="summary-item">
                            <span>Amount:</span>
                            <div class="summary-value-group">
                                <span class="amount-value">${amount.toFixed(5)} TON</span>
                                <button class="btn-copy" onclick="admin.copyToClipboard('${amount.toFixed(5)} TON')">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Transaction Hash *</label>
                        <div class="transaction-input-group">
                            <span class="transaction-prefix">https://tonviewer.com/transaction/</span>
                            <input type="text" id="transactionHash" placeholder="Enter transaction hash">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <a href="${directPayUrl}" target="_blank" class="action-btn btn-primary" style="text-decoration: none;">
                        <i class="fas fa-arrow-right"></i> Direct PAY
                    </a>
                    <button class="action-btn btn-success" onclick="admin.approveWithdrawal('${userId}', '${requestId}', ${amount})">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="action-btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    async approveWithdrawal(userId, withdrawalId, amount) {
        const transactionHash = document.getElementById('transactionHash')?.value.trim();
        
        if (!transactionHash) {
            this.showNotification("Error", "Please enter transaction hash", "error");
            return;
        }
        
        try {
            const withdrawalRef = this.db.ref(`${this.dbPaths.withdrawals}/${userId}/${withdrawalId}`);
            const snapshot = await withdrawalRef.once('value');
            const withdrawal = snapshot.val();
            
            if (!withdrawal) {
                this.showNotification("Error", "Withdrawal not found", "error");
                return;
            }
            
            await withdrawalRef.update({
                status: 'completed',
                processedAt: Date.now(),
                transactionHash: transactionHash
            });
            
            // Update global stats
            const statusRef = this.db.ref(this.dbPaths.status);
            const statusSnap = await statusRef.once('value');
            const currentStatus = statusSnap.val() || {};
            await statusRef.update({
                totalWithdrawals: (currentStatus.totalWithdrawals || 0) + 1,
                totalTonPaid: (currentStatus.totalTonPaid || 0) + amount
            });
            
            this.showNotification("Success", "Withdrawal approved!", "success");
            
            document.querySelector('.modal-overlay.show')?.remove();
            await this.loadWithdrawals();
            
        } catch (error) {
            console.error("Error approving withdrawal:", error);
            this.showNotification("Error", "Failed to approve withdrawal", "error");
        }
    }

    async rejectWithdrawal(userId, withdrawalId) {
        if (!confirm('Are you sure you want to reject this withdrawal?')) return;
        
        try {
            const withdrawalRef = this.db.ref(`${this.dbPaths.withdrawals}/${userId}/${withdrawalId}`);
            const snapshot = await withdrawalRef.once('value');
            const withdrawal = snapshot.val();
            
            if (!withdrawal) {
                this.showNotification("Error", "Withdrawal not found", "error");
                return;
            }
            
            // Return the amount to user's balance
            const userRef = this.db.ref(`${this.dbPaths.users}/${userId}`);
            const userSnap = await userRef.once('value');
            const user = userSnap.val();
            
            await userRef.update({
                tonBalance: this.safeNumber(user.tonBalance) + withdrawal.amount
            });
            
            await withdrawalRef.update({
                status: 'rejected',
                processedAt: Date.now(),
                rejectReason: 'Rejected by admin'
            });
            
            this.showNotification("Success", "Withdrawal rejected and funds returned", "success");
            await this.loadWithdrawals();
            
        } catch (error) {
            console.error("Error rejecting withdrawal:", error);
            this.showNotification("Error", "Failed to reject withdrawal", "error");
        }
    }

    formatDateTime(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification("Copied", "Copied to clipboard", "success");
        }).catch(err => {
            this.showNotification("Error", "Failed to copy", "error");
        });
    }

    async renderBroadcast() {
        this.elements.contentArea.innerHTML = `
            <div class="broadcast-page">
                <div class="page-header">
                    <h2><i class="fas fa-bullhorn"></i> Broadcast Messages</h2>
                    <p>Send messages to all miners or specific users</p>
                </div>
                
                <div class="broadcast-management">
                    <div class="card">
                        <h3><i class="fas fa-edit"></i> Create Broadcast</h3>
                        
                        <div class="form-group">
                            <label>Recipients</label>
                            <select id="broadcastType" onchange="admin.toggleBroadcastTarget()">
                                <option value="all">All Users</option>
                                <option value="specific">Specific User</option>
                            </select>
                        </div>
                        
                        <div id="specificUserField" class="form-group" style="display: none;">
                            <label>User ID</label>
                            <input type="text" id="broadcastUserId" placeholder="Telegram User ID">
                        </div>
                        
                        <div class="form-group">
                            <label>Message *</label>
                            <textarea id="broadcastMessage" rows="5" placeholder="Enter your message here..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Image (Optional)</label>
                            <input type="text" id="broadcastImage" placeholder="https://example.com/image.jpg">
                        </div>
                        
                        <div class="html-tools">
                            <button class="html-btn" onclick="admin.insertHtmlTag('b')"><b>Bold</b></button>
                            <button class="html-btn" onclick="admin.insertHtmlTag('i')"><i>Italic</i></button>
                            <button class="html-btn" onclick="admin.insertLink()">🔗 Link</button>
                        </div>
                        
                        <div class="inline-buttons-section">
                            <h4><i class="fas fa-th-large"></i> Inline Buttons</h4>
                            <div id="inlineButtonsContainer">
                                <div class="button-row">
                                    <input type="text" class="button-text" placeholder="Button text" maxlength="30">
                                    <input type="text" class="button-url" placeholder="URL">
                                    <button class="btn-sm btn-danger" onclick="this.parentElement.remove(); admin.updatePreview()">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                            <button class="action-btn btn-secondary" onclick="admin.addInlineButton()">
                                <i class="fas fa-plus"></i> Add Button
                            </button>
                        </div>
                        
                        <div class="broadcast-preview">
                            <h4>Preview</h4>
                            <div id="broadcastPreview" class="preview-content">
                                <div class="preview-placeholder">
                                    <i class="fas fa-comment-alt"></i>
                                    <p>Message preview will appear here</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="broadcast-actions">
                            <button class="action-btn btn-secondary" onclick="admin.updatePreview()">
                                <i class="fas fa-eye"></i> Update Preview
                            </button>
                            <button class="action-btn btn-success" onclick="admin.sendBroadcast()">
                                <i class="fas fa-paper-plane"></i> Send Broadcast
                            </button>
                        </div>
                        
                        <div id="broadcastProgress" class="broadcast-progress" style="display: none;">
                            <div class="progress-container">
                                <div class="progress-bar-fill" id="broadcastProgressFill" style="width: 0%;"></div>
                            </div>
                            <div class="progress-stats">
                                <span id="broadcastSent">0</span> / <span id="broadcastTotal">0</span>
                                <span id="broadcastFailed" style="color: var(--danger);">Failed: 0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.updatePreview();
    }

    toggleBroadcastTarget() {
        const type = document.getElementById('broadcastType').value;
        const field = document.getElementById('specificUserField');
        field.style.display = type === 'specific' ? 'block' : 'none';
    }

    addInlineButton() {
        const container = document.getElementById('inlineButtonsContainer');
        const rows = container.querySelectorAll('.button-row');
        
        if (rows.length >= 5) {
            this.showNotification("Warning", "Maximum 5 buttons allowed", "warning");
            return;
        }
        
        const buttonRow = document.createElement('div');
        buttonRow.className = 'button-row';
        buttonRow.innerHTML = `
            <input type="text" class="button-text" placeholder="Button text" maxlength="30">
            <input type="text" class="button-url" placeholder="URL">
            <button class="btn-sm btn-danger" onclick="this.parentElement.remove(); admin.updatePreview()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        buttonRow.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => this.updatePreview());
        });
        
        container.appendChild(buttonRow);
        this.updatePreview();
    }

    insertHtmlTag(tag) {
        const textarea = document.getElementById('broadcastMessage');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);
        
        let startTag = '', endTag = '';
        switch(tag) {
            case 'b': startTag = '<b>'; endTag = '</b>'; break;
            case 'i': startTag = '<i>'; endTag = '</i>'; break;
        }
        
        textarea.value = textarea.value.substring(0, start) + startTag + selected + endTag + textarea.value.substring(end);
        textarea.focus();
        textarea.setSelectionRange(start + startTag.length, start + startTag.length + selected.length);
        this.updatePreview();
    }

    insertLink() {
        const url = prompt('Enter URL:', 'https://');
        if (!url) return;
        const text = prompt('Enter link text:', url);
        if (!text) return;
        
        const textarea = document.getElementById('broadcastMessage');
        const start = textarea.selectionStart;
        textarea.value = textarea.value.substring(0, start) + `<a href="${url}">${text}</a>` + textarea.value.substring(start);
        textarea.focus();
        textarea.setSelectionRange(start, start + `<a href="${url}">${text}</a>`.length);
        this.updatePreview();
    }

    updatePreview() {
        const message = document.getElementById('broadcastMessage').value;
        const preview = document.getElementById('broadcastPreview');
        const imageUrl = document.getElementById('broadcastImage')?.value;
        
        let previewHTML = '';
        if (imageUrl) {
            previewHTML += `<div class="preview-image"><img src="${imageUrl}" alt="Broadcast image" style="max-width: 100%; border-radius: 12px; margin-bottom: 12px;"></div>`;
        }
        if (message.trim()) {
            previewHTML += `<div class="message-content">${message.replace(/\n/g, '<br>')}</div>`;
            const buttons = this.getInlineButtons();
            if (buttons.length > 0) {
                previewHTML += '<div class="buttons-preview">';
                buttons.forEach(row => {
                    previewHTML += '<div class="buttons-row">';
                    row.forEach(button => {
                        if (button.text && button.url) {
                            previewHTML += `<a href="${button.url}" class="preview-button" target="_blank">${button.text}</a>`;
                        }
                    });
                    previewHTML += '</div>';
                });
                previewHTML += '</div>';
            }
        } else {
            previewHTML = `<div class="preview-placeholder"><i class="fas fa-comment-alt"></i><p>Message preview will appear here</p></div>`;
        }
        preview.innerHTML = previewHTML;
    }

    getInlineButtons() {
        const rows = document.querySelectorAll('#inlineButtonsContainer .button-row');
        const buttons = [];
        rows.forEach(row => {
            const rowButtons = [];
            const textInput = row.querySelector('.button-text');
            const urlInput = row.querySelector('.button-url');
            if (textInput && urlInput && textInput.value.trim() && urlInput.value.trim()) {
                rowButtons.push({ text: textInput.value.trim(), url: urlInput.value.trim() });
            }
            if (rowButtons.length > 0) buttons.push(rowButtons);
        });
        return buttons;
    }

    async sendBroadcast() {
        const message = document.getElementById('broadcastMessage').value.trim();
        const type = document.getElementById('broadcastType').value;
        const userId = document.getElementById('broadcastUserId')?.value.trim();
        const inlineButtons = this.getInlineButtons();
        const imageUrl = document.getElementById('broadcastImage')?.value.trim();
        
        if (!message) {
            this.showNotification("Error", "Please enter a message", "error");
            return;
        }
        
        if (type === 'specific' && !userId) {
            this.showNotification("Error", "Please enter User ID", "error");
            return;
        }
        
        if (!confirm(`Send broadcast to ${type === 'all' ? 'ALL users' : '1 user'}?`)) return;
        
        const progressDiv = document.getElementById('broadcastProgress');
        const progressFill = document.getElementById('broadcastProgressFill');
        const sentSpan = document.getElementById('broadcastSent');
        const totalSpan = document.getElementById('broadcastTotal');
        const failedSpan = document.getElementById('broadcastFailed');
        
        if (progressDiv) progressDiv.style.display = 'block';
        
        try {
            let users = [];
            if (type === 'all') {
                const usersSnap = await this.db.ref(this.dbPaths.users).once('value');
                usersSnap.forEach(child => { users.push({ id: child.key, ...child.val() }); });
            } else {
                const userSnap = await this.db.ref(`${this.dbPaths.users}/${userId}`).once('value');
                if (!userSnap.exists()) throw new Error('User not found');
                users.push({ id: userId, ...userSnap.val() });
            }
            
            const total = users.length;
            if (total === 0) throw new Error('No users found');
            if (totalSpan) totalSpan.textContent = total;
            
            let sent = 0, failed = 0;
            const CONCURRENT_LIMIT = 20;
            
            for (let i = 0; i < users.length; i += CONCURRENT_LIMIT) {
                const batch = users.slice(i, i + CONCURRENT_LIMIT);
                const results = await Promise.allSettled(
                    batch.map(user => this.sendTelegramMessage(user.id, message, inlineButtons, imageUrl))
                );
                results.forEach(result => {
                    if (result.status === 'fulfilled') sent++;
                    else failed++;
                });
                if (progressFill) progressFill.style.width = `${(sent + failed) / total * 100}%`;
                if (sentSpan) sentSpan.textContent = sent;
                if (failedSpan) failedSpan.textContent = `Failed: ${failed}`;
                if (i + CONCURRENT_LIMIT < users.length) await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            this.showNotification("Success", `Broadcast completed!\nSent: ${sent}\nFailed: ${failed}`, "success");
            await this.sendTelegramMessage(ADMIN_TELEGRAM_ID, `✅ Broadcast completed!\n\nSent: ${sent}\nFailed: ${failed}\nTotal: ${total}`);
            
            document.getElementById('broadcastMessage').value = '';
            document.getElementById('broadcastImage').value = '';
            document.getElementById('inlineButtonsContainer').innerHTML = `
                <div class="button-row">
                    <input type="text" class="button-text" placeholder="Button text" maxlength="30">
                    <input type="text" class="button-url" placeholder="URL">
                    <button class="btn-sm btn-danger" onclick="this.parentElement.remove(); admin.updatePreview()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            this.updatePreview();
            setTimeout(() => { if (progressDiv) progressDiv.style.display = 'none'; }, 3000);
            
        } catch (error) {
            console.error("Broadcast error:", error);
            this.showNotification("Error", `Broadcast failed: ${error.message}`, "error");
            if (progressDiv) progressDiv.style.display = 'none';
        }
    }

    async renderMyUid() {
        this.elements.contentArea.innerHTML = `
            <div class="uid-page">
                <div class="page-header">
                    <h2><i class="fas fa-id-card"></i> My UID</h2>
                    <p>Your Firebase Authentication UID</p>
                </div>
                
                <div class="uid-content">
                    <div class="card uid-card">
                        <div class="uid-info">
                            <h3><i class="fas fa-key"></i> Your Firebase UID</h3>
                            <div class="uid-display">
                                <div class="uid-value" id="uidValue">
                                    ${this.currentUser ? this.currentUser.uid : 'Not available'}
                                </div>
                                <button class="action-btn btn-primary" onclick="admin.copyUid()">
                                    <i class="fas fa-copy"></i> Copy
                                </button>
                            </div>
                        </div>
                        
                        <div class="uid-details">
                            <div class="detail-row">
                                <span class="detail-label"><i class="fas fa-info-circle"></i> Status:</span>
                                <span class="detail-value success">Authenticated</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label"><i class="fas fa-clock"></i> Login Time:</span>
                                <span class="detail-value">${this.formatDateTime(Date.now())}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label"><i class="fas fa-user-shield"></i> Role:</span>
                                <span class="detail-value">VELTRIX Administrator</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    copyUid() {
        const uid = this.currentUser ? this.currentUser.uid : '';
        if (!uid) {
            this.showNotification("Error", "No UID available", "error");
            return;
        }
        navigator.clipboard.writeText(uid).then(() => {
            this.showNotification("Copied", "UID copied to clipboard", "success");
        }).catch(() => {
            this.showNotification("Error", "Failed to copy UID", "error");
        });
    }

    async sendTelegramMessage(chatId, message, inlineButtons = [], imageUrl = null) {
        try {
            if (imageUrl) {
                const photoUrl = `https://api.telegram.org/bot${this.botToken}/sendPhoto`;
                const photoPayload = { chat_id: chatId, photo: imageUrl, caption: message, parse_mode: 'HTML' };
                if (inlineButtons && inlineButtons.length > 0) {
                    photoPayload.reply_markup = { inline_keyboard: inlineButtons };
                }
                const response = await fetch(photoUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(photoPayload) });
                const data = await response.json();
                if (!data.ok) throw new Error(data.description || 'Telegram API error');
                return data.result;
            } else {
                const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
                const payload = { chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: false };
                if (inlineButtons && inlineButtons.length > 0) {
                    payload.reply_markup = { inline_keyboard: inlineButtons };
                }
                const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const data = await response.json();
                if (!data.ok) throw new Error(data.description || 'Telegram API error');
                return data.result;
            }
        } catch (error) {
            console.error(`Telegram error for ${chatId}:`, error);
            throw error;
        }
    }

    showNotification(title, message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        let icon = '';
        switch(type) {
            case 'success': icon = '✅'; break;
            case 'error': icon = '❌'; break;
            case 'warning': icon = '⚠️'; break;
            default: icon = 'ℹ️';
        }
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icon}</div>
                <div class="notification-text">
                    <div class="notification-title">${title}</div>
                    <div class="notification-message">${message}</div>
                </div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(100%)';
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    safeNumber(value) {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    }
}

const admin = new VeltrixAdminPanel();
window.admin = admin;
