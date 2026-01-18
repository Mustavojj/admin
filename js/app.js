const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA0APJwsUQd1kTg3y8J-9yVukiZzUBdRos",
  authDomain: "neja-go.firebaseapp.com",
  databaseURL: "https://neja-go-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "neja-go",
  storageBucket: "neja-go.firebasestorage.app",
  messagingSenderId: "60526443918",
  appId: "1:60526443918:web:fca257ab5c782e0f1178df",
  measurementId: "G-SJGF6HVQRE"
};

const ADMIN_PASSWORDS = ["Mostafa$500"];
const ADMIN_TELEGRAM_ID = "1891231976";

const APP_DEFAULT_CONFIG = {
  appName: "Ninja TON Admin",
  botUsername: "NinjaTONS_Bot",
  botToken: "8315477063:AAFjF0qceSsrZ5fJ--xDfwiBCQ3ahmLgLNs",
  walletAddress: "UQCMATcdykmpWDSLdI5ob-NScl55FSna3OOVy1l3i_2ICcPZ",
  minimumWithdraw: 0.10,
  minimumDeposit: 0.10,
  exchangeRate: 10000,
  welcomeMessage: "Welcome to Ninja TON!"
};

class AdminPanel {
  constructor() {
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    this.appConfig = APP_DEFAULT_CONFIG;
    this.botToken = "8315477063:AAFjF0qceSsrZ5fJ--xDfwiBCQ3ahmLgLNs";
    this.dailyReportSent = false;
    
    this.elements = {
      appContainer: document.getElementById('app-container'),
      loginContainer: document.getElementById('login-container'),
      loginButton: document.getElementById('login-button'),
      loginPassword: document.getElementById('login-password'),
      loginMessage: document.getElementById('login-message'),
      mainContent: document.getElementById('main-content'),
      pageTitle: document.getElementById('page-title'),
      sidebar: document.getElementById('sidebar'),
      overlay: document.getElementById('overlay')
    };
    
    this.initializeFirebase();
    this.setupDailyReport();
  }

  async initializeFirebase() {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      
      this.db = firebase.database();
      this.auth = firebase.auth();
      
      console.log("✅ Firebase initialized successfully");
      
      await this.setupEventListeners();
      await this.loadAppConfig();
      
    } catch (error) {
      console.error("❌ Firebase initialization error:", error);
      this.showLoginMessage("Failed to initialize Firebase", "error");
    }
  }

  setupDailyReport() {
    const now = new Date();
    const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    const timeUntilMidnight = utcMidnight.getTime() - Date.now();
    
    setTimeout(() => {
      this.sendDailyReport();
      setInterval(() => this.sendDailyReport(), 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);
  }

  async sendDailyReport() {
    try {
      const [usersSnap, withdrawalsSnap] = await Promise.all([
        this.db.ref('users').once('value'),
        this.db.ref('withdrawals/completed').once('value')
      ]);
      
      const totalUsers = usersSnap.numChildren();
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      let newUsers = 0;
      let todayPayments = 0;
      
      usersSnap.forEach(child => {
        const user = child.val();
        if (user.createdAt) {
          const userDate = new Date(user.createdAt).toISOString().split('T')[0];
          if (userDate === yesterday) newUsers++;
        }
      });
      
      withdrawalsSnap.forEach(child => {
        const withdrawal = child.val();
        if (withdrawal.processedAt) {
          const withdrawalDate = new Date(withdrawal.processedAt).toISOString().split('T')[0];
          if (withdrawalDate === yesterday) {
            todayPayments += withdrawal.amount || 0;
          }
        }
      });
      
      const message = `
🔔 <b>Daily Report Notification</b>

🥷 Total Users: ${totalUsers}
📉 Yesterday New Users: ${newUsers}
💸 Yesterday Payments: ${todayPayments.toFixed(3)} TON
      `;
      
      await this.sendTelegramMessage(ADMIN_TELEGRAM_ID, message);
      
    } catch (error) {
      console.error("❌ Error sending daily report:", error);
    }
  }

  async loadAppConfig() {
    try {
      const configSnapshot = await this.db.ref('config').once('value');
      if (configSnapshot.exists()) {
        this.appConfig = { ...this.appConfig, ...configSnapshot.val() };
        this.botToken = this.appConfig.botToken || this.botToken;
      }
    } catch (error) {
      console.error("Error loading app config:", error);
    }
  }
  
  async setupEventListeners() {
    this.elements.loginButton.addEventListener('click', () => this.handleLogin());
    this.elements.loginPassword.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    
    this.setupNavigation();
    this.setupMobileMenu();
  }

  showLoginMessage(message, type) {
    const messageEl = this.elements.loginMessage;
    messageEl.textContent = message;
    messageEl.className = `login-message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 5000);
  }

  async handleLogin() {
    const password = this.elements.loginPassword.value.trim();
    
    if (!password) {
      this.showLoginMessage("Please enter a password", "error");
      return;
    }

    this.elements.loginButton.disabled = true;
    this.elements.loginButton.textContent = "Authenticating...";
    
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
      this.elements.loginButton.textContent = "Login";
    }
  }

  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-menu li:not(#logout-btn)');
    const logoutBtn = document.getElementById('logout-btn');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const pageKey = e.currentTarget.dataset.page;
        if (pageKey) {
          this.showPage(pageKey);
        }
      });
    });
    
    logoutBtn.addEventListener('click', () => this.handleLogout());
  }

  setupMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const closeBtn = this.elements.sidebar.querySelector('.close-btn');
    
    menuToggle.addEventListener('click', () => { 
      this.elements.sidebar.classList.add('open'); 
      this.elements.overlay.classList.add('show'); 
    });
    
    closeBtn.addEventListener('click', () => { 
      this.elements.sidebar.classList.remove('open'); 
      this.elements.overlay.classList.remove('show'); 
    });
    
    this.elements.overlay.addEventListener('click', () => { 
      this.elements.sidebar.classList.remove('open'); 
      this.elements.overlay.classList.remove('show'); 
    });
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
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('.nav-menu li');
    
    pages.forEach(page => page.classList.remove('active'));
    navLinks.forEach(link => link.classList.remove('active'));
    
    this.elements.pageTitle.textContent = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    
    const activeNav = document.querySelector(`[data-page="${pageName}"]`);
    if (activeNav) activeNav.classList.add('active');
    
    switch(pageName) {
      case 'dashboard':
        await this.renderDashboard();
        break;
      case 'users':
        await this.renderUsers();
        break;
      case 'promoCodes':
        await this.renderPromoCodes();
        break;
      case 'tasks':
        await this.renderTasks();
        break;
      case 'withdrawals':
        await this.renderWithdrawals();
        break;
      case 'broadcast':
        await this.renderBroadcast();
        break;
      default:
        await this.renderDashboard();
    }
    
    if (window.innerWidth < 768) {
      this.elements.sidebar.classList.remove('open');
      this.elements.overlay.classList.remove('show');
    }
  }

  async renderDashboard() {
    this.elements.mainContent.innerHTML = `
      <div id="dashboard" class="page active">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading Dashboard...</p>
        </div>
      </div>
    `;
    
    try {
      const [usersSnap, tasksSnap, withdrawalsSnap, promoCodesSnap] = await Promise.all([
        this.db.ref('users').once('value'),
        this.db.ref('config/tasks').once('value'),
        this.db.ref('withdrawals').once('value'),
        this.db.ref('config/promoCodes').once('value')
      ]);
      
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      let totalUsers = 0;
      let yesterdayUsers = 0;
      let totalTasks = 0;
      let completedTasks = 0;
      let totalWithdrawals = 0;
      let confirmedWithdrawals = 0;
      let rejectedWithdrawals = 0;
      let totalPromoCodes = 0;
      let activePromoCodes = 0;
      let pausedPromoCodes = 0;
      
      usersSnap.forEach(child => {
        totalUsers++;
        const user = child.val();
        if (user.createdAt) {
          const userDate = new Date(user.createdAt).toISOString().split('T')[0];
          if (userDate === yesterday) yesterdayUsers++;
        }
      });
      
      if (tasksSnap.exists()) {
        const tasks = tasksSnap.val();
        Object.values(tasks).forEach(task => {
          if (task.status !== 'deleted') {
            totalTasks++;
            if (task.currentCompletions >= task.maxCompletions) {
              completedTasks++;
            }
          }
        });
      }
      
      if (withdrawalsSnap.exists()) {
        const withdrawals = withdrawalsSnap.val();
        
        if (withdrawals.pending) {
          totalWithdrawals += Object.keys(withdrawals.pending).length;
        }
        
        if (withdrawals.completed) {
          const completed = Object.keys(withdrawals.completed).length;
          totalWithdrawals += completed;
          confirmedWithdrawals += completed;
        }
        
        if (withdrawals.rejected) {
          const rejected = Object.keys(withdrawals.rejected).length;
          totalWithdrawals += rejected;
          rejectedWithdrawals += rejected;
        }
      }
      
      if (promoCodesSnap.exists()) {
        const promoCodes = promoCodesSnap.val();
        Object.values(promoCodes).forEach(promo => {
          if (promo.status !== 'deleted') {
            totalPromoCodes++;
            if (promo.status === 'active') {
              activePromoCodes++;
            } else {
              pausedPromoCodes++;
            }
          }
        });
      }
      
      const topUsersHTML = await this.getTop10UsersHTML();
      
      this.elements.mainContent.innerHTML = `
        <div id="dashboard" class="page active">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                <i class="fas fa-users"></i>
              </div>
              <div class="stat-content">
                <h3>Total Users</h3>
                <p class="stat-number">${totalUsers}</p>
                <div class="stat-sub">Yesterday: ${yesterdayUsers}</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                <i class="fas fa-tasks"></i>
              </div>
              <div class="stat-content">
                <h3>Total Tasks</h3>
                <p class="stat-number">${totalTasks}</p>
                <div class="stat-sub">Completed: ${completedTasks}</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
                <i class="fas fa-wallet"></i>
              </div>
              <div class="stat-content">
                <h3>Withdrawals</h3>
                <p class="stat-number">${totalWithdrawals}</p>
                <div class="stat-sub">✓ ${confirmedWithdrawals} | ✗ ${rejectedWithdrawals}</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                <i class="fas fa-ticket-alt"></i>
              </div>
              <div class="stat-content">
                <h3>Promo Codes</h3>
                <p class="stat-number">${totalPromoCodes}</p>
                <div class="stat-sub">Active: ${activePromoCodes} | Paused: ${pausedPromoCodes}</div>
              </div>
            </div>
          </div>
          
          <div class="card">
            <h3><i class="fas fa-trophy"></i> Top 10 Users</h3>
            <div class="top-users-container">
              ${topUsersHTML}
            </div>
          </div>
        </div>
      `;
      
    } catch (error) {
      console.error("Error loading dashboard:", error);
      this.elements.mainContent.innerHTML = `
        <div id="dashboard" class="page active">
          <div class="card">
            <h3>Error loading dashboard</h3>
            <p>${error.message}</p>
          </div>
        </div>
      `;
    }
  }

  async getTop10UsersHTML() {
    try {
      const usersSnap = await this.db.ref('users').once('value');
      const usersArray = [];
      
      usersSnap.forEach(child => {
        const user = child.val();
        usersArray.push({
          id: child.key,
          firstName: user.firstName || '',
          username: user.username || `User ${child.key.substring(0, 6)}`,
          balance: this.safeNumber(user.balance),
          referrals: user.referrals || 0,
          photoUrl: user.photoUrl || 'https://cdn-icons-png.flaticon.com/512/9195/9195920.png'
        });
      });
      
      const topUsers = usersArray
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10);
      
      if (topUsers.length === 0) {
        return '<div class="empty-state">No users found</div>';
      }
      
      let html = '<div class="top-users-list">';
      topUsers.forEach((user, index) => {
        html += `
          <div class="top-user-item">
            <div class="top-user-rank">${index + 1}</div>
            <div class="top-user-avatar">
              <img src="${user.photoUrl}" alt="${user.username}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/9195/9195920.png'">
            </div>
            <div class="top-user-info">
              <div class="top-user-name">
                <strong>${user.firstName || user.username}</strong>
                <span class="top-user-username">@${user.username.replace('@', '')}</span>
              </div>
              <div class="top-user-stats">
                <div class="top-user-stat">
                  <i class="fas fa-coins"></i>
                  <span>Balance: ${user.balance.toFixed(3)}</span>
                </div>
                <div class="top-user-stat">
                  <i class="fas fa-users"></i>
                  <span>Referrals: ${user.referrals}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
      
      return html;
    } catch (error) {
      console.error("Error getting top users:", error);
      return '<div class="empty-state error">Error loading top users</div>';
    }
  }

  async renderUsers() {
    this.elements.mainContent.innerHTML = `
      <div id="users" class="page active">
        <div class="card">
          <h3>Search User by ID</h3>
          <div class="search-container">
            <input type="text" id="searchUserId" placeholder="Enter Telegram User ID (e.g., 123456789)">
            <button class="action-btn btn-primary" onclick="admin.searchUser()">
              <i class="fas fa-search"></i> Search
            </button>
          </div>
          <div id="userDetails" class="user-details-container">
            <div class="empty-state">
              <i class="fas fa-user-search"></i>
              <p>Enter a User ID to view details</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async searchUser() {
    const userId = document.getElementById('searchUserId').value.trim();
    
    if (!userId) {
      this.showNotification("Error", "Please enter a User ID", "error");
      return;
    }

    try {
      const userSnap = await this.db.ref(`users/${userId}`).once('value');
      if (!userSnap.exists()) {
        document.getElementById('userDetails').innerHTML = `
          <div class="empty-state error">
            <i class="fas fa-user-times"></i>
            <p>User with ID "${userId}" not found</p>
          </div>
        `;
        return;
      }

      const user = userSnap.val();
      
      const statusSnap = await this.db.ref(`users/${userId}/status`).once('value');
      const userStatus = statusSnap.exists() ? statusSnap.val() : 'free';
      
      const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-GB');
      };
      
      const formatDateTime = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('en-GB');
      };
      
      const balance = this.safeNumber(user.balance);
      const referrals = user.referrals || 0;
      const tasksCompleted = user.tasksCompleted || user.totalTasks || 0;
      const referralEarnings = this.safeNumber(user.referralEarnings);
      const totalEarned = this.safeNumber(user.totalEarned);
      const totalWithdrawals = user.totalWithdrawals || 0;
      const dailyAdsWatched = user.dailyAdsWatched || 0;
      const photoUrl = user.photoUrl || 'https://cdn-icons-png.flaticon.com/512/9195/9195920.png';
      
      document.getElementById('userDetails').innerHTML = `
        <div class="compact-user-card">
          <div class="compact-user-header">
            <div class="compact-user-avatar">
              <img src="${photoUrl}" alt="User" onerror="this.src='https://cdn-icons-png.flaticon.com/512/9195/9195920.png'">
            </div>
            <div class="compact-user-info">
              <div class="compact-user-name">
                <h3>${user.firstName || user.username || `User ${userId.substring(0, 6)}`}</h3>
                <span class="user-status-badge ${userStatus}">
                  <i class="fas fa-circle"></i> ${userStatus === 'ban' ? 'BANNED' : 'ACTIVE'}
                </span>
              </div>
              <div class="compact-user-meta">
                ${user.firstName ? `<span><i class="fas fa-user"></i> ${user.firstName}</span>` : ''}
                <span><i class="fab fa-telegram"></i> ${user.username || 'No username'}</span>
                <span><i class="fas fa-id-card"></i> ID: ${userId}</span>
              </div>
            </div>
          </div>
          
          <div class="compact-user-stats">
            <div class="compact-stat">
              <div class="compact-stat-icon ton">
                <i class="fas fa-coins"></i>
              </div>
              <div class="compact-stat-content">
                <div class="compact-stat-value">${balance.toFixed(3)} TON</div>
                <div class="compact-stat-label">Balance</div>
              </div>
            </div>
            
            <div class="compact-stat">
              <div class="compact-stat-icon referrals">
                <i class="fas fa-users"></i>
              </div>
              <div class="compact-stat-content">
                <div class="compact-stat-value">${referrals}</div>
                <div class="compact-stat-label">Referrals</div>
              </div>
            </div>
            
            <div class="compact-stat">
              <div class="compact-stat-icon tasks">
                <i class="fas fa-tasks"></i>
              </div>
              <div class="compact-stat-content">
                <div class="compact-stat-value">${tasksCompleted}</div>
                <div class="compact-stat-label">Tasks</div>
              </div>
            </div>
          </div>
          
          <div class="compact-user-details">
            <div class="detail-row">
              <span class="detail-label">Referral Earnings:</span>
              <span class="detail-value">${referralEarnings.toFixed(3)} TON</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Earned:</span>
              <span class="detail-value">${totalEarned.toFixed(3)} TON</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Withdrawals:</span>
              <span class="detail-value">${totalWithdrawals}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Ads Watched:</span>
              <span class="detail-value">${dailyAdsWatched}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Last Active:</span>
              <span class="detail-value">${formatDateTime(user.lastActive)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Created:</span>
              <span class="detail-value">${formatDate(user.createdAt)}</span>
            </div>
          </div>
          
          <div class="compact-user-actions">
            <button class="action-btn btn-sm btn-success" onclick="admin.showAddBalanceModal('${userId}', '${(user.firstName || user.username || `User ${userId.substring(0, 6)}`).replace(/'/g, "\\'")}')">
              <i class="fas fa-plus"></i> Add TON
            </button>
            <button class="action-btn btn-sm btn-danger" onclick="admin.showRemoveBalanceModal('${userId}', '${(user.firstName || user.username || `User ${userId.substring(0, 6)}`).replace(/'/g, "\\'")}')">
              <i class="fas fa-minus"></i> Remove TON
            </button>
            ${userStatus === 'free' ? 
              `<button class="action-btn btn-sm btn-warning" onclick="admin.banUser('${userId}')">
                <i class="fas fa-ban"></i> Ban
              </button>` : 
              `<button class="action-btn btn-sm btn-success" onclick="admin.unbanUser('${userId}')">
                <i class="fas fa-check"></i> Unban
              </button>`
            }
          </div>
        </div>
      `;

    } catch (error) {
      console.error("Error searching user:", error);
      this.showNotification("Error", "Failed to search user", "error");
    }
  }

  showAddBalanceModal(userId, userName) {
    const modalHTML = `
      <div class="modal-overlay active" id="addBalanceModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Add Balance to ${userName}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="addBalanceAmount">Amount (TON)</label>
              <input type="number" id="addBalanceAmount" placeholder="Enter amount" step="0.001" min="0.001">
              <small>Enter TON amount (e.g., 0.100, 1.000)</small>
            </div>
            <div class="form-group">
              <label for="addBalanceReason">Reason</label>
              <input type="text" id="addBalanceReason" placeholder="Reason for adding balance">
            </div>
          </div>
          <div class="modal-footer">
            <button class="action-btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="action-btn btn-success" onclick="admin.addBalance('${userId}')">
              <i class="fas fa-check"></i> Add Balance
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  showRemoveBalanceModal(userId, userName) {
    const modalHTML = `
      <div class="modal-overlay active" id="removeBalanceModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Remove Balance from ${userName}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="removeBalanceAmount">Amount (TON)</label>
              <input type="number" id="removeBalanceAmount" placeholder="Enter amount" step="0.001" min="0.001">
              <small>Enter TON amount to remove</small>
            </div>
            <div class="form-group">
              <label for="removeBalanceReason">Reason</label>
              <input type="text" id="removeBalanceReason" placeholder="Reason for removing balance">
            </div>
          </div>
          <div class="modal-footer">
            <button class="action-btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="action-btn btn-danger" onclick="admin.removeBalance('${userId}')">
              <i class="fas fa-check"></i> Remove Balance
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  async addBalance(userId) {
    const amount = parseFloat(document.getElementById('addBalanceAmount').value);
    const reason = document.getElementById('addBalanceReason').value.trim() || 'Admin added balance';

    if (!amount || amount <= 0) {
      this.showNotification("Error", "Please enter a valid amount", "error");
      return;
    }

    try {
      const userSnap = await this.db.ref(`users/${userId}`).once('value');
      if (!userSnap.exists()) {
        this.showNotification("Error", "User not found", "error");
        return;
      }

      const user = userSnap.val();
      const currentBalance = this.safeNumber(user.balance);
      const newBalance = currentBalance + amount;

      await this.db.ref(`users/${userId}`).update({
        balance: newBalance,
        totalEarned: this.safeNumber(user.totalEarned) + amount
      });

      this.showNotification("Success", `Added ${amount} TON to user`, "success");
      
      document.querySelector('#addBalanceModal')?.remove();
      await this.searchUser();
      
    } catch (error) {
      console.error("Error adding balance:", error);
      this.showNotification("Error", "Failed to add balance", "error");
    }
  }

  async removeBalance(userId) {
    const amount = parseFloat(document.getElementById('removeBalanceAmount').value);
    const reason = document.getElementById('removeBalanceReason').value.trim() || 'Admin removed balance';

    if (!amount || amount <= 0) {
      this.showNotification("Error", "Please enter a valid amount", "error");
      return;
    }

    try {
      const userSnap = await this.db.ref(`users/${userId}`).once('value');
      if (!userSnap.exists()) {
        this.showNotification("Error", "User not found", "error");
        return;
      }

      const user = userSnap.val();
      const currentBalance = this.safeNumber(user.balance);
      
      if (currentBalance < amount) {
        this.showNotification("Error", `User only has ${currentBalance} TON`, "error");
        return;
      }

      const newBalance = currentBalance - amount;

      await this.db.ref(`users/${userId}`).update({
        balance: newBalance
      });

      this.showNotification("Success", `Removed ${amount} TON from user`, "success");
      
      document.querySelector('#removeBalanceModal')?.remove();
      await this.searchUser();
      
    } catch (error) {
      console.error("Error removing balance:", error);
      this.showNotification("Error", "Failed to remove balance", "error");
    }
  }

  async banUser(userId) {
    if (!confirm('Are you sure you want to ban this user?')) return;

    try {
      await this.db.ref(`users/${userId}/status`).set('ban');

      this.showNotification("Success", "User has been banned", "success");
      await this.searchUser();
      
    } catch (error) {
      console.error("Error banning user:", error);
      this.showNotification("Error", "Failed to ban user", "error");
    }
  }

  async unbanUser(userId) {
    if (!confirm('Are you sure you want to unban this user?')) return;

    try {
      await this.db.ref(`users/${userId}/status`).set('free');

      this.showNotification("Success", "User has been unbanned", "success");
      await this.searchUser();
      
    } catch (error) {
      console.error("Error unbanning user:", error);
      this.showNotification("Error", "Failed to unban user", "error");
    }
  }

  async renderTasks() {
    this.elements.mainContent.innerHTML = `
      <div id="tasks" class="page active">
        <div class="tasks-management">
          <div class="card">
            <h3><i class="fas fa-tasks"></i> Create New Task</h3>
            
            <div class="form-group">
              <label for="taskName">Task Name *</label>
              <input type="text" id="taskName" placeholder="e.g., Join Our Channel" required>
            </div>
            
            <div class="form-group">
              <label for="taskDescription">Description</label>
              <input type="text" id="taskDescription" placeholder="Short description of the task">
            </div>
            
            <div class="form-group">
              <label for="taskLink">Task Link (URL) *</label>
              <input type="text" id="taskLink" placeholder="https://t.me/..." required>
            </div>
            
            <div class="form-group">
              <label>Task Category *</label>
              <div class="task-category-buttons">
                <button type="button" class="task-category-btn active" data-category="partner">
                  <i class="fas fa-handshake"></i> Partner
                </button>
                <button type="button" class="task-category-btn" data-category="social">
                  <i class="fas fa-share-alt"></i> Social
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label for="taskReward">Reward per User (TON) *</label>
              <input type="number" id="taskReward" placeholder="0.001" value="0.001" min="0.001" step="0.001">
              <small>How much TON each user gets for completing</small>
            </div>
            
            <div class="form-group">
              <label for="taskMaxCompletions">Max Completions *</label>
              <input type="number" id="taskMaxCompletions" placeholder="100" value="100" min="10" step="10">
              <small>Maximum number of users who can complete this task</small>
            </div>
            
            <button class="action-btn btn-success" style="width: 100%;" onclick="admin.addNewTask()">
              <i class="fas fa-plus-circle"></i> Create New Task
            </button>
          </div>
          
          <div class="card" id="tasksListContainer">
            <div class="loading">
              <div class="spinner"></div>
              <p>Loading Tasks...</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.setupTaskCategoryButtons();
    await this.loadTasksList();
  }

  setupTaskCategoryButtons() {
    const categoryButtons = document.querySelectorAll('.task-category-btn');
    categoryButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        categoryButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  async loadTasksList() {
    try {
      const tasksSnap = await this.db.ref('config/tasks').once('value');
      let tasksHTML = '<h3><i class="fas fa-list"></i> All Tasks</h3>';
      
      if (tasksSnap.exists()) {
        tasksHTML += '<div class="tasks-list">';
        
        const tasksArray = [];
        tasksSnap.forEach(child => {
          const task = child.val();
          if (task.status !== 'deleted') {
            tasksArray.push({
              id: child.key,
              ...task
            });
          }
        });
        
        tasksArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        if (tasksArray.length === 0) {
          tasksHTML = `
            <div class="empty-state">
              <i class="fas fa-tasks"></i>
              <p>No active tasks available</p>
            </div>
          `;
        } else {
          tasksArray.forEach(task => {
            const currentCompletions = task.currentCompletions || 0;
            const maxCompletions = task.maxCompletions || 100;
            const progress = Math.min((currentCompletions / maxCompletions) * 100, 100);
            
            let status = 'active';
            let statusClass = 'status-active';
            if (progress >= 100) {
              status = 'completed';
              statusClass = 'status-completed';
            }
            
            const formatDate = (timestamp) => {
              if (!timestamp) return 'N/A';
              const date = new Date(timestamp);
              return date.toLocaleDateString('en-GB');
            };
            
            const categoryClass = task.category === 'partner' ? 'category-partner' : 'category-social';
            const categoryText = task.category === 'partner' ? 'Partner' : 'Social';
            
            tasksHTML += `
              <div class="task-item">
                <div class="task-item-header">
                  <div class="task-title">
                    <h4>${task.name || 'Unnamed Task'}</h4>
                    <div class="task-meta">
                      <span class="task-category-badge ${categoryClass}">
                        <i class="${task.category === 'partner' ? 'fas fa-handshake' : 'fas fa-share-alt'}"></i> ${categoryText}
                      </span>
                      <span class="task-status-badge ${statusClass}">${status}</span>
                    </div>
                  </div>
                </div>
                
                ${task.description ? `<p style="margin-bottom: 10px; color: var(--text-secondary);">${task.description}</p>` : ''}
                
                <div class="task-item-details">
                  <div class="task-detail">
                    <span class="detail-label">URL:</span>
                    <a href="${task.url}" target="_blank" class="task-link">${task.url.substring(0, 50)}${task.url.length > 50 ? '...' : ''}</a>
                  </div>
                  <div class="task-detail">
                    <span class="detail-label">Reward:</span>
                    <span class="reward-amount">
                      <img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm">
                      ${task.reward || 0.001} TON
                    </span>
                  </div>
                  <div class="task-detail">
                    <span class="detail-label">Completions:</span>
                    <span>${currentCompletions}/${maxCompletions}</span>
                  </div>
                  <div class="task-detail">
                    <span class="detail-label">Created:</span>
                    <span>${formatDate(task.createdAt)}</span>
                  </div>
                </div>
                
                <div class="task-progress">
                  <div class="progress-info">
                    <span>Progress: ${progress.toFixed(1)}%</span>
                    <span>${currentCompletions}/${maxCompletions}</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                  </div>
                </div>
                
                <div class="task-actions-horizontal">
                  <div class="task-completion-control">
                    <button class="action-btn btn-sm btn-secondary" onclick="admin.updateTaskCompletion('${task.id}', -10)">
                      <i class="fas fa-minus"></i> -10
                    </button>
                    <button class="action-btn btn-sm btn-secondary" onclick="admin.updateTaskCompletion('${task.id}', -1)">
                      <i class="fas fa-minus"></i> -1
                    </button>
                    <span class="completion-count">${currentCompletions}</span>
                    <button class="action-btn btn-sm btn-secondary" onclick="admin.updateTaskCompletion('${task.id}', 1)">
                      <i class="fas fa-plus"></i> +1
                    </button>
                    <button class="action-btn btn-sm btn-secondary" onclick="admin.updateTaskCompletion('${task.id}', 10)">
                      <i class="fas fa-plus"></i> +10
                    </button>
                  </div>
                  <button class="action-btn btn-sm btn-danger" onclick="admin.deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            `;
          });
          
          tasksHTML += '</div>';
        }
      } else {
        tasksHTML = `
          <div class="empty-state">
            <i class="fas fa-tasks"></i>
            <p>No tasks created yet</p>
          </div>
        `;
      }
      
      document.getElementById('tasksListContainer').innerHTML = tasksHTML;
      
    } catch (error) {
      console.error("Error loading tasks:", error);
      document.getElementById('tasksListContainer').innerHTML = `
        <div class="error-message">
          <h3>Error loading tasks</h3>
          <p>${error.message}</p>
        </div>
      `;
    }
  }

  async addNewTask() {
    const taskName = document.getElementById('taskName').value.trim();
    const taskDescription = document.getElementById('taskDescription').value.trim();
    const taskLink = document.getElementById('taskLink').value.trim();
    const taskReward = parseFloat(document.getElementById('taskReward').value) || 0.001;
    const maxCompletions = parseInt(document.getElementById('taskMaxCompletions').value) || 100;
    const taskCategory = document.querySelector('.task-category-btn.active').dataset.category;
    
    if (!taskName || !taskLink) {
      this.showNotification("Error", "Please fill all required fields", "error");
      return;
    }
    
    if (taskReward <= 0) {
      this.showNotification("Error", "Please enter a valid reward amount", "error");
      return;
    }
    
    if (maxCompletions <= 0) {
      this.showNotification("Error", "Please enter a valid number of completions", "error");
      return;
    }
    
    try {
      let cleanLink = taskLink.trim();
      
      if (!cleanLink.startsWith('http') && !cleanLink.startsWith('@')) {
        cleanLink = 'https://t.me/' + cleanLink;
      } else if (cleanLink.startsWith('@')) {
        cleanLink = 'https://t.me/' + cleanLink.substring(1);
      }
      
      const existingTasksSnap = await this.db.ref('config/tasks').orderByChild('url').equalTo(cleanLink).once('value');
      if (existingTasksSnap.exists()) {
        let hasActiveTask = false;
        existingTasksSnap.forEach(child => {
          const existingTask = child.val();
          if (existingTask.status !== 'deleted') {
            hasActiveTask = true;
          }
        });
        
        if (hasActiveTask) {
          this.showNotification("Error", "Task with this link already exists", "error");
          return;
        }
      }
      
      const taskData = {
        name: taskName,
        description: taskDescription,
        category: taskCategory,
        url: cleanLink,
        maxCompletions: maxCompletions,
        reward: taskReward,
        createdBy: 'admin',
        status: 'active',
        taskStatus: 'active',
        currentCompletions: 0,
        createdAt: Date.now()
      };
      
      await this.db.ref('config/tasks').push(taskData);
      
      this.showNotification("Success", `Task "${taskName}" created successfully!`, "success");
      
      document.getElementById('taskName').value = '';
      document.getElementById('taskDescription').value = '';
      document.getElementById('taskLink').value = '';
      document.getElementById('taskReward').value = '0.001';
      document.getElementById('taskMaxCompletions').value = '100';
      
      await this.loadTasksList();
      
    } catch (error) {
      console.error("Error adding task:", error);
      this.showNotification("Error", "Failed to create task", "error");
    }
  }

  async updateTaskCompletion(taskId, change) {
    try {
      const taskRef = this.db.ref(`config/tasks/${taskId}`);
      const snapshot = await taskRef.once('value');
      const task = snapshot.val();
      
      if (!task) {
        this.showNotification("Error", "Task not found", "error");
        return;
      }
      
      const currentCompletions = task.currentCompletions || 0;
      const newCompletions = Math.max(0, currentCompletions + change);
      
      await taskRef.update({
        currentCompletions: newCompletions
      });
      
      this.showNotification("Success", `Updated task completions to ${newCompletions}`, "success");
      await this.loadTasksList();
      
    } catch (error) {
      console.error("Error updating task completion:", error);
      this.showNotification("Error", "Failed to update task completion", "error");
    }
  }

  async deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await this.db.ref(`config/tasks/${taskId}`).update({
        status: 'deleted',
        deletedAt: Date.now(),
        deletedBy: 'admin'
      });
      
      this.showNotification("Success", "Task deleted successfully", "success");
      await this.loadTasksList();
    } catch (error) {
      console.error("Error deleting task:", error);
      this.showNotification("Error", "Failed to delete task", "error");
    }
  }

  async renderWithdrawals() {
    this.elements.mainContent.innerHTML = `
      <div id="withdrawals" class="page active">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading Withdrawals...</p>
        </div>
      </div>
    `;
    
    try {
      const [pendingSnap, completedSnap, rejectedSnap] = await Promise.all([
        this.db.ref('withdrawals/pending').once('value'),
        this.db.ref('withdrawals/completed').limitToLast(10).once('value'),
        this.db.ref('withdrawals/rejected').limitToLast(10).once('value')
      ]);
      
      let withdrawalsContent = '';
      let requests = [];
      
      if (pendingSnap.exists()) {
        pendingSnap.forEach(child => {
          requests.push({ id: child.key, ...child.val(), status: 'pending' });
        });
      }
      
      if (requests.length > 0) {
        withdrawalsContent += `
          <div class="withdrawals-header">
            <h3><i class="fas fa-wallet"></i> Pending Withdrawals</h3>
            <span class="badge">${requests.length}</span>
          </div>
        `;
        
        for (const req of requests) {
          const userSnap = await this.db.ref(`users/${req.userId}`).once('value');
          const user = userSnap.exists() ? userSnap.val() : {};
          
          const formatDateTime = (timestamp) => {
            if (!timestamp) return 'N/A';
            const date = new Date(timestamp);
            return date.toLocaleString('en-GB');
          };
          
          withdrawalsContent += `
            <div class="withdrawal-card">
              <div class="withdrawal-header">
                <div class="withdrawal-user">
                  <div class="user-avatar-small">
                    ${user.photoUrl ? 
                      `<img src="${user.photoUrl}" alt="User" onerror="this.src='https://cdn-icons-png.flaticon.com/512/9195/9195920.png'">` : 
                      `<i class="fas fa-user-circle"></i>`
                    }
                  </div>
                  <div class="user-info">
                    <strong>${req.userName || user.username || 'Unknown User'}</strong>
                    <div class="user-meta">
                      <span><i class="fab fa-telegram"></i> ${user.username || 'No username'}</span>
                      <span><i class="fas fa-id-card"></i> ID: ${req.userId}</span>
                    </div>
                  </div>
                </div>
                <div class="withdrawal-amount">
                  <img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm">
                  ${req.amount ? req.amount.toFixed(5) : '0.00000'} TON
                </div>
              </div>
              
              <div class="withdrawal-user-stats">
                <div class="user-stat">
                  <i class="fas fa-users"></i>
                  <div>
                    <div class="stat-value">${user.referrals || 0}</div>
                    <div class="stat-label">Total Referrals</div>
                  </div>
                </div>
                <div class="user-stat">
                  <i class="fas fa-tasks"></i>
                  <div>
                    <div class="stat-value">${user.tasksCompleted || user.totalTasks || 0}</div>
                    <div class="stat-label">Total Tasks</div>
                  </div>
                </div>
              </div>
              
              <div class="withdrawal-details-grid">
                <div class="detail-item">
                  <span class="detail-label">Amount:</span>
                  <span class="detail-value amount-highlight">
                    <img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm">
                    ${req.amount ? req.amount.toFixed(5) : '0.00000'} TON
                  </span>
                </div>
                <div class="detail-item full-width">
                  <span class="detail-label">Wallet Address:</span>
                  <span class="detail-value wallet-address">${req.walletAddress || 'Not specified'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${formatDateTime(req.createdAt)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value status-pending">Pending</span>
                </div>
              </div>
              
              <div class="withdrawal-actions">
                <button class="action-btn btn-success" onclick="admin.showConfirmWithdrawalModal('${req.id}', '${req.userId}', ${req.amount}, '${req.walletAddress}', '${req.userName || user.username || ''}')">
                  <i class="fas fa-check"></i> Approve
                </button>
                <button class="action-btn btn-danger" onclick="admin.handleWithdrawal('${req.id}', 'reject')">
                  <i class="fas fa-times"></i> Reject
                </button>
                <button class="action-btn btn-info" onclick="admin.getUserReferrals('${req.userId}', '${user.username || req.userName || 'User'}')">
                  <i class="fas fa-users"></i> Get referrals
                </button>
              </div>
            </div>
          `;
        }
      } else {
        withdrawalsContent = `
          <div class="withdrawals-header">
            <h3><i class="fas fa-wallet"></i> Pending Withdrawals</h3>
          </div>
          <div class="empty-state">
            <i class="fas fa-wallet"></i>
            <h3>No Pending Withdrawals</h3>
            <p>There are no pending withdrawal requests.</p>
          </div>
        `;
      }
      
      let lastWithdrawalsHTML = '';
      const lastWithdrawals = [];
      
      if (completedSnap.exists()) {
        completedSnap.forEach(child => {
          lastWithdrawals.push({ id: child.key, ...child.val(), status: 'completed' });
        });
      }
      
      if (rejectedSnap.exists()) {
        rejectedSnap.forEach(child => {
          lastWithdrawals.push({ id: child.key, ...child.val(), status: 'rejected' });
        });
      }
      
      lastWithdrawals.sort((a, b) => (b.processedAt || b.createdAt) - (a.processedAt || a.createdAt));
      
      if (lastWithdrawals.length > 0) {
        lastWithdrawalsHTML = `
          <div class="last-withdrawals-container">
            <h3><i class="fas fa-history"></i> Last 10 Withdrawals</h3>
            <div class="last-withdrawals-grid">
        `;
        
        for (const withdrawal of lastWithdrawals.slice(0, 10)) {
          const userSnap = await this.db.ref(`users/${withdrawal.userId}`).once('value');
          const user = userSnap.exists() ? userSnap.val() : {};
          
          lastWithdrawalsHTML += `
            <div class="last-withdrawal-item">
              <div class="last-withdrawal-avatar">
                ${user.photoUrl ? 
                  `<img src="${user.photoUrl}" alt="User" onerror="this.src='https://cdn-icons-png.flaticon.com/512/9195/9195920.png'">` : 
                  `<i class="fas fa-user-circle"></i>`
                }
              </div>
              <div class="last-withdrawal-details">
                <div class="last-withdrawal-user-info">
                  <span class="last-withdrawal-user">${withdrawal.userName || user.username || 'Unknown User'}</span>
                  <span class="last-withdrawal-username">@${user.username || withdrawal.userId.substring(0, 8)}</span>
                </div>
                <div class="last-withdrawal-user-id">
                  <i class="fas fa-id-card"></i> ID: ${withdrawal.userId}
                </div>
                <div class="last-withdrawal-amount-row">
                  <span class="last-withdrawal-amount">
                    <img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm">
                    ${withdrawal.amount ? withdrawal.amount.toFixed(5) : '0.00000'} TON
                  </span>
                  <span class="last-withdrawal-status status-${withdrawal.status}">
                    ${withdrawal.status === 'completed' ? 'Completed' : 'Rejected'}
                  </span>
                </div>
                <div class="last-withdrawal-wallet">${withdrawal.walletAddress || 'N/A'}</div>
              </div>
            </div>
          `;
        }
        
        lastWithdrawalsHTML += `
            </div>
          </div>
        `;
      }
      
      this.elements.mainContent.innerHTML = `
        <div id="withdrawals" class="page active">
          ${withdrawalsContent}
          ${lastWithdrawalsHTML}
        </div>
      `;
      
    } catch (error) {
      console.error("Error loading withdrawals:", error);
      this.elements.mainContent.innerHTML = `
        <div id="withdrawals" class="page active">
          <div class="error-message">
            <h3>Error loading withdrawals</h3>
            <p>${error.message}</p>
          </div>
        </div>
      `;
    }
  }

  async getUserReferrals(userId, username) {
    try {
      const referralsSnap = await this.db.ref(`referrals/${userId}`).limitToLast(10).once('value');
      let referralsMessage = `📉 <b>Last 10 referrals (${username}):</b>\n\n`;
      
      if (referralsSnap.exists()) {
        let counter = 1;
        referralsSnap.forEach(child => {
          const referral = child.val();
          referralsMessage += `${counter}- ${referral.username || 'Unknown'}\n`;
          counter++;
        });
      } else {
        referralsMessage += "No referrals found";
      }
      
      await this.sendTelegramMessage(ADMIN_TELEGRAM_ID, referralsMessage);
      this.showNotification("Success", "Referrals sent to admin", "success");
      
    } catch (error) {
      console.error("Error getting referrals:", error);
      this.showNotification("Error", "Failed to get referrals", "error");
    }
  }

  showConfirmWithdrawalModal(requestId, userId, amount, wallet, userName) {
    const modalHTML = `
      <div class="modal-overlay active" id="confirmWithdrawalModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Confirm Withdrawal</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <p>You are about to approve a withdrawal for <strong>${userName}</strong>:</p>
            <div class="withdrawal-summary">
              <div class="summary-item">
                <span>Amount:</span>
                <span class="ton-amount">${amount.toFixed(5)} TON</span>
              </div>
              <div class="summary-item">
                <span>Wallet:</span>
                <span class="wallet-address">${wallet}</span>
              </div>
            </div>
            
            <div class="form-group">
              <label for="transactionLink">
                <i class="fas fa-link"></i> Transaction Link
              </label>
              <input type="text" id="transactionLink" placeholder="https://tonscan.org/tx/..." required>
              <small>Transaction explorer link (TONScan, Tonviewer, etc.)</small>
            </div>
          </div>
          <div class="modal-footer">
            <button class="action-btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="action-btn btn-success" onclick="admin.confirmWithdrawal('${requestId}', '${userId}', ${amount}, '${wallet}')">
              <i class="fas fa-check"></i> Confirm Withdrawal
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  async confirmWithdrawal(requestId, userId, amount, wallet) {
    const transactionLink = document.getElementById('transactionLink')?.value.trim();
    
    if (!transactionLink) {
      this.showNotification("Error", "Please enter the transaction link", "error");
      return;
    }

    try {
      const requestRef = this.db.ref(`withdrawals/pending/${requestId}`);
      const snapshot = await requestRef.once('value');
      const request = snapshot.val();
      
      if (!request) {
        this.showNotification("Error", "Request not found", "error");
        return;
      }
      
      const status = 'completed';
      const targetPath = `withdrawals/${status}/${requestId}`;
      
      await this.db.ref(targetPath).set({
        ...request,
        status: status,
        processedAt: Date.now(),
        processedBy: 'admin',
        transactionLink: transactionLink
      });
      
      await requestRef.remove();
      
      await this.sendTelegramNotification(userId, amount, wallet, transactionLink);
      
      this.showNotification("Success", "Withdrawal approved successfully", "success");
      
      document.querySelector('#confirmWithdrawalModal')?.remove();
      this.renderWithdrawals();
      
    } catch (error) {
      console.error("Error confirming withdrawal:", error);
      this.showNotification("Error", "Failed to process withdrawal", "error");
    }
  }

  async sendTelegramNotification(userId, amount, wallet, transactionLink) {
    try {
      const message = `<b>✅ Your Withdrawal Confirmed!\n\n💰 Amount: ${amount.toFixed(5)} TON\n\n💼 Wallet: ${wallet}\n\n📊 Status: Confirmed\n\n🥷 Work hard to earn more!</b>`;
      
      const buttons = [
        [{ text: "View on Explorer 💎", url: transactionLink }],
        [{ text: "Get News 📰", url: "https://t.me/NINJA_TONS" }]
      ];
      
      await this.sendTelegramMessage(userId, message, transactionLink, buttons);
      
    } catch (error) {
      console.error("❌ Error sending Telegram notification:", error);
    }
  }

  async handleWithdrawal(requestId, action) {
    if (action === 'reject') {
      if (!confirm('Are you sure you want to reject this withdrawal?')) return;
      
      try {
        const requestRef = this.db.ref(`withdrawals/pending/${requestId}`);
        const snapshot = await requestRef.once('value');
        const request = snapshot.val();
        
        if (!request) {
          this.showNotification("Error", "Request not found", "error");
          return;
        }
        
        const status = 'rejected';
        const targetPath = `withdrawals/${status}/${requestId}`;
        
        await this.db.ref(targetPath).set({
          ...request,
          status: status,
          processedAt: Date.now(),
          processedBy: 'admin'
        });
        
        await requestRef.remove();
        
        this.showNotification("Success", "Withdrawal rejected successfully", "success");
        this.renderWithdrawals();
        
      } catch (error) {
        console.error("Error rejecting withdrawal:", error);
        this.showNotification("Error", "Failed to reject withdrawal", "error");
      }
    }
  }

  async renderPromoCodes() {
    this.elements.mainContent.innerHTML = `
      <div id="promoCodes" class="page active">
        <div class="promo-codes-management">
          <div class="card">
            <h3><i class="fas fa-plus-circle"></i> Create New Promo Code</h3>
            
            <div class="form-group">
              <label for="promoCode"><i class="fas fa-ticket-alt"></i> Promo Code *</label>
              <input type="text" id="promoCode" placeholder="e.g., NINJA50" style="text-transform: uppercase;" maxlength="20">
              <small>Code will be automatically converted to uppercase</small>
            </div>
            
            <div class="form-group">
              <label for="promoReward"><i class="fas fa-gift"></i> Reward (TON) *</label>
              <input type="number" id="promoReward" placeholder="0.010" value="0.010" min="0.001" step="0.001">
              <small>Amount users will receive when using this code</small>
            </div>
            
            <div class="form-group">
              <label for="promoMaxUses"><i class="fas fa-users"></i> Max Uses (0 = unlimited)</label>
              <input type="number" id="promoMaxUses" placeholder="0" value="0" min="0" step="1">
              <small>Maximum number of times this code can be used</small>
            </div>
            
            <div class="form-group">
              <label for="promoExpiry"><i class="fas fa-calendar-times"></i> Expiry Date (Optional)</label>
              <input type="date" id="promoExpiry">
              <small>Leave empty for no expiration</small>
            </div>
            
            <button class="action-btn btn-success" style="width: 100%;" onclick="admin.createPromoCode()">
              <i class="fas fa-plus-circle"></i> Create Promo Code
            </button>
          </div>
          
          <div class="card" id="promoCodesListContainer">
            <div class="loading">
              <div class="spinner"></div>
              <p>Loading Promo Codes...</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    await this.loadPromoCodesList();
  }

  async loadPromoCodesList() {
    try {
      const promoCodesSnap = await this.db.ref('config/promoCodes').once('value');
      let promoCodesHTML = '<h3><i class="fas fa-list"></i> Active Promo Codes</h3>';
      
      if (promoCodesSnap.exists()) {
        promoCodesHTML += '<div class="promo-codes-list">';
        
        const promoCodesArray = [];
        promoCodesSnap.forEach(child => {
          const promo = child.val();
          if (promo.status !== 'deleted') {
            promoCodesArray.push({
              id: child.key,
              ...promo
            });
          }
        });
        
        promoCodesArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        if (promoCodesArray.length === 0) {
          promoCodesHTML = `
            <div class="empty-state">
              <i class="fas fa-ticket-alt"></i>
              <p>No active promo codes available</p>
              <p class="text-sm">Create your first promo code above</p>
            </div>
          `;
        } else {
          promoCodesArray.forEach(promo => {
            const usedCount = promo.usedCount || 0;
            const maxUses = promo.maxUses || 0;
            const remainingUses = maxUses > 0 ? maxUses - usedCount : '∞';
            const isExpired = promo.expiryDate && Date.now() > promo.expiryDate;
            const isFullyUsed = maxUses > 0 && usedCount >= maxUses;
            
            let status = 'active';
            let statusClass = 'status-active';
            let statusIcon = 'fa-check-circle';
            
            if (isExpired) {
              status = 'expired';
              statusClass = 'status-expired';
              statusIcon = 'fa-calendar-times';
            } else if (isFullyUsed) {
              status = 'used up';
              statusClass = 'status-completed';
              statusIcon = 'fa-users';
            }
            
            const formatDate = (timestamp) => {
              if (!timestamp) return 'N/A';
              const date = new Date(timestamp);
              return date.toLocaleDateString('en-GB');
            };
            
            const expiryDate = promo.expiryDate ? formatDate(promo.expiryDate) : 'No expiry';
            
            promoCodesHTML += `
              <div class="promo-code-item ${isExpired ? 'expired' : ''}">
                <div class="promo-code-header">
                  <div class="promo-code-title">
                    <h4>
                      <i class="fas fa-ticket-alt"></i> 
                      ${promo.code || 'No Code'}
                    </h4>
                    <div class="promo-meta">
                      <span class="promo-status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i> ${status}
                      </span>
                      <span class="promo-reward-badge">
                        <img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm">
                        ${promo.reward || 0.010} TON
                      </span>
                    </div>
                  </div>
                  <div class="promo-code-actions">
                    <button class="action-btn btn-sm btn-info" onclick="admin.copyPromoCode('${promo.code}')">
                      <i class="fas fa-copy"></i> Copy
                    </button>
                    <button class="action-btn btn-sm btn-danger" onclick="admin.deletePromoCode('${promo.id}')">
                      <i class="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
                
                <div class="promo-code-details">
                  <div class="promo-detail">
                    <span class="detail-label"><i class="fas fa-users"></i> Usage:</span>
                    <span>${usedCount} / ${maxUses > 0 ? maxUses : '∞'} used</span>
                  </div>
                  <div class="promo-detail">
                    <span class="detail-label"><i class="fas fa-calendar-alt"></i> Created:</span>
                    <span>${formatDate(promo.createdAt)}</span>
                  </div>
                  <div class="promo-detail">
                    <span class="detail-label"><i class="fas fa-calendar-times"></i> Expires:</span>
                    <span class="${isExpired ? 'text-danger' : ''}">${expiryDate}</span>
                  </div>
                  <div class="promo-detail">
                    <span class="detail-label"><i class="fas fa-gift"></i> Total Distributed:</span>
                    <span class="ton-amount">${(usedCount * (promo.reward || 0)).toFixed(3)} TON</span>
                  </div>
                </div>
                
                <div class="promo-code-progress">
                  <div class="progress-info">
                    <span>${maxUses > 0 ? `Used: ${((usedCount / maxUses) * 100).toFixed(1)}%` : 'Unlimited uses'}</span>
                    <span>${usedCount}/${maxUses > 0 ? maxUses : '∞'}</span>
                  </div>
                  ${maxUses > 0 ? `
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${Math.min((usedCount / maxUses) * 100, 100)}%"></div>
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          });
          
          promoCodesHTML += '</div>';
        }
      } else {
        promoCodesHTML = `
          <div class="empty-state">
            <i class="fas fa-ticket-alt"></i>
            <p>No promo codes created yet</p>
            <p class="text-sm">Create your first promo code above</p>
          </div>
        `;
      }
      
      document.getElementById('promoCodesListContainer').innerHTML = promoCodesHTML;
      
    } catch (error) {
      console.error("Error loading promo codes:", error);
      document.getElementById('promoCodesListContainer').innerHTML = `
        <div class="error-message">
          <h3>Error loading promo codes</h3>
          <p>${error.message}</p>
        </div>
      `;
    }
  }

  async createPromoCode() {
    const codeInput = document.getElementById('promoCode');
    const rewardInput = document.getElementById('promoReward');
    const maxUsesInput = document.getElementById('promoMaxUses');
    const expiryInput = document.getElementById('promoExpiry');
    
    const code = codeInput.value.trim().toUpperCase();
    const reward = parseFloat(rewardInput.value) || 0.010;
    const maxUses = parseInt(maxUsesInput.value) || 0;
    const expiryDate = expiryInput.value ? new Date(expiryInput.value).getTime() : null;
    
    if (!code) {
      this.showNotification("Error", "Please enter a promo code", "error");
      return;
    }
    
    if (reward <= 0) {
      this.showNotification("Error", "Please enter a valid reward amount", "error");
      return;
    }
    
    if (maxUses < 0) {
      this.showNotification("Error", "Max uses cannot be negative", "error");
      return;
    }
    
    if (expiryDate && expiryDate <= Date.now()) {
      this.showNotification("Error", "Expiry date must be in the future", "error");
      return;
    }
    
    try {
      const existingCodesSnap = await this.db.ref('config/promoCodes').once('value');
      let isDuplicate = false;
      
      if (existingCodesSnap.exists()) {
        existingCodesSnap.forEach(child => {
          const existingCode = child.val();
          if (existingCode.code === code && existingCode.status !== 'deleted') {
            isDuplicate = true;
          }
        });
      }
      
      if (isDuplicate) {
        this.showNotification("Error", "Promo code already exists", "error");
        return;
      }
      
      const promoData = {
        code: code,
        reward: reward,
        maxUses: maxUses,
        usedCount: 0,
        status: 'active',
        createdBy: 'admin',
        createdAt: Date.now()
      };
      
      if (expiryDate) {
        promoData.expiryDate = expiryDate;
      }
      
      await this.db.ref('config/promoCodes').push(promoData);
      
      this.showNotification("Success", `Promo code "${code}" created successfully!`, "success");
      
      codeInput.value = '';
      rewardInput.value = '0.010';
      maxUsesInput.value = '0';
      expiryInput.value = '';
      
      await this.loadPromoCodesList();
      
    } catch (error) {
      console.error("Error creating promo code:", error);
      this.showNotification("Error", "Failed to create promo code", "error");
    }
  }

  copyPromoCode(code) {
    navigator.clipboard.writeText(code).then(() => {
      this.showNotification("Copied!", `Promo code "${code}" copied to clipboard`, "success");
    }).catch(err => {
      console.error("Failed to copy:", err);
      this.showNotification("Error", "Failed to copy promo code", "error");
    });
  }

  async deletePromoCode(promoId) {
    if (!confirm('Are you sure you want to delete this promo code?')) return;
    
    try {
      await this.db.ref(`config/promoCodes/${promoId}`).update({
        status: 'deleted',
        deletedAt: Date.now(),
        deletedBy: 'admin'
      });
      
      this.showNotification("Success", "Promo code deleted successfully", "success");
      await this.loadPromoCodesList();
      
    } catch (error) {
      console.error("Error deleting promo code:", error);
      this.showNotification("Error", "Failed to delete promo code", "error");
    }
  }

  async renderBroadcast() {
    this.elements.mainContent.innerHTML = `
      <div id="broadcast" class="page active">
        <div class="broadcast-management">
          <div class="card">
            <h3><i class="fas fa-bullhorn"></i> Send Broadcast Message</h3>
            
            <div class="form-group">
              <label for="broadcastType"><i class="fas fa-broadcast-tower"></i> Broadcast Type</label>
              <select id="broadcastType" onchange="admin.toggleBroadcastTarget()">
                <option value="all">All Users</option>
                <option value="specific">Specific User</option>
              </select>
            </div>
            
            <div id="specificUserField" class="form-group" style="display: none;">
              <label for="broadcastUserId"><i class="fas fa-user"></i> User ID</label>
              <input type="text" id="broadcastUserId" placeholder="Enter Telegram User ID">
              <small>Leave empty to send to all users</small>
            </div>
            
            <div class="form-group">
              <label for="broadcastImage"><i class="fas fa-image"></i> Image URL (Optional)</label>
              <input type="text" id="broadcastImage" placeholder="https://example.com/image.jpg">
              <small>Enter a direct image link</small>
            </div>
            
            <div class="form-group">
              <label for="broadcastMessage"><i class="fas fa-comment-alt"></i> Message *</label>
              <textarea id="broadcastMessage" rows="6" placeholder="Enter your message here..."></textarea>
              <small>Supports HTML formatting</small>
            </div>
            
            <div class="html-helpers">
              <span style="color: var(--text-secondary); font-size: 0.9rem; margin-right: 10px;">Quick HTML Tags:</span>
              <button class="html-tag-btn" onclick="admin.insertHTMLTag('<b>', '</b>')"><b>Bold</b></button>
              <button class="html-tag-btn" onclick="admin.insertHTMLTag('<i>', '</i>')"><i>Italic</i></button>
              <button class="html-tag-btn" onclick="admin.insertHTMLTag('<u>', '</u>')"><u>Underline</u></button>
              <button class="html-tag-btn" onclick="admin.insertHTMLTag('<code>', '</code>')"><code>Code</code></button>
              <button class="html-tag-btn" onclick="admin.insertHTMLTag('<a href=\"URL\">', '</a>')">Link</button>
              <button class="html-tag-btn" onclick="admin.insertHTMLTag('\\n', '')">New Line</button>
            </div>
            
            <div class="form-group">
              <label><i class="fas fa-link"></i> Add Inline Buttons (Optional)</label>
              <div id="broadcastButtons">
                <div class="button-row">
                  <input type="text" class="button-text" placeholder="Button text">
                  <input type="text" class="button-url" placeholder="URL">
                  <button class="action-btn btn-sm btn-danger" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
              <button class="action-btn btn-sm btn-secondary" onclick="admin.addBroadcastButton()" style="margin-top: 10px;">
                <i class="fas fa-plus"></i> Add Button
              </button>
            </div>
            
            <div class="broadcast-preview">
              <h4><i class="fas fa-eye"></i> Preview</h4>
              <div id="broadcastPreview" class="preview-content">
                <div class="preview-placeholder">
                  <i class="fas fa-comment-alt"></i>
                  <p>Your message will appear here</p>
                </div>
              </div>
            </div>
            
            <div class="broadcast-actions">
              <button class="action-btn btn-secondary" onclick="admin.updateBroadcastPreview()">
                <i class="fas fa-sync"></i> Update Preview
              </button>
              <button class="action-btn btn-success" onclick="admin.sendBroadcast()">
                <i class="fas fa-paper-plane"></i> Send Broadcast
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.updateBroadcastPreview();
  }

  insertHTMLTag(startTag, endTag) {
    const textarea = document.getElementById('broadcastMessage');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    if (startTag === '\n') {
      textarea.value = textarea.value.substring(0, start) + '\n' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 1;
    } else if (startTag.includes('href="URL"')) {
      const url = prompt('Enter URL:', 'https://');
      if (url) {
        const linkTag = `<a href="${url}">`;
        textarea.value = textarea.value.substring(0, start) + linkTag + selectedText + endTag + textarea.value.substring(end);
        textarea.selectionStart = start + linkTag.length;
        textarea.selectionEnd = start + linkTag.length + selectedText.length;
      }
    } else {
      textarea.value = textarea.value.substring(0, start) + startTag + selectedText + endTag + textarea.value.substring(end);
      textarea.selectionStart = start + startTag.length;
      textarea.selectionEnd = start + startTag.length + selectedText.length;
    }
    
    textarea.focus();
    this.updateBroadcastPreview();
  }

  toggleBroadcastTarget() {
    const type = document.getElementById('broadcastType').value;
    const specificUserField = document.getElementById('specificUserField');
    specificUserField.style.display = type === 'specific' ? 'block' : 'none';
  }

  addBroadcastButton() {
    const buttonsContainer = document.getElementById('broadcastButtons');
    const buttonRow = document.createElement('div');
    buttonRow.className = 'button-row';
    buttonRow.innerHTML = `
      <input type="text" class="button-text" placeholder="Button text">
      <input type="text" class="button-url" placeholder="URL">
      <button class="action-btn btn-sm btn-danger" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
    buttonsContainer.appendChild(buttonRow);
  }

  updateBroadcastPreview() {
    const message = document.getElementById('broadcastMessage').value;
    const imageUrl = document.getElementById('broadcastImage').value;
    const preview = document.getElementById('broadcastPreview');
    
    let previewHTML = '';
    
    if (imageUrl) {
      previewHTML += `
        <div class="preview-image">
          <img src="${imageUrl}" alt="Preview" onerror="this.style.display='none'">
        </div>
      `;
    }
    
    if (message) {
      previewHTML += `
        <div class="preview-message">
          ${message.replace(/\n/g, '<br>')}
        </div>
      `;
    } else {
      previewHTML = `
        <div class="preview-placeholder">
          <i class="fas fa-comment-alt"></i>
          <p>Your message will appear here</p>
        </div>
      `;
    }
    
    const buttonRows = document.querySelectorAll('#broadcastButtons .button-row');
    if (buttonRows.length > 0) {
      previewHTML += '<div class="preview-buttons">';
      buttonRows.forEach(row => {
        const text = row.querySelector('.button-text').value;
        const url = row.querySelector('.button-url').value;
        if (text && url) {
          previewHTML += `
            <a href="${url}" class="preview-button" target="_blank">
              ${text}
            </a>
          `;
        }
      });
      previewHTML += '</div>';
    }
    
    preview.innerHTML = previewHTML;
  }

  async sendBroadcast() {
    const message = document.getElementById('broadcastMessage').value.trim();
    const imageUrl = document.getElementById('broadcastImage').value.trim();
    const broadcastType = document.getElementById('broadcastType').value;
    const userId = document.getElementById('broadcastUserId')?.value.trim();
    
    if (!message) {
      this.showNotification("Error", "Please enter a message", "error");
      return;
    }
    
    if (broadcastType === 'specific' && !userId) {
      this.showNotification("Error", "Please enter a User ID for specific broadcast", "error");
      return;
    }
    
    const buttons = [];
    document.querySelectorAll('#broadcastButtons .button-row').forEach(row => {
      const text = row.querySelector('.button-text').value.trim();
      const url = row.querySelector('.button-url').value.trim();
      if (text && url) {
        buttons.push({ text, url });
      }
    });
    
    if (!confirm(`Are you sure you want to send this broadcast${broadcastType === 'all' ? ' to ALL users' : ' to specific user'}?`)) {
      return;
    }
    
    try {
      let usersToSend = [];
      
      if (broadcastType === 'all') {
        const usersSnap = await this.db.ref('users').once('value');
        usersSnap.forEach(child => {
          const user = child.val();
          usersToSend.push({
            id: child.key,
            username: user.username
          });
        });
      } else {
        const userSnap = await this.db.ref(`users/${userId}`).once('value');
        if (userSnap.exists()) {
          const user = userSnap.val();
          usersToSend.push({
            id: userId,
            username: user.username
          });
        } else {
          this.showNotification("Error", "User not found", "error");
          return;
        }
      }
      
      this.showBroadcastProgressModal(usersToSend.length);
      
      let sentCount = 0;
      let failedCount = 0;
      let failedUsers = [];
      
      for (const user of usersToSend) {
        try {
          await this.sendTelegramMessage(user.id, message, imageUrl, buttons);
          sentCount++;
          
          this.updateBroadcastProgress(sentCount, failedCount, usersToSend.length, failedUsers);
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Failed to send to user ${user.id}:`, error);
          failedCount++;
          failedUsers.push({
            userId: user.id,
            username: user.username,
            error: error.message || 'Unknown error'
          });
          
          this.updateBroadcastProgress(sentCount, failedCount, usersToSend.length, failedUsers);
        }
      }
      
      setTimeout(() => {
        document.querySelector('#broadcastProgressModal')?.remove();
        this.showNotification(
          "Broadcast Completed", 
          `Success: ${sentCount}, Failed: ${failedCount}`, 
          failedCount === 0 ? "success" : "warning"
        );
      }, 2000);
      
    } catch (error) {
      console.error("Error sending broadcast:", error);
      document.querySelector('#broadcastProgressModal')?.remove();
      this.showNotification("Error", "Failed to send broadcast", "error");
    }
  }

  showBroadcastProgressModal(totalUsers) {
    const modalHTML = `
      <div class="modal-overlay active" id="broadcastProgressModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Sending Broadcast...</h3>
          </div>
          <div class="modal-body">
            <div class="broadcast-progress-container">
              <div class="progress-info-row">
                <div class="progress-stat">
                  <span class="stat-label">Total Users:</span>
                  <span class="stat-value">${totalUsers}</span>
                </div>
                <div class="progress-stat">
                  <span class="stat-label">Sent:</span>
                  <span class="stat-value success" id="sentCount">0</span>
                </div>
                <div class="progress-stat">
                  <span class="stat-label">Failed:</span>
                  <span class="stat-value error" id="failedCount">0</span>
                </div>
              </div>
              
              <div class="progress-bar-container">
                <div class="progress-bar">
                  <div class="progress-fill" id="broadcastProgressFill" style="width: 0%"></div>
                </div>
                <div class="progress-percentage" id="progressPercentage">0%</div>
              </div>
              
              <div class="status-message" id="broadcastStatus">
                Starting broadcast...
              </div>
              
              <div class="failed-users-container" id="failedUsersContainer" style="display: none;">
                <h4>Failed Users:</h4>
                <div class="failed-users-list" id="failedUsersList"></div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="action-btn btn-secondary" onclick="document.querySelector('#broadcastProgressModal').remove()">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  updateBroadcastProgress(sent, failed, total, failedUsers = []) {
    const totalProcessed = sent + failed;
    const percentage = total > 0 ? Math.round((totalProcessed / total) * 100) : 0;
    
    document.getElementById('sentCount').textContent = sent;
    document.getElementById('failedCount').textContent = failed;
    
    const progressFill = document.getElementById('broadcastProgressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    
    if (progressPercentage) {
      progressPercentage.textContent = `${percentage}%`;
    }
    
    const statusElement = document.getElementById('broadcastStatus');
    if (statusElement) {
      if (totalProcessed >= total) {
        statusElement.textContent = `Completed! Sent: ${sent}, Failed: ${failed}`;
        statusElement.className = 'status-message completed';
      } else {
        statusElement.textContent = `Processing... (${totalProcessed}/${total})`;
        statusElement.className = 'status-message processing';
      }
    }
    
    if (failedUsers.length > 0) {
      const container = document.getElementById('failedUsersContainer');
      const list = document.getElementById('failedUsersList');
      
      if (container) container.style.display = 'block';
      if (list) {
        list.innerHTML = '';
        failedUsers.forEach(user => {
          const userElement = document.createElement('div');
          userElement.className = 'failed-user-item';
          userElement.innerHTML = `
            <div class="failed-user-info">
              <span class="user-id">ID: ${user.userId}</span>
              <span class="user-username">@${user.username || 'No username'}</span>
            </div>
            <div class="failed-user-error">${user.error}</div>
          `;
          list.appendChild(userElement);
        });
      }
    }
  }

  async sendTelegramMessage(chatId, message, photo = null, buttons = []) {
    try {
      let url = `https://api.telegram.org/bot${this.botToken}/`;
      let method = 'sendMessage';
      let payload = {
        chat_id: chatId,
        parse_mode: 'HTML'
      };
      
      if (photo) {
        method = 'sendPhoto';
        payload.photo = photo;
        payload.caption = message;
      } else {
        payload.text = message;
      }
      
      if (buttons.length > 0) {
        payload.reply_markup = {
          inline_keyboard: buttons
        };
      }
      
      const response = await fetch(url + method, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.description || 'Failed to send message');
      }
      
      return true;
      
    } catch (error) {
      console.error(`Error sending to ${chatId}:`, error);
      throw error;
    }
  }

  showNotification(title, message, type = 'info') {
    const container = document.querySelector('.notification-container') || this.createNotificationContainer();
    const notificationId = `notification-${Date.now()}`;
    
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <div style="font-size: 1.2rem;">
          ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
        </div>
        <div>
          <div style="font-weight: 600; margin-bottom: 2px;">${title}</div>
          <div style="font-size: 0.9rem; color: var(--text-secondary);">${message}</div>
        </div>
      </div>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
      const notif = document.getElementById(notificationId);
      if (notif) {
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(100%)';
        setTimeout(() => notif.remove(), 300);
      }
    }, 5000);
  }

  createNotificationContainer() {
    const container = document.createElement('div');
    container.className = 'notification-container';
    document.body.appendChild(container);
    return container;
  }

  safeNumber(value) {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }
}

const admin = new AdminPanel();
window.admin = admin;
