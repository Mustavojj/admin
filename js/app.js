const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCt7Jf3Br786BTuVKGBzkSyiZb3j-qA4RI",
  authDomain: "pobozz.firebaseapp.com",
  databaseURL: "https://pobozz-default-rtdb.firebaseio.com",
  projectId: "pobozz",
  storageBucket: "pobozz.firebasestorage.app",
  messagingSenderId: "589658303921",
  appId: "1:589658303921:web:956813637db1e9d5a52190",
  measurementId: "G-SBPY6X7SBC"
};

const BOT_TOKEN = "8007486383:AAHdBVBjGPBVht1MYo6TNqTKU0wtyjhRqmg";
const ADMIN_PASSWORDS = ["Mostafa$500"];
const ADMIN_TELEGRAM_ID = "1891231976";

const DEFAULT_IMAGE_URL = "https://i.ibb.co/xqL5tXyF/file-00000000473871f4b2902b2708daa633.png";

class AdminPanel {
  constructor() {
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    this.botToken = BOT_TOKEN;
    this.adminData = null;
    this.activeBroadcast = null;
    this.broadcastQueue = [];
    this.isBroadcasting = false;
    this.settings = {
      withdrawalMessage: "✅ Your withdrawal has been approved!\n\n💎 Amount: {amount} TON\n💰 Wallet: {wallet}\n🔗 Transaction: {transaction}\n\nThank you for using Pop Buzz!",
      withdrawalImage: "",
      withdrawalButtons: []
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
    this.loadSettings();
    this.loadBroadcastQueue();
  }

  async initializeFirebase() {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      
      this.db = firebase.database();
      this.auth = firebase.auth();
      
      console.log("✅ Firebase initialized successfully");
      
      this.setupEventListeners();
      this.startBroadcastProcessor();
      
    } catch (error) {
      console.error("❌ Firebase initialization error:", error);
      this.showLoginMessage("Failed to initialize Firebase", "error");
    }
  }

  loadSettings() {
    const saved = localStorage.getItem('popbuzz_settings');
    if (saved) {
      try {
        this.settings = JSON.parse(saved);
      } catch(e) {}
    }
  }

  saveSettings() {
    localStorage.setItem('popbuzz_settings', JSON.stringify(this.settings));
  }

  loadBroadcastQueue() {
    const saved = localStorage.getItem('popbuzz_broadcast_queue');
    if (saved) {
      try {
        this.broadcastQueue = JSON.parse(saved);
      } catch(e) {
        this.broadcastQueue = [];
      }
    }
  }

  saveBroadcastQueue() {
    localStorage.setItem('popbuzz_broadcast_queue', JSON.stringify(this.broadcastQueue));
  }

  startBroadcastProcessor() {
    setInterval(() => {
      if (this.broadcastQueue.length > 0 && !this.isBroadcasting) {
        this.processNextBroadcast();
      }
    }, 1000);
  }

  async processNextBroadcast() {
    if (this.broadcastQueue.length === 0 || this.isBroadcasting) return;
    
    this.isBroadcasting = true;
    const broadcastJob = this.broadcastQueue[0];
    
    try {
      await this.executeBroadcast(broadcastJob);
      this.broadcastQueue.shift();
      this.saveBroadcastQueue();
      
      if (broadcastJob.onComplete) {
        broadcastJob.onComplete(true);
      }
    } catch (error) {
      console.error("Broadcast failed:", error);
      if (broadcastJob.onComplete) {
        broadcastJob.onComplete(false, error);
      }
    } finally {
      this.isBroadcasting = false;
      if (this.broadcastQueue.length > 0) {
        this.processNextBroadcast();
      }
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
      case 'settings':
        await this.renderSettings();
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
      'dashboard': 'Dashboard',
      'users': 'Users Management',
      'tasks': 'Tasks Management',
      'promoCodes': 'Promo Codes',
      'withdrawals': 'Withdrawals',
      'broadcast': 'Broadcast',
      'settings': 'Settings',
      'myUid': 'My UID'
    };
    return titles[pageName] || 'Dashboard';
  }

  async renderDashboard() {
    this.elements.contentArea.innerHTML = `
      <div class="dashboard-page">
        <div class="page-header">
          <h2><i class="fas fa-chart-pie"></i> Dashboard Overview</h2>
          <p>Welcome back, Administrator</p>
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
                  <i class="fas fa-users"></i>
                  <h3>Users Statistics</h3>
                </div>
                <div class="stat-card-body">
                  <div class="stat-item">
                    <span class="stat-label">Total Users</span>
                    <span class="stat-value" id="totalUsers">0</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Today Users</span>
                    <span class="stat-value" id="todayUsers">0</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Banned Users</span>
                    <span class="stat-value" id="bannedUsers">0</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Active Users</span>
                    <span class="stat-value" id="activeUsers">0</span>
                  </div>
                </div>
              </div>
              
              <div class="stat-card">
                <div class="stat-card-header">
                  <i class="fas fa-money-bill-wave"></i>
                  <h3>Withdrawals Statistics</h3>
                </div>
                <div class="stat-card-body">
                  <div class="stat-item">
                    <span class="stat-label">Total Withdrawals</span>
                    <span class="stat-value" id="totalWithdrawals">0</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Today Withdrawals</span>
                    <span class="stat-value" id="todayWithdrawals">0</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Pending Withdrawals</span>
                    <span class="stat-value" id="pendingWithdrawals">0</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Confirmed Withdrawals</span>
                    <span class="stat-value" id="confirmedWithdrawals">0</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="stats-row">
              <div class="stat-card">
                <div class="stat-card-header">
                  <i class="fas fa-list-check"></i>
                  <h3>Tasks Statistics</h3>
                </div>
                <div class="stat-card-body">
                  <div class="stat-item">
                    <span class="stat-label">Total Tasks</span>
                    <span class="stat-value" id="totalTasks">0</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Main Tasks</span>
                    <span class="stat-value" id="mainTasks">0</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Partner Tasks</span>
                    <span class="stat-value" id="partnerTasks">0</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Completed Tasks</span>
                    <span class="stat-value" id="completedTasks">0</span>
                  </div>
                </div>
              </div>
              
              <div class="stat-card">
                <div class="stat-card-header">
                  <i class="fas fa-chart-line"></i>
                  <h3>Financial Statistics</h3>
                </div>
                <div class="stat-card-body">
                  <div class="stat-item">
                    <span class="stat-label">Total Distributed</span>
                    <span class="stat-value" id="totalDistributed">0 TON</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Total Balance</span>
                    <span class="stat-value" id="totalBalance">0 TON</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Total POP Balance</span>
                    <span class="stat-value" id="totalPopBalance">0 POP</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Referral Earnings</span>
                    <span class="stat-value" id="referralEarnings">0 TON</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Task Earnings</span>
                    <span class="stat-value" id="taskEarnings">0 TON</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="quick-actions">
            <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
            <div class="actions-grid">
              <button class="quick-btn" onclick="admin.showPage('users')">
                <i class="fas fa-user-search"></i>
                <span>Search User</span>
              </button>
              <button class="quick-btn" onclick="admin.showPage('tasks')">
                <i class="fas fa-plus-circle"></i>
                <span>Create Task</span>
              </button>
              <button class="quick-btn" onclick="admin.showPage('promoCodes')">
                <i class="fas fa-ticket"></i>
                <span>Add Promo Code</span>
              </button>
              <button class="quick-btn" onclick="admin.showPage('withdrawals')">
                <i class="fas fa-wallet"></i>
                <span>Process Withdrawal</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    try {
      const today = new Date().setHours(0, 0, 0, 0);
      
      const [usersSnap, tasksSnap, withdrawalsSnap] = await Promise.all([
        this.db.ref('users').once('value'),
        this.db.ref('config/tasks').once('value'),
        this.db.ref('withdrawals').once('value')
      ]);
      
      let totalUsers = 0;
      let todayUsers = 0;
      let bannedUsers = 0;
      let activeUsers = 0;
      let totalBalance = 0;
      let totalPopBalance = 0;
      let totalEarned = 0;
      let referralEarnings = 0;
      let taskEarnings = 0;
      
      usersSnap.forEach(child => {
        const user = child.val();
        totalUsers++;
        
        if (user.createdAt && user.createdAt >= today) {
          todayUsers++;
        }
        
        if (user.status === 'ban') {
          bannedUsers++;
        } else {
          activeUsers++;
        }
        
        totalBalance += this.safeNumber(user.balance);
        totalPopBalance += this.safeNumber(user.pop);
        totalEarned += this.safeNumber(user.totalEarned);
        referralEarnings += this.safeNumber(user.referralEarnings);
      });
      
      taskEarnings = totalEarned - referralEarnings;
      
      let totalTasks = 0;
      let mainTasks = 0;
      let partnerTasks = 0;
      let completedTasks = 0;
      
      if (tasksSnap.exists()) {
        tasksSnap.forEach(child => {
          const task = child.val();
          if (task.status !== 'deleted') {
            totalTasks++;
            
            const category = task.category;
            if (category === 'main') {
              mainTasks++;
            } else if (category === 'partner') {
              partnerTasks++;
            }
            
            if (task.currentCompletions >= task.maxCompletions) {
              completedTasks++;
            }
          }
        });
      }
      
      let totalWithdrawals = 0;
      let todayWithdrawals = 0;
      let pendingWithdrawals = 0;
      let confirmedWithdrawals = 0;
      let totalDistributed = 0;
      
      if (withdrawalsSnap.exists()) {
        const withdrawals = withdrawalsSnap.val();
        
        if (withdrawals.pending) {
          pendingWithdrawals = Object.keys(withdrawals.pending).length;
          totalWithdrawals += pendingWithdrawals;
        }
        
        if (withdrawals.completed) {
          confirmedWithdrawals = Object.keys(withdrawals.completed).length;
          totalWithdrawals += confirmedWithdrawals;
          
          Object.values(withdrawals.completed).forEach(w => {
            totalDistributed += this.safeNumber(w.amount);
            if (w.createdAt && w.createdAt >= today) {
              todayWithdrawals++;
            }
          });
        }
        
        if (withdrawals.rejected) {
          totalWithdrawals += Object.keys(withdrawals.rejected).length;
        }
      }
      
      document.getElementById('dashboardLoading').style.display = 'none';
      document.getElementById('dashboardContent').style.display = 'block';
      
      const updateElement = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      };
      
      updateElement('totalUsers', totalUsers);
      updateElement('todayUsers', todayUsers);
      updateElement('bannedUsers', bannedUsers);
      updateElement('activeUsers', activeUsers);
      updateElement('totalWithdrawals', totalWithdrawals);
      updateElement('todayWithdrawals', todayWithdrawals);
      updateElement('pendingWithdrawals', pendingWithdrawals);
      updateElement('confirmedWithdrawals', confirmedWithdrawals);
      updateElement('totalTasks', totalTasks);
      updateElement('mainTasks', mainTasks);
      updateElement('partnerTasks', partnerTasks);
      updateElement('completedTasks', completedTasks);
      updateElement('totalDistributed', totalDistributed.toFixed(3) + ' TON');
      updateElement('totalBalance', totalBalance.toFixed(3) + ' TON');
      updateElement('totalPopBalance', Math.floor(totalPopBalance) + ' POP');
      updateElement('referralEarnings', referralEarnings.toFixed(3) + ' TON');
      updateElement('taskEarnings', taskEarnings.toFixed(3) + ' TON');
      
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      document.getElementById('dashboardLoading').innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error loading dashboard data</p>
          <p class="error-detail">${error.message}</p>
        </div>
      `;
    }
  }

  async renderUsers() {
    this.elements.contentArea.innerHTML = `
      <div class="users-page">
        <div class="page-header">
          <h2><i class="fas fa-users"></i> Users Management</h2>
          <p>Search for users and manage their accounts</p>
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
            <p>Search for a user by ID, username, or Telegram ID</p>
            <p class="hint">Search examples: "123456789", "username", "User Name"</p>
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
      const usersSnap = await this.db.ref('users').once('value');
      const results = [];
      
      usersSnap.forEach(child => {
        const user = child.val();
        const userId = child.key;
        const username = user.username || '';
        const firstName = user.firstName || '';
        const telegramId = user.telegramId || '';
        
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
            <p class="hint">Try searching by different criteria</p>
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
        <p>Search for a user by ID, username, or Telegram ID</p>
        <p class="hint">Search examples: "123456789", "username", "User Name"</p>
      </div>
    `;
  }

  displayUsers(users) {
    const container = document.getElementById('userResults');
    
    if (users.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <p>No users found</p>
        </div>
      `;
      return;
    }
    
    let html = '<div class="users-list">';
    
    users.forEach(user => {
      const balance = this.safeNumber(user.balance);
      const popBalance = this.safeNumber(user.pop);
      const referrals = this.safeNumber(user.referrals || 0);
      const tasks = this.safeNumber(user.totalTasksCompleted || 0);
      const totalPromoCodes = this.safeNumber(user.totalPromoCodes || 0);
      const referralEarnings = this.safeNumber(user.referralEarnings || 0);
      const totalEarned = this.safeNumber(user.totalEarned || 0);
      const status = user.status || 'free';
      const username = user.username || '';
      const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
      const firstName = user.firstName || 'User';
      const joinedAt = user.createdAt ? this.formatDateTime(user.createdAt) : 'N/A';
      const lastActive = user.lastActive ? this.formatDateTime(user.lastActive) : 'N/A';
      const telegramProfileUrl = cleanUsername ? `https://t.me/${cleanUsername}` : '#';
      
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
                ${status === 'ban' ? 'BANNED' : 'ACTIVE'}
              </div>
            </div>
          </div>
          
          <div class="user-stats-grid">
            <div class="user-stat-item">
              <i class="fas fa-calendar-plus"></i>
              <div class="user-stat-info">
                <div class="user-stat-label">Joined at</div>
                <div class="user-stat-value">${joinedAt}</div>
              </div>
            </div>
            <div class="user-stat-item">
              <i class="fas fa-clock"></i>
              <div class="user-stat-info">
                <div class="user-stat-label">Last Active</div>
                <div class="user-stat-value">${lastActive}</div>
              </div>
            </div>
            <div class="user-stat-item">
              <i class="fas fa-coins"></i>
              <div class="user-stat-info">
                <div class="user-stat-label">TON Balance</div>
                <div class="user-stat-value">${balance.toFixed(3)} TON</div>
              </div>
            </div>
            <div class="user-stat-item">
              <i class="fas fa-star"></i>
              <div class="user-stat-info">
                <div class="user-stat-label">POP Balance</div>
                <div class="user-stat-value">${Math.floor(popBalance)} POP</div>
              </div>
            </div>
            <div class="user-stat-item">
              <i class="fas fa-users"></i>
              <div class="user-stat-info">
                <div class="user-stat-label">Total Referrals</div>
                <div class="user-stat-value">${referrals}</div>
              </div>
            </div>
            <div class="user-stat-item">
              <i class="fas fa-tasks"></i>
              <div class="user-stat-info">
                <div class="user-stat-label">Tasks Completed</div>
                <div class="user-stat-value">${tasks}</div>
              </div>
            </div>
            <div class="user-stat-item">
              <i class="fas fa-ticket"></i>
              <div class="user-stat-info">
                <div class="user-stat-label">Promo Codes Used</div>
                <div class="user-stat-value">${totalPromoCodes}</div>
              </div>
            </div>
            <div class="user-stat-item">
              <i class="fas fa-chart-line"></i>
              <div class="user-stat-info">
                <div class="user-stat-label">Referral Earnings</div>
                <div class="user-stat-value">${referralEarnings.toFixed(3)} TON</div>
              </div>
            </div>
            <div class="user-stat-item">
              <i class="fas fa-wallet"></i>
              <div class="user-stat-info">
                <div class="user-stat-label">Total Earnings</div>
                <div class="user-stat-value">${totalEarned.toFixed(3)} TON</div>
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
              <button class="action-btn btn-warning" onclick="admin.showAddPopModal('${user.id}', '${cleanUsername || firstName}')">
                <i class="fas fa-plus"></i> Add POP
              </button>
              <button class="action-btn btn-danger" onclick="admin.showRemovePopModal('${user.id}', '${cleanUsername || firstName}')">
                <i class="fas fa-minus"></i> Remove POP
              </button>
            </div>
            <div class="ban-buttons">
              <button class="action-btn btn-info" onclick="window.open('${telegramProfileUrl}', '_blank')">
                <i class="fas fa-eye"></i> VIEW
              </button>
              ${status === 'free' ? 
                `<button class="action-btn btn-danger" onclick="admin.banUser('${user.id}', this)">
                  <i class="fas fa-ban"></i> BAN
                </button>` : 
                `<button class="action-btn btn-success" onclick="admin.unbanUser('${user.id}', this)">
                  <i class="fas fa-check"></i> UNBAN
                </button>`
              }
              <button class="action-btn btn-info" onclick="admin.getUserReferrals('${user.id}', '${cleanUsername || firstName}')">
                <i class="fas fa-users"></i> Get Referrals
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
  }

  async getUserReferrals(userId, userName) {
    try {
      const referralsRef = await this.db.ref(`referrals/${userId}`).once('value');
      const referrals = [];
      
      if (referralsRef.exists()) {
        referralsRef.forEach(child => {
          const referral = child.val();
          referrals.push({
            id: child.key,
            ...referral
          });
        });
      }
      
      referrals.sort((a, b) => (b.joinedAt || 0) - (a.joinedAt || 0));
      const recentReferrals = referrals.slice(0, 10);
      
      let message = `<b>👥 Referrals of ${userName}</b>\n\n`;
      
      if (recentReferrals.length === 0) {
        message += "No referrals found for this user.";
      } else {
        message += `📊 Total Referrals: ${referrals.length}\n📋 Last 10 Referrals:\n\n`;
        
        recentReferrals.forEach((ref, index) => {
          const joinedDate = ref.joinedAt ? this.formatDateTime(ref.joinedAt) : 'N/A';
          message += `${index + 1}. <b>${ref.firstName || 'User'}</b>\n`;
          message += `   🆔 ID: ${ref.userId || ref.id}\n`;
          if (ref.username) message += `   👤 Username: ${ref.username}\n`;
          message += `   📅 Joined: ${joinedDate}\n`;
          message += `   📌 Status: ${ref.state === 'verified' ? '✅ Verified' : '⏳ Pending'}\n\n`;
        });
      }
      
      await this.sendTelegramMessage(ADMIN_TELEGRAM_ID, message);
      this.showNotification("Success", "Referrals list sent to admin", "success");
      
    } catch (error) {
      console.error("Error getting referrals:", error);
      this.showNotification("Error", "Failed to get referrals", "error");
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
          <p>Remove TON balance from user:</p>
          <div class="user-info-modal">
            <strong>${userName}</strong>
          </div>
          <div class="form-group">
            <label>Amount to Remove (TON)</label>
            <input type="number" id="removeBalanceAmount" placeholder="0.100" step="0.001" min="0.001" value="0.100">
          </div>
          <div class="form-group">
            <label>Reason (Optional)</label>
            <input type="text" id="removeBalanceReason" placeholder="Admin removed balance">
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="action-btn btn-danger" onclick="admin.removeBalance('${userId}')">
            <i class="fas fa-check"></i> Remove Balance
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
  }

  async removeBalance(userId) {
    const amount = parseFloat(document.getElementById('removeBalanceAmount').value);
    const reason = document.getElementById('removeBalanceReason').value.trim() || 'Admin removed balance';

    if (!amount || amount <= 0) {
      this.showNotification("Error", "Please enter a valid amount", "error");
      return;
    }

    try {
      const userRef = this.db.ref(`users/${userId}`);
      const snapshot = await userRef.once('value');
      
      if (!snapshot.exists()) {
        this.showNotification("Error", "User not found", "error");
        return;
      }

      const user = snapshot.val();
      const currentBalance = this.safeNumber(user.balance);
      
      if (currentBalance < amount) {
        this.showNotification("Error", "Insufficient balance", "error");
        return;
      }
      
      const newBalance = currentBalance - amount;

      await userRef.update({
        balance: newBalance
      });

      this.showNotification("Success", `Removed ${amount} TON from user`, "success");
      
      document.querySelector('.modal-overlay.show')?.remove();
      await this.searchUser();
      
    } catch (error) {
      console.error("Error removing balance:", error);
      this.showNotification("Error", "Failed to remove balance", "error");
    }
  }

  showRemovePopModal(userId, userName) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-minus-circle"></i> Remove POP Balance</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p>Remove POP balance from user:</p>
          <div class="user-info-modal">
            <strong>${userName}</strong>
          </div>
          <div class="form-group">
            <label>Amount to Remove (POP)</label>
            <input type="number" id="removePopAmount" placeholder="100" step="1" min="1" value="100">
          </div>
          <div class="form-group">
            <label>Reason (Optional)</label>
            <input type="text" id="removePopReason" placeholder="Admin removed POP">
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="action-btn btn-danger" onclick="admin.removePopBalance('${userId}')">
            <i class="fas fa-check"></i> Remove POP
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
  }

  async removePopBalance(userId) {
    const amount = parseInt(document.getElementById('removePopAmount').value);
    const reason = document.getElementById('removePopReason').value.trim() || 'Admin removed POP';

    if (!amount || amount <= 0) {
      this.showNotification("Error", "Please enter a valid amount", "error");
      return;
    }

    try {
      const userRef = this.db.ref(`users/${userId}`);
      const snapshot = await userRef.once('value');
      
      if (!snapshot.exists()) {
        this.showNotification("Error", "User not found", "error");
        return;
      }

      const user = snapshot.val();
      const currentPop = this.safeNumber(user.pop);
      
      if (currentPop < amount) {
        this.showNotification("Error", "Insufficient POP balance", "error");
        return;
      }
      
      const newPop = currentPop - amount;

      await userRef.update({
        pop: newPop
      });

      this.showNotification("Success", `Removed ${amount} POP from user`, "success");
      
      document.querySelector('.modal-overlay.show')?.remove();
      await this.searchUser();
      
    } catch (error) {
      console.error("Error removing POP:", error);
      this.showNotification("Error", "Failed to remove POP", "error");
    }
  }

  showAddPopModal(userId, userName) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-star"></i> Add POP Balance</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p>Add POP balance to user:</p>
          <div class="user-info-modal">
            <strong>${userName}</strong>
          </div>
          <div class="form-group">
            <label>Amount (POP)</label>
            <input type="number" id="addPopAmount" placeholder="100" step="1" min="1" value="100">
          </div>
          <div class="form-group">
            <label>Reason (Optional)</label>
            <input type="text" id="addPopReason" placeholder="Admin added POP">
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="action-btn btn-warning" onclick="admin.addPopBalance('${userId}')">
            <i class="fas fa-check"></i> Add POP
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
  }

  async addPopBalance(userId) {
    const amount = parseInt(document.getElementById('addPopAmount').value);
    const reason = document.getElementById('addPopReason').value.trim() || 'Admin added POP';

    if (!amount || amount <= 0) {
      this.showNotification("Error", "Please enter a valid amount", "error");
      return;
    }

    try {
      const userRef = this.db.ref(`users/${userId}`);
      const snapshot = await userRef.once('value');
      
      if (!snapshot.exists()) {
        this.showNotification("Error", "User not found", "error");
        return;
      }

      const user = snapshot.val();
      const currentPop = this.safeNumber(user.pop);
      const newPop = currentPop + amount;

      await userRef.update({
        pop: newPop
      });

      this.showNotification("Success", `Added ${amount} POP to user`, "success");
      
      document.querySelector('.modal-overlay.show')?.remove();
      await this.searchUser();
      
    } catch (error) {
      console.error("Error adding POP:", error);
      this.showNotification("Error", "Failed to add POP", "error");
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
          <p>Add TON balance to user:</p>
          <div class="user-info-modal">
            <strong>${userName}</strong>
          </div>
          <div class="form-group">
            <label>Amount (TON)</label>
            <input type="number" id="addBalanceAmount" placeholder="0.100" step="0.001" min="0.001" value="0.100">
          </div>
          <div class="form-group">
            <label>Reason (Optional)</label>
            <input type="text" id="addBalanceReason" placeholder="Admin added balance">
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="action-btn btn-success" onclick="admin.addBalance('${userId}')">
            <i class="fas fa-check"></i> Add Balance
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
  }

  async addBalance(userId) {
    const amount = parseFloat(document.getElementById('addBalanceAmount').value);
    const reason = document.getElementById('addBalanceReason').value.trim() || 'Admin added balance';

    if (!amount || amount <= 0) {
      this.showNotification("Error", "Please enter a valid amount", "error");
      return;
    }

    try {
      const userRef = this.db.ref(`users/${userId}`);
      const snapshot = await userRef.once('value');
      
      if (!snapshot.exists()) {
        this.showNotification("Error", "User not found", "error");
        return;
      }

      const user = snapshot.val();
      const currentBalance = this.safeNumber(user.balance);
      const newBalance = currentBalance + amount;

      await userRef.update({
        balance: newBalance,
        totalEarned: this.safeNumber(user.totalEarned) + amount
      });

      this.showNotification("Success", `Added ${amount} TON to user`, "success");
      
      document.querySelector('.modal-overlay.show')?.remove();
      await this.searchUser();
      
    } catch (error) {
      console.error("Error adding balance:", error);
      this.showNotification("Error", "Failed to add balance", "error");
    }
  }

  async banUser(userId, button) {
    if (!confirm('Are you sure you want to ban this user?')) return;

    try {
      await this.db.ref(`users/${userId}/status`).set('ban');
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
      await this.db.ref(`users/${userId}/status`).set('free');
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
          <p>Create and manage Main & Partner tasks</p>
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
                <input type="text" id="taskName" placeholder="Join our channel" maxlength="15">
                <small>Maximum 15 characters</small>
              </div>
              
              <div class="form-group">
                <label>Task Link (URL) *</label>
                <input type="text" id="taskLink" placeholder="https://t.me/... or @username">
              </div>
              
              <div class="form-group">
                <label>Task Image URL (Optional)</label>
                <input type="text" id="taskImage" placeholder="https://example.com/image.jpg">
                <small>Leave empty for default image</small>
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
                <label>Task Reward (TON) *</label>
                <input type="number" id="taskReward" step="0.001" min="0.001" value="0.02">
                <small>Main task default: 0.02 TON | Partner task default: 0.01 TON</small>
              </div>
              
              <div class="form-group">
                <label>Max Completions *</label>
                <input type="number" id="taskMaxCompletions" value="100" min="1">
              </div>
              
              <div class="form-group">
                <label>Verification Required</label>
                <select id="taskVerification">
                  <option value="NO">No verification</option>
                  <option value="YES">Yes (bot must be admin)</option>
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
    await this.loadTasks();
  }

  setupTaskTypeButtons() {
    const buttons = document.querySelectorAll('.type-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const taskType = btn.dataset.type;
        const rewardInput = document.getElementById('taskReward');
        if (taskType === 'main') {
          rewardInput.value = '0.02';
        } else if (taskType === 'partner') {
          rewardInput.value = '0.01';
        }
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
      const tasksSnap = await this.db.ref('config/tasks').once('value');
      const tasks = [];
      
      if (tasksSnap.exists()) {
        tasksSnap.forEach(child => {
          const task = child.val();
          if (task.status !== 'deleted' && task.name.toLowerCase().includes(searchTerm)) {
            tasks.push({
              id: child.key,
              ...task
            });
          }
        });
      }
      
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
      const tasksSnap = await this.db.ref('config/tasks').once('value');
      const tasks = [];
      
      if (tasksSnap.exists()) {
        tasksSnap.forEach(child => {
          const task = child.val();
          if (task.status !== 'deleted') {
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
      const progress = task.maxCompletions > 0 ? 
        (task.currentCompletions || 0) / task.maxCompletions * 100 : 0;
      
      let typeClass = 'type-main';
      let typeText = 'Main';
      
      switch(task.category) {
        case 'main':
          typeClass = 'type-main';
          typeText = 'Main';
          break;
        case 'partner':
          typeClass = 'type-partner';
          typeText = 'Partner';
          break;
      }
      
      const isCompleted = progress >= 100;
      const imageUrl = task.picture || DEFAULT_IMAGE_URL;
      const createdDate = task.createdAt ? this.formatDateTime(task.createdAt) : 'N/A';
      const verificationIcon = task.verification === 'YES' ? '🔒' : '🔓';
      const reward = this.safeNumber(task.reward || (task.category === 'main' ? 0.02 : 0.01));
      
      html += `
        <div class="task-item ${isCompleted ? 'completed' : ''}">
          <div class="task-image-container">
            <img src="${imageUrl}" 
                 alt="${task.name}" 
                 class="task-image"
                 onerror="this.src='${DEFAULT_IMAGE_URL}'">
          </div>
          
          <div class="task-header">
            <h4>${task.name} ${verificationIcon}</h4>
            <div class="task-meta">
              <span class="task-type ${typeClass}">${typeText}</span>
              <span class="task-reward">💰 ${reward.toFixed(3)} TON</span>
              <span class="task-status ${isCompleted ? 'status-completed' : 'status-active'}">
                ${isCompleted ? 'COMPLETED' : 'ACTIVE'}
              </span>
            </div>
          </div>
          
          <div class="task-url">
            <i class="fas fa-link"></i>
            <a href="${task.url}" target="_blank">${task.url.substring(0, 40)}${task.url.length > 40 ? '...' : ''}</a>
          </div>
          
          <div class="task-progress">
            <div class="progress-info">
              <span>Completions: ${task.currentCompletions || 0}/${task.maxCompletions}</span>
              <span>${progress.toFixed(1)}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
          </div>
          
          <div class="task-actions">
            <button class="action-btn btn-primary" onclick="admin.showEditTaskModal('${task.id}', ${task.maxCompletions}, ${reward})">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="action-btn btn-danger" onclick="admin.deleteTask('${task.id}')">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }

  showEditTaskModal(taskId, currentMaxCompletions, currentReward) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-edit"></i> Edit Task</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Max Completions *</label>
            <input type="number" id="editMaxCompletions" value="${currentMaxCompletions}" min="1" step="1">
            <small>Current: ${currentMaxCompletions} completions</small>
          </div>
          <div class="form-group">
            <label>Reward (TON) *</label>
            <input type="number" id="editReward" step="0.001" min="0.001" value="${currentReward.toFixed(3)}">
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="action-btn btn-primary" onclick="admin.updateTask('${taskId}')">
            <i class="fas fa-check"></i> Update
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
  }

  async updateTask(taskId) {
    const newMaxCompletions = parseInt(document.getElementById('editMaxCompletions').value);
    const newReward = parseFloat(document.getElementById('editReward').value);
    
    if (!newMaxCompletions || newMaxCompletions < 1) {
      this.showNotification("Error", "Please enter a valid max completions number", "error");
      return;
    }
    
    if (!newReward || newReward < 0.001) {
      this.showNotification("Error", "Please enter a valid reward amount", "error");
      return;
    }

    try {
      await this.db.ref(`config/tasks/${taskId}`).update({
        maxCompletions: newMaxCompletions,
        reward: newReward
      });
      
      this.showNotification("Success", "Task updated successfully", "success");
      
      document.querySelector('.modal-overlay.show')?.remove();
      await this.loadTasks();
      
    } catch (error) {
      console.error("Error updating task:", error);
      this.showNotification("Error", "Failed to update task", "error");
    }
  }

  async createTask() {
    const name = document.getElementById('taskName').value.trim();
    const image = document.getElementById('taskImage').value.trim();
    const link = document.getElementById('taskLink').value.trim();
    const maxCompletions = parseInt(document.getElementById('taskMaxCompletions').value) || 100;
    const reward = parseFloat(document.getElementById('taskReward').value) || 0;
    const typeBtn = document.querySelector('.type-btn.active');
    const type = typeBtn ? typeBtn.dataset.type : 'main';
    const verification = document.getElementById('taskVerification').value;
    
    if (!name || !link) {
      this.showNotification("Error", "Please fill all required fields", "error");
      return;
    }
    
    if (name.length > 15) {
      this.showNotification("Error", "Task name must be 15 characters or less", "error");
      return;
    }
    
    if (maxCompletions <= 0) {
      this.showNotification("Error", "Max completions must be positive", "error");
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
      
      const taskData = {
        name: name,
        url: formattedLink,
        category: type,
        reward: reward,
        popReward: 1,
        maxCompletions: maxCompletions,
        currentCompletions: 0,
        status: 'active',
        verification: verification,
        createdBy: 'admin',
        createdAt: Date.now()
      };
      
      if (image) {
        taskData.picture = image;
      } else {
        taskData.picture = DEFAULT_IMAGE_URL;
      }
      
      await this.db.ref('config/tasks').push(taskData);
      
      document.getElementById('taskName').value = '';
      document.getElementById('taskImage').value = '';
      document.getElementById('taskLink').value = '';
      document.getElementById('taskReward').value = type === 'main' ? '0.02' : '0.01';
      
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
      await this.db.ref(`config/tasks/${taskId}`).update({
        status: 'deleted',
        deletedAt: Date.now()
      });
      
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
          <p>Create and manage promo codes</p>
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
                  <button class="reward-type-btn active" data-type="ton">
                    <i class="fas fa-coins"></i> TON
                  </button>
                  <button class="reward-type-btn" data-type="pop">
                    <i class="fas fa-star"></i> POP
                  </button>
                </div>
              </div>
              
              <div class="form-group">
                <label>Reward Amount *</label>
                <input type="number" id="promoReward" step="0.001" min="0.001" placeholder="Enter amount...">
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
      const promoCodesSnap = await this.db.ref('config/promoCodes').once('value');
      const promoCodes = [];
      
      if (promoCodesSnap.exists()) {
        promoCodesSnap.forEach(child => {
          const promo = child.val();
          promoCodes.push({
            id: child.key,
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
          <p>Create your first promo code above</p>
        </div>
      `;
      return;
    }
    
    promoCodes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    let html = '';
    
    promoCodes.forEach(promo => {
      const used = promo.usedCount || 0;
      const max = promo.maxUses || 0;
      const remaining = max > 0 ? max - used : '∞';
      const isFullyUsed = max > 0 && used >= max;
      const createdDate = promo.createdAt ? this.formatDateTime(promo.createdAt) : 'N/A';
      const totalDistributed = used * (promo.reward || 0);
      const rewardType = promo.rewardType || 'ton';
      const rewardSymbol = rewardType === 'ton' ? 'TON' : 'POP';
      
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
                  <i class="fas fa-gem"></i> ${promo.reward || 0} ${rewardSymbol}
                </span>
              </div>
            </div>
            <div class="promo-actions">
              <button class="action-btn btn-primary" onclick="admin.copyPromoCode('${promo.code}')">
                <i class="fas fa-copy"></i> Copy
              </button>
              <button class="action-btn btn-danger" onclick="admin.deletePromoCodePermanently('${promo.id}')">
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
              <span>Total Distributed:</span>
              <span>${totalDistributed.toFixed(3)} ${rewardSymbol}</span>
            </div>
            <div class="detail">
              <span>Created:</span>
              <span>${createdDate}</span>
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
    const rewardType = rewardTypeBtn ? rewardTypeBtn.dataset.type : 'ton';
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
    
    if (maxUses < 0) {
      this.showNotification("Error", "Max uses cannot be negative", "error");
      return;
    }
    
    try {
      const existingSnap = await this.db.ref('config/promoCodes').orderByChild('code').equalTo(code).once('value');
      if (existingSnap.exists()) {
        this.showNotification("Error", "Promo code already exists", "error");
        return;
      }
      
      const promoData = {
        code: code,
        rewardType: rewardType,
        reward: reward,
        maxUses: maxUses,
        usedCount: 0,
        status: 'active',
        createdBy: 'admin',
        createdAt: Date.now()
      };
      
      await this.db.ref('config/promoCodes').push(promoData);
      
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

  async deletePromoCodePermanently(promoId) {
    if (!confirm('Are you sure you want to permanently delete this promo code?')) return;
    
    try {
      await this.db.ref(`config/promoCodes/${promoId}`).remove();
      
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
          <p>Process and manage withdrawal requests</p>
        </div>
        
        <div class="search-section">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" id="searchWithdrawalUser" placeholder="Search by Telegram ID">
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
        
        <div id="userWithdrawalsResults" class="user-withdrawals-section" style="display: none;">
        </div>
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
      const userSnap = await this.db.ref(`users`).orderByChild('telegramId').equalTo(userId).once('value');
      let actualUserId = null;
      
      if (!userSnap.exists()) {
        this.showNotification("Error", "User not found", "error");
        return;
      }
      
      userSnap.forEach(child => {
        actualUserId = child.key;
      });
      
      if (!actualUserId) {
        this.showNotification("Error", "User not found", "error");
        return;
      }
      
      const [pendingSnap, completedSnap, rejectedSnap] = await Promise.all([
        this.db.ref('withdrawals/pending').orderByChild('userId').equalTo(actualUserId).once('value'),
        this.db.ref('withdrawals/completed').orderByChild('userId').equalTo(actualUserId).once('value'),
        this.db.ref('withdrawals/rejected').orderByChild('userId').equalTo(actualUserId).once('value')
      ]);
      
      const userDataSnap = await this.db.ref(`users/${actualUserId}`).once('value');
      const userData = userDataSnap.val();
      
      const userName = userData.firstName || userData.username || actualUserId;
      const username = userData.username || '';
      const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
      
      let allWithdrawals = [];
      
      if (pendingSnap.exists()) {
        pendingSnap.forEach(child => {
          allWithdrawals.push({
            ...child.val(),
            id: child.key,
            status: 'pending'
          });
        });
      }
      
      if (completedSnap.exists()) {
        completedSnap.forEach(child => {
          allWithdrawals.push({
            ...child.val(),
            id: child.key,
            status: 'completed'
          });
        });
      }
      
      if (rejectedSnap.exists()) {
        rejectedSnap.forEach(child => {
          allWithdrawals.push({
            ...child.val(),
            id: child.key,
            status: 'rejected'
          });
        });
      }
      
      if (allWithdrawals.length === 0) {
        document.getElementById('userWithdrawalsResults').innerHTML = `
          <div class="card">
            <h3>Withdrawals for ${cleanUsername || userName}</h3>
            <div class="empty-state">
              <i class="fas fa-wallet"></i>
              <p>No withdrawals found for this user</p>
            </div>
          </div>
        `;
      } else {
        this.displayUserWithdrawals(allWithdrawals, cleanUsername || userName, actualUserId);
      }
      
      document.getElementById('userWithdrawalsResults').style.display = 'block';
      
    } catch (error) {
      console.error("Error searching user withdrawals:", error);
      this.showNotification("Error", "Search failed", "error");
    }
  }

  displayUserWithdrawals(withdrawals, userName, userId) {
    withdrawals.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
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
      const date = w.createdAt ? this.formatDateTime(w.createdAt) : 'N/A';
      const processedDate = w.processedAt ? this.formatDateTime(w.processedAt) : 'N/A';
      const walletAddress = w.walletAddress || '';
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
        <div class="withdrawal-item ${w.status}">
          <div class="withdrawal-status ${statusClass}">${statusText}</div>
          
          <div class="withdrawal-details">
            <div class="detail">
              <span><i class="fas fa-calendar"></i> Date:</span>
              <span>${date}</span>
            </div>
            <div class="detail">
              <span><i class="fas fa-wallet"></i> Wallet:</span>
              <span class="copyable-wallet" onclick="admin.copyToClipboard('${walletAddress}')" title="Click to copy full address">
                ${walletDisplay}
              </span>
            </div>
            <div class="detail">
              <span><i class="fas fa-coins"></i> Amount:</span>
              <span class="copyable-amount" onclick="admin.copyToClipboard('${w.amount ? w.amount.toFixed(5) : '0.00000'} TON')" title="Click to copy amount">
                ${w.amount ? w.amount.toFixed(5) : '0.00000'} TON
              </span>
            </div>
            ${w.processedAt ? `
              <div class="detail">
                <span><i class="fas fa-calendar-check"></i> Processed:</span>
                <span>${processedDate}</span>
              </div>
            ` : ''}
            ${w.transaction_link ? `
              <div class="detail">
                <span><i class="fas fa-link"></i> Transaction:</span>
                <span>
                  <a href="${w.transaction_link}" target="_blank" style="color: #3b82f6;">
                    View on Explorer
                  </a>
                </span>
              </div>
            ` : ''}
          </div>
          
          ${w.status === 'pending' ? `
            <div class="withdrawal-actions">
              <button class="action-btn btn-success" onclick="admin.showApproveModal('${w.id}', ${w.amount}, '${w.walletAddress}', '${w.userId}', '${userName}')">
                <i class="fas fa-check"></i> Approve
              </button>
              <button class="action-btn btn-danger" onclick="admin.rejectWithdrawal('${w.id}')">
                <i class="fas fa-times"></i> Reject
              </button>
            </div>
          ` : ''}
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
    
    document.getElementById('userWithdrawalsResults').innerHTML = html;
  }

  clearWithdrawalSearch() {
    document.getElementById('searchWithdrawalUser').value = '';
    document.getElementById('userWithdrawalsResults').style.display = 'none';
  }

  async loadWithdrawals() {
    try {
      const [pendingSnap, completedSnap, rejectedSnap] = await Promise.all([
        this.db.ref('withdrawals/pending').once('value'),
        this.db.ref('withdrawals/completed').once('value'),
        this.db.ref('withdrawals/rejected').once('value')
      ]);
      
      const today = new Date().setHours(0, 0, 0, 0);
      let pendingCount = 0;
      let completedCount = 0;
      let rejectedCount = 0;
      let todayCount = 0;
      
      if (pendingSnap.exists()) {
        pendingCount = pendingSnap.numChildren();
      }
      
      if (completedSnap.exists()) {
        completedCount = completedSnap.numChildren();
        completedSnap.forEach(child => {
          const withdrawal = child.val();
          if (withdrawal.createdAt && withdrawal.createdAt >= today) {
            todayCount++;
          }
        });
      }
      
      if (rejectedSnap.exists()) {
        rejectedCount = rejectedSnap.numChildren();
      }
      
      document.getElementById('pendingCount').textContent = pendingCount;
      document.getElementById('completedCount').textContent = completedCount;
      document.getElementById('rejectedCount').textContent = rejectedCount;
      document.getElementById('todayCount').textContent = todayCount;
      
      await this.displayPendingWithdrawals(pendingSnap);
      
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

  async displayPendingWithdrawals(pendingSnap) {
    const container = document.getElementById('withdrawalsList');
    
    if (!pendingSnap.exists() || pendingSnap.numChildren() === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-wallet"></i>
          <p>No pending withdrawals</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    const promises = [];
    
    pendingSnap.forEach(child => {
      const request = child.val();
      const requestId = child.key;
      const userId = request.userId;
      
      promises.push(
        this.db.ref(`users/${userId}`).once('value').then(userSnap => {
          return { request, requestId, userData: userSnap.val() };
        })
      );
    });
    
    const results = await Promise.all(promises);
    
    results.forEach(({ request, requestId, userData }) => {
      const date = request.createdAt ? new Date(request.createdAt) : new Date();
      const formattedDate = this.formatDateTime(request.createdAt);
      const walletAddress = request.walletAddress || '';
      const walletDisplay = walletAddress.length > 10 ? 
        `${walletAddress.substring(0, 5)}...${walletAddress.substring(walletAddress.length - 5)}` : 
        walletAddress;
      
      const username = userData?.username || '';
      const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
      const photoUrl = userData?.photoUrl || DEFAULT_IMAGE_URL;
      
      html += `
        <div class="withdrawal-item">
          <div class="withdrawal-header">
            <div class="user-info">
              <div class="user-avatar">
                <img src="${photoUrl}" 
                     alt="${request.userName || 'User'}" 
                     onerror="this.src='${DEFAULT_IMAGE_URL}'">
              </div>
              <div>
                <h4>${cleanUsername || request.userName || 'Unknown User'}</h4>
                <p class="user-details">
                  <span>ID: ${request.userId}</span>
                </p>
              </div>
            </div>
          </div>
          
          <div class="withdrawal-details">
            <div class="detail">
              <span><i class="fas fa-calendar"></i> Date:</span>
              <span>${formattedDate}</span>
            </div>
            <div class="detail">
              <span><i class="fas fa-wallet"></i> Wallet:</span>
              <span class="copyable-wallet" onclick="admin.copyToClipboard('${walletAddress}')" title="Click to copy full address">
                ${walletDisplay}
              </span>
            </div>
            <div class="detail">
              <span><i class="fas fa-coins"></i> Amount:</span>
              <span class="copyable-amount" onclick="admin.copyToClipboard('${request.amount ? request.amount.toFixed(5) : '0.00000'} TON')" title="Click to copy amount">
                ${request.amount ? request.amount.toFixed(5) : '0.00000'} TON
              </span>
            </div>
          </div>
          
          <div class="withdrawal-actions">
            <button class="action-btn btn-success" onclick="admin.showApproveModal('${requestId}', ${request.amount}, '${request.walletAddress}', '${request.userId}', '${cleanUsername || request.userName || ''}')">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="action-btn btn-danger" onclick="admin.rejectWithdrawal('${requestId}')">
              <i class="fas fa-times"></i> Reject
            </button>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
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

  showApproveModal(requestId, amount, wallet, userId, userName) {
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
                <button class="btn-copy" onclick="admin.copyToClipboard('${amount.toFixed(5)} TON')" title="Copy amount">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>
            <div class="summary-item">
              <span>Wallet:</span>
              <div class="summary-value-group">
                <span class="wallet-value">${wallet}</span>
                <button class="btn-copy" onclick="admin.copyToClipboard('${wallet}')" title="Copy wallet">
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
            <small>Enter only the transaction hash (without URL)</small>
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="action-btn btn-success" onclick="admin.approveWithdrawal('${requestId}', '${userId}', ${amount}, '${wallet}')">
            <i class="fas fa-check"></i> Approve
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showNotification("Copied", "Copied to clipboard", "success");
    }).catch(err => {
      this.showNotification("Error", "Failed to copy", "error");
    });
  }

  async approveWithdrawal(requestId, userId, amount, wallet) {
    const transactionHash = document.getElementById('transactionHash')?.value.trim();
    
    if (!transactionHash) {
      this.showNotification("Error", "Please enter transaction hash", "error");
      return;
    }
    
    const transactionLink = `https://tonviewer.com/transaction/${transactionHash}`;
    
    try {
      const requestRef = this.db.ref(`withdrawals/pending/${requestId}`);
      const snapshot = await requestRef.once('value');
      const request = snapshot.val();
      
      if (!request) {
        this.showNotification("Error", "Request not found", "error");
        return;
      }
      
      const userSnap = await this.db.ref(`users/${userId}`).once('value');
      const userData = userSnap.val();
      
      const completedData = {
        ...request,
        status: 'completed',
        processedAt: Date.now(),
        transaction_link: transactionLink
      };
      
      await this.db.ref(`withdrawals/completed/${requestId}`).set(completedData);
      
      await requestRef.remove();
      
      await this.sendWithdrawalNotification(userId, amount, wallet, transactionLink, userData);
      
      this.showNotification("Success", "Withdrawal approved!", "success");
      
      document.querySelector('.modal-overlay.show')?.remove();
      await this.loadWithdrawals();
      
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      this.showNotification("Error", "Failed to approve withdrawal", "error");
    }
  }

  async rejectWithdrawal(requestId) {
    if (!confirm('Are you sure you want to reject this withdrawal?')) return;
    
    try {
      const requestRef = this.db.ref(`withdrawals/pending/${requestId}`);
      const snapshot = await requestRef.once('value');
      const request = snapshot.val();
      
      if (!request) {
        this.showNotification("Error", "Request not found", "error");
        return;
      }
      
      await this.db.ref(`withdrawals/rejected/${requestId}`).set({
        ...request,
        status: 'rejected',
        processedAt: Date.now()
      });
      
      await requestRef.remove();
      
      this.showNotification("Success", "Withdrawal rejected", "success");
      await this.loadWithdrawals();
      
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      this.showNotification("Error", "Failed to reject withdrawal", "error");
    }
  }

  async sendWithdrawalNotification(userId, amount, wallet, transactionLink, userData) {
    try {
      let message = this.settings.withdrawalMessage || "✅ Your withdrawal has been approved!\n\n💎 Amount: {amount} TON\n💰 Wallet: {wallet}\n🔗 Transaction: {transaction}\n\nThank you for using Pop Buzz!";
      
      message = message.replace('{amount}', amount.toFixed(5))
        .replace('{wallet}', wallet)
        .replace('{transaction}', transactionLink);
      
      const inlineButtons = [];
      
      if (transactionLink) {
        inlineButtons.push([{
          text: "🔗 View on Explorer",
          url: transactionLink
        }]);
      }
      
      if (this.settings.withdrawalButtons && this.settings.withdrawalButtons.length > 0) {
        this.settings.withdrawalButtons.forEach(btn => {
          if (btn.text && btn.url) {
            inlineButtons.push([{
              text: btn.text,
              url: btn.url
            }]);
          }
        });
      }
      
      await this.sendTelegramMessage(userId, message, inlineButtons);
      
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }

  async renderBroadcast() {
    this.elements.contentArea.innerHTML = `
      <div class="broadcast-page">
        <div class="page-header">
          <h2><i class="fas fa-bullhorn"></i> Broadcast Messages</h2>
          <p>Send messages to all users or specific users</p>
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
              <small>Supports HTML formatting and emojis</small>
            </div>
            
            <div class="form-group">
              <label>Image (Optional - PNG/JPG)</label>
              <input type="text" id="broadcastImage" placeholder="https://example.com/image.jpg">
              <small>Add an image URL to send with the message (PNG or JPG format)</small>
            </div>
            
            <div class="html-tools">
              <button class="html-btn" onclick="admin.insertHtmlTag('b')"><b>B</b></button>
              <button class="html-btn" onclick="admin.insertHtmlTag('i')"><i>I</i></button>
              <button class="html-btn" onclick="admin.insertHtmlTag('u')"><u>U</u></button>
              <button class="html-btn" onclick="admin.insertHtmlTag('code')"><code>C</code></button>
              <button class="html-btn" onclick="admin.insertLink()">🔗 Link</button>
              <button class="html-btn" onclick="admin.insertEmoji()">😊 Emoji</button>
            </div>
            
            <div class="inline-buttons-section">
              <h4><i class="fas fa-th-large"></i> Inline Buttons</h4>
              <p class="section-description">Add inline buttons below the message</p>
              
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
              <small>Max 5 rows, each button up to 30 characters</small>
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
            
            <div class="broadcast-status" style="margin-top: 20px;">
              <h4><i class="fas fa-history"></i> Broadcast Queue</h4>
              <div id="queueStatus" class="queue-status">
                ${this.getQueueStatusHTML()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.updatePreview();
    this.updateQueueDisplay();
  }

  getQueueStatusHTML() {
    if (this.broadcastQueue.length === 0) {
      return '<div class="empty-state"><i class="fas fa-check-circle"></i><p>No broadcasts in queue</p></div>';
    }
    
    let html = '<div class="queue-list">';
    this.broadcastQueue.forEach((job, index) => {
      const date = new Date(job.createdAt).toLocaleString();
      const status = job.status || 'pending';
      html += `
        <div class="queue-item ${status}">
          <div class="queue-header">
            <span class="queue-icon"><i class="fas ${status === 'completed' ? 'fa-check-circle' : 'fa-clock'}"></i></span>
            <span class="queue-title">Broadcast #${index + 1}</span>
            <span class="queue-date">${date}</span>
          </div>
          <div class="queue-details">
            <span>Recipients: ${job.type === 'all' ? 'All Users' : 'Specific User'}</span>
            <span>Status: ${status.toUpperCase()}</span>
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }

  updateQueueDisplay() {
    const queueStatus = document.getElementById('queueStatus');
    if (queueStatus) {
      queueStatus.innerHTML = this.getQueueStatusHTML();
    }
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
      this.showNotification("Warning", "Maximum 5 rows of buttons allowed", "warning");
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
      case 'u': startTag = '<u>'; endTag = '</u>'; break;
      case 'code': startTag = '<code>'; endTag = '</code>'; break;
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

  insertEmoji() {
    const emojis = ['😊', '🎉', '🔥', '💰', '💎', '⭐', '✅', '❌', '⚠️', '🔔', '📢', '🎁', '🏆', '🚀', '💪', '👑', '🌟', '✨', '💫', '⚡'];
    const emoji = prompt('Select emoji (or paste any):\n\n' + emojis.join(' '), '🎉');
    if (!emoji) return;
    
    const textarea = document.getElementById('broadcastMessage');
    const start = textarea.selectionStart;
    
    textarea.value = textarea.value.substring(0, start) + emoji + textarea.value.substring(start);
    textarea.focus();
    textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    
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
              previewHTML += `
                <a href="${button.url}" class="preview-button" target="_blank">
                  ${button.text}
                </a>
              `;
            }
          });
          previewHTML += '</div>';
        });
        previewHTML += '</div>';
      }
    } else {
      previewHTML = `
        <div class="preview-placeholder">
          <i class="fas fa-comment-alt"></i>
          <p>Message preview will appear here</p>
        </div>
      `;
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
        rowButtons.push({
          text: textInput.value.trim(),
          url: urlInput.value.trim()
        });
      }
      
      if (rowButtons.length > 0) {
        buttons.push(rowButtons);
      }
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
    
    const totalUsers = type === 'all' ? 'ALL users' : '1 user';
    if (!confirm(`Send broadcast to ${totalUsers}? The broadcast will continue even if you close the panel.`)) {
      return;
    }
    
    this.showNotification("Info", "Broadcast added to queue. It will continue even if you close the panel.", "info");
    
    const broadcastJob = {
      id: Date.now(),
      message: message,
      type: type,
      userId: userId,
      inlineButtons: inlineButtons,
      imageUrl: imageUrl,
      createdAt: Date.now(),
      status: 'pending'
    };
    
    this.broadcastQueue.push(broadcastJob);
    this.saveBroadcastQueue();
    this.updateQueueDisplay();
    
    this.showNotification("Success", "Broadcast added to queue", "success");
    
    document.getElementById('broadcastMessage').value = '';
    document.getElementById('broadcastImage').value = '';
    this.updatePreview();
  }

  async executeBroadcast(job) {
    try {
      let users = [];
      
      if (job.type === 'all') {
        const usersSnap = await this.db.ref('users').once('value');
        usersSnap.forEach(child => {
          users.push({
            id: child.key,
            username: child.val().username,
            firstName: child.val().firstName
          });
        });
      } else {
        const userSnap = await this.db.ref(`users/${job.userId}`).once('value');
        if (!userSnap.exists()) {
          throw new Error('User not found');
        }
        
        users.push({
          id: job.userId,
          username: userSnap.val().username,
          firstName: userSnap.val().firstName
        });
      }
      
      const total = users.length;
      if (total === 0) {
        throw new Error('No users found');
      }
      
      let sent = 0;
      let failed = 0;
      
      for (const user of users) {
        try {
          await this.sendTelegramMessage(user.id, job.message, job.inlineButtons, job.imageUrl);
          sent++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to send to ${user.id}:`, error);
          failed++;
        }
      }
      
      job.status = 'completed';
      job.completedAt = Date.now();
      job.sent = sent;
      job.failed = failed;
      this.saveBroadcastQueue();
      this.updateQueueDisplay();
      
      await this.sendTelegramMessage(ADMIN_TELEGRAM_ID, `✅ Broadcast completed!\n\nSent: ${sent}\nFailed: ${failed}\nTotal: ${total}`);
      
    } catch (error) {
      console.error("Broadcast execution error:", error);
      job.status = 'failed';
      job.error = error.message;
      this.saveBroadcastQueue();
      this.updateQueueDisplay();
      
      await this.sendTelegramMessage(ADMIN_TELEGRAM_ID, `❌ Broadcast failed!\n\nError: ${error.message}`);
    }
  }

  async renderSettings() {
    this.elements.contentArea.innerHTML = `
      <div class="settings-page">
        <div class="page-header">
          <h2><i class="fas fa-sliders-h"></i> Settings</h2>
          <p>Configure admin panel settings</p>
        </div>
        
        <div class="settings-section">
          <div class="settings-card">
            <h3><i class="fas fa-envelope"></i> Withdrawal Notification Settings</h3>
            
            <div class="form-group">
              <label>Withdrawal Approval Message</label>
              <textarea id="withdrawalMessage" rows="6" placeholder="Enter message...">${this.settings.withdrawalMessage || ''}</textarea>
              <small>Available placeholders: {amount}, {wallet}, {transaction}</small>
            </div>
            
            <div class="form-group">
              <label>Message Image URL (Optional)</label>
              <input type="text" id="withdrawalImage" placeholder="https://example.com/image.jpg" value="${this.settings.withdrawalImage || ''}">
              <small>Image will be sent with the message</small>
            </div>
            
            <div class="inline-buttons-section">
              <h4><i class="fas fa-th-large"></i> Message Buttons</h4>
              <p class="section-description">Add buttons to the withdrawal approval message</p>
              
              <div id="withdrawalButtonsContainer">
                ${this.renderWithdrawalButtons()}
              </div>
              
              <button class="action-btn btn-secondary" onclick="admin.addWithdrawalButton()">
                <i class="fas fa-plus"></i> Add Button
              </button>
              <small>Each button up to 30 characters</small>
            </div>
            
            <div class="settings-actions" style="margin-top: 20px;">
              <button class="action-btn btn-success" onclick="admin.saveSettings()">
                <i class="fas fa-save"></i> Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.setupWithdrawalButtonsEvents();
  }

  renderWithdrawalButtons() {
    const buttons = this.settings.withdrawalButtons || [];
    if (buttons.length === 0) {
      return `
        <div class="button-row">
          <input type="text" class="button-text" placeholder="Button text" maxlength="30">
          <input type="text" class="button-url" placeholder="URL">
          <button class="btn-sm btn-danger" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
    }
    
    return buttons.map(btn => `
      <div class="button-row">
        <input type="text" class="button-text" value="${btn.text}" placeholder="Button text" maxlength="30">
        <input type="text" class="button-url" value="${btn.url}" placeholder="URL">
        <button class="btn-sm btn-danger" onclick="this.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
  }

  setupWithdrawalButtonsEvents() {
    const container = document.getElementById('withdrawalButtonsContainer');
    if (!container) return;
    
    const inputs = container.querySelectorAll('.button-text, .button-url');
    inputs.forEach(input => {
      input.addEventListener('input', () => {});
    });
  }

  addWithdrawalButton() {
    const container = document.getElementById('withdrawalButtonsContainer');
    if (!container) return;
    
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
      <button class="btn-sm btn-danger" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    container.appendChild(buttonRow);
  }

  saveSettings() {
    const message = document.getElementById('withdrawalMessage')?.value || '';
    const image = document.getElementById('withdrawalImage')?.value || '';
    
    const buttons = [];
    const buttonRows = document.querySelectorAll('#withdrawalButtonsContainer .button-row');
    buttonRows.forEach(row => {
      const text = row.querySelector('.button-text')?.value.trim();
      const url = row.querySelector('.button-url')?.value.trim();
      if (text && url) {
        buttons.push({ text, url });
      }
    });
    
    this.settings.withdrawalMessage = message;
    this.settings.withdrawalImage = image;
    this.settings.withdrawalButtons = buttons;
    
    this.saveSettings();
    this.showNotification("Success", "Settings saved successfully", "success");
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
              <p class="uid-description">
                This is your unique Firebase Authentication ID. You can use this ID for reference in admin activities.
              </p>
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
                <span class="detail-value">Administrator</span>
              </div>
            </div>
            
            <div class="uid-actions">
              <button class="action-btn btn-secondary" onclick="admin.refreshUidInfo()">
                <i class="fas fa-sync-alt"></i> Refresh Info
              </button>
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
    }).catch(err => {
      this.showNotification("Error", "Failed to copy UID", "error");
    });
  }

  refreshUidInfo() {
    this.showNotification("Refreshed", "UID information updated", "success");
    this.renderMyUid();
  }

  async sendTelegramMessage(chatId, message, inlineButtons = [], imageUrl = null) {
    try {
      if (imageUrl) {
        const photoUrl = `https://api.telegram.org/bot${this.botToken}/sendPhoto`;
        const photoPayload = {
          chat_id: chatId,
          photo: imageUrl,
          caption: message,
          parse_mode: 'HTML'
        };
        
        if (inlineButtons.length > 0) {
          const keyboard = [];
          inlineButtons.forEach(row => {
            const rowButtons = row.map(button => ({
              text: button.text,
              url: button.url
            }));
            keyboard.push(rowButtons);
          });
          
          photoPayload.reply_markup = {
            inline_keyboard: keyboard
          };
        }
        
        const photoResponse = await fetch(photoUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(photoPayload)
        });
        
        const photoData = await photoResponse.json();
        if (!photoData.ok) {
          throw new Error(photoData.description || 'Telegram API error');
        }
      } else {
        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
        
        const payload = {
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        };
        
        if (inlineButtons.length > 0) {
          const keyboard = [];
          inlineButtons.forEach(row => {
            const rowButtons = row.map(button => ({
              text: button.text,
              url: button.url
            }));
            keyboard.push(rowButtons);
          });
          
          payload.reply_markup = {
            inline_keyboard: keyboard
          };
        }
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (!data.ok) {
          throw new Error(data.description || 'Telegram API error');
        }
      }
      
      return true;
      
    } catch (error) {
      console.error(`Telegram error for ${chatId}:`, error);
      throw error;
    }
  }

  showNotification(title, message, type = 'info') {
    const container = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? '✅' : 
                 type === 'error' ? '❌' : 
                 type === 'warning' ? '⚠️' : 'ℹ️';
    
    notification.innerHTML = `
      <div class="notification-icon">${icon}</div>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  safeNumber(value) {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }
}

const admin = new AdminPanel();
window.admin = admin;
