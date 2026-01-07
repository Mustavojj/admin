class AdminPanel {
  constructor() {
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    this.appConfig = APP_DEFAULT_CONFIG;
    this.botToken = "8315477063:AAFztM82m2p0Md03SYNWUB9SJ6cN_EMGcI4"; // Ninja bot token
    
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
      case 'tasks':
        await this.renderTasks();
        break;
      case 'withdrawals':
        await this.renderWithdrawals();
        break;
      case 'promoCodes':
        await this.renderPromoCodes();
        break;
      case 'games':
        await this.renderGames();
        break;
      case 'quests':
        await this.renderQuests();
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
      const [usersSnap, withdrawalsSnap, tasksSnap, appStatsSnap] = await Promise.all([
        this.db.ref('users').once('value'),
        this.db.ref('withdrawals/pending').once('value'),
        this.db.ref('config/tasks').once('value'),
        this.db.ref('appStats').once('value')
      ]);
      
      const totalUsers = usersSnap.numChildren();
      const pendingWithdrawals = withdrawalsSnap.numChildren();
      const totalTasks = tasksSnap.numChildren();
      
      let appStats = {
        totalUsers: 0,
        totalTasks: 0,
        totalPayments: 0,
        totalWithdrawals: 0,
        totalAds: 0,
        totalDicePlays: 0
      };
      
      if (appStatsSnap.exists()) {
        appStats = appStatsSnap.val();
      }
      
      // حساب إجمالي البيانات للمستخدمين
      let totalBalance = 0;
      let totalDicePlays = 0;
      let totalReferrals = 0;
      let totalTasksCompleted = 0;
      let usersArray = [];
      
      usersSnap.forEach(child => {
        const user = child.val();
        usersArray.push({
          id: user.id || child.key,
          firstName: user.firstName || '',
          username: user.username || '',
          balance: this.safeNumber(user.balance),
          dicePlays: this.safeNumber(user.dicePlays),
          referrals: user.totalReferrals || user.referrals || 0,
          tasksCompleted: user.tasksCompleted || user.totalTasks || 0,
          referralEarnings: this.safeNumber(user.referralEarnings),
          totalEarned: this.safeNumber(user.totalEarned)
        });
        
        totalBalance += this.safeNumber(user.balance);
        totalDicePlays += this.safeNumber(user.dicePlays);
        totalReferrals += (user.totalReferrals || user.referrals || 0);
        totalTasksCompleted += (user.tasksCompleted || user.totalTasks || 0);
      });
      
      // Sort by balance
      const topByBalance = [...usersArray]
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 20);
      
      // Sort by dice plays
      const topByDicePlays = [...usersArray]
        .sort((a, b) => b.dicePlays - a.dicePlays)
        .slice(0, 20);
      
      let topBalanceHTML = '';
      topByBalance.forEach((user, index) => {
        topBalanceHTML += `
          <div class="dashboard-user-item">
            <div class="user-rank">${index + 1}</div>
            <div class="user-info">
              <strong>${user.firstName || 'User'}</strong>
              ${user.username ? `<br><small>@${user.username}</small>` : ''}
            </div>
            <div class="user-stats">
              <span class="stat-badge ton">
                <img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm">
                ${user.balance.toFixed(3)} TON
              </span>
              <span class="stat-badge games">
                <i class="fas fa-dice"></i>
                ${user.dicePlays} Games
              </span>
            </div>
          </div>
        `;
      });
      
      let topDicePlaysHTML = '';
      topByDicePlays.forEach((user, index) => {
        topDicePlaysHTML += `
          <div class="dashboard-user-item">
            <div class="user-rank">${index + 1}</div>
            <div class="user-info">
              <strong>${user.firstName || 'User'}</strong>
              ${user.username ? `<br><small>@${user.username}</small>` : ''}
            </div>
            <div class="user-stats">
              <span class="stat-badge games">
                <i class="fas fa-dice"></i> ${user.dicePlays} Games
              </span>
              <span class="stat-badge referral">
                <i class="fas fa-users"></i> ${user.referrals} Referrals
              </span>
            </div>
          </div>
        `;
      });
      
      this.elements.mainContent.innerHTML = `
        <div id="dashboard" class="page active">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">
                <i class="fas fa-users"></i>
              </div>
              <div class="stat-content">
                <h3>Total Users</h3>
                <p>${appStats.totalUsers.toLocaleString()}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">
                <i class="fas fa-wallet"></i>
              </div>
              <div class="stat-content">
                <h3>Pending Withdrawals</h3>
                <p>${pendingWithdrawals}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">
                <i class="fas fa-coins"></i>
              </div>
              <div class="stat-content">
                <h3>Total Balance</h3>
                <p>${totalBalance.toFixed(3)} TON</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">
                <i class="fas fa-dice"></i>
              </div>
              <div class="stat-content">
                <h3>Total Games</h3>
                <p>${totalDicePlays.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div class="dashboard-columns">
            <div class="dashboard-column">
              <div class="card">
                <h3><i class="fas fa-trophy"></i> Top 20 Users by Balance</h3>
                <div class="user-list-container">
                  ${topBalanceHTML || '<div class="empty-state">No users found</div>'}
                </div>
              </div>
            </div>
            
            <div class="dashboard-column">
              <div class="card">
                <h3><i class="fas fa-chart-line"></i> Top 20 Users by Games</h3>
                <div class="user-list-container">
                  ${topDicePlaysHTML || '<div class="empty-state">No users found</div>'}
                </div>
              </div>
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
      
      // الحصول على حالة المستخدم
      const statusSnap = await this.db.ref(`config/${userId}/status`).once('value');
      const userStatus = statusSnap.exists() ? statusSnap.val() : 'free';
      
      // الحصول على بيانات المستخدم
      const balance = this.safeNumber(user.balance);
      const dicePlays = this.safeNumber(user.dicePlays);
      const referrals = user.totalReferrals || user.referrals || 0;
      const tasksCompleted = user.tasksCompleted || user.totalTasks || 0;
      const referralEarnings = this.safeNumber(user.referralEarnings);
      const totalEarned = this.safeNumber(user.totalEarned);
      const totalWithdrawals = user.totalWithdrawals || 0;
      const dicePoints = user.dicePoints || 0;
      const dailyAdsWatched = user.dailyAdsWatched || 0;
      
      document.getElementById('userDetails').innerHTML = `
        <div class="user-profile-card">
          <div class="user-profile-header">
            <div class="user-avatar">
              <i class="fas fa-user-circle"></i>
            </div>
            <div class="user-profile-info">
              <h3>${user.firstName || 'User'} ${user.lastName || ''}</h3>
              <div class="user-meta">
                ${user.username ? `<span><i class="fab fa-telegram"></i> @${user.username}</span>` : ''}
                <span><i class="fas fa-id-card"></i> ID: ${userId}</span>
                <span class="user-status ${userStatus}">
                  <i class="fas fa-circle"></i> ${userStatus.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          
          <div class="user-stats-grid">
            <div class="user-stat-card">
              <div class="user-stat-icon ton">
                <img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm">
              </div>
              <div class="user-stat-content">
                <h4>TON Balance</h4>
                <p>${balance.toFixed(3)}</p>
              </div>
            </div>
            
            <div class="user-stat-card">
              <div class="user-stat-icon games">
                <i class="fas fa-dice"></i>
              </div>
              <div class="user-stat-content">
                <h4>Dice Games</h4>
                <p>${dicePlays}</p>
              </div>
            </div>
            
            <div class="user-stat-card">
              <div class="user-stat-icon referral">
                <i class="fas fa-users"></i>
              </div>
              <div class="user-stat-content">
                <h4>Referrals</h4>
                <p>${referrals}</p>
              </div>
            </div>
            
            <div class="user-stat-card">
              <div class="user-stat-icon task">
                <i class="fas fa-tasks"></i>
              </div>
              <div class="user-stat-content">
                <h4>Tasks Completed</h4>
                <p>${tasksCompleted}</p>
              </div>
            </div>
          </div>
          
          <div class="user-additional-info">
            <div class="info-section">
              <h4>Additional Information</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Referral Earnings:</span>
                  <span class="info-value ton-text">${referralEarnings.toFixed(3)} TON</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Earned:</span>
                  <span class="info-value ton-text">${totalEarned.toFixed(3)} TON</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Withdrawals:</span>
                  <span class="info-value">${totalWithdrawals}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Dice Points:</span>
                  <span class="info-value">${dicePoints.toLocaleString()}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Ads Watched:</span>
                  <span class="info-value">${dailyAdsWatched}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Referral Code:</span>
                  <span class="info-value">${user.referralCode || 'N/A'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Last Active:</span>
                  <span class="info-value">${user.lastActive ? new Date(user.lastActive).toLocaleString() : 'N/A'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Created:</span>
                  <span class="info-value">${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="user-actions">
            <h4>User Management</h4>
            <div class="action-buttons-grid">
              <button class="action-btn btn-success" onclick="admin.showAddBalanceModal('${userId}', '${user.firstName || 'User'}')">
                <i class="fas fa-plus-circle"></i> Add TON
              </button>
              <button class="action-btn btn-danger" onclick="admin.showRemoveBalanceModal('${userId}', '${user.firstName || 'User'}')">
                <i class="fas fa-minus-circle"></i> Remove TON
              </button>
              <button class="action-btn btn-info" onclick="admin.showAddGamesModal('${userId}', '${user.firstName || 'User'}')">
                <i class="fas fa-dice"></i> Add Games
              </button>
              ${userStatus === 'free' ? 
                `<button class="action-btn btn-warning" onclick="admin.banUser('${userId}')">
                  <i class="fas fa-ban"></i> Ban User
                </button>` : 
                `<button class="action-btn btn-success" onclick="admin.unbanUser('${userId}')">
                  <i class="fas fa-check-circle"></i> Unban User
                </button>`
              }
            </div>
          </div>
        </div>
      `;

    } catch (error) {
      console.error("Error searching user:", error);
      this.showNotification("Error", "Failed to search user", "error");
    }
  }

  showAddGamesModal(userId, userName) {
    const modalHTML = `
      <div class="modal-overlay active" id="addGamesModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Add Dice Games to ${userName}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="addGamesAmount">Number of Games</label>
              <input type="number" id="addGamesAmount" placeholder="Enter number of games" step="1" min="1">
              <small>Each game allows the user to play dice once</small>
            </div>
            <div class="form-group">
              <label for="addGamesReason">Reason</label>
              <input type="text" id="addGamesReason" placeholder="Reason for adding games">
              <small>This will be recorded in history</small>
            </div>
          </div>
          <div class="modal-footer">
            <button class="action-btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="action-btn btn-success" onclick="admin.addGames('${userId}')">
              <i class="fas fa-check"></i> Add Games
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  async addGames(userId) {
    const amount = parseInt(document.getElementById('addGamesAmount').value);
    const reason = document.getElementById('addGamesReason').value.trim() || 'Admin added games';

    if (!amount || amount <= 0) {
      this.showNotification("Error", "Please enter a valid number of games", "error");
      return;
    }

    try {
      const userSnap = await this.db.ref(`users/${userId}`).once('value');
      if (!userSnap.exists()) {
        this.showNotification("Error", "User not found", "error");
        return;
      }

      const user = userSnap.val();
      const currentGames = this.safeNumber(user.dicePlays);
      const newGames = currentGames + amount;

      await this.db.ref(`users/${userId}`).update({
        dicePlays: newGames
      });

      // Add to games history
      const gamesHistory = {
        telegramId: userId,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
        amount: amount,
        reason: reason,
        previousGames: currentGames,
        newGames: newGames,
        adminId: 'admin',
        timestamp: Date.now(),
        date: new Date().toLocaleString()
      };

      await this.db.ref('gamesHistory').push(gamesHistory);

      this.showNotification("Success", `Added ${amount} dice games to user`, "success");
      
      // Close modal and refresh user details
      document.querySelector('#addGamesModal').remove();
      await this.searchUser();
      
    } catch (error) {
      console.error("Error adding games:", error);
      this.showNotification("Error", "Failed to add games", "error");
    }
  }

  // باقي الدوال (showAddBalanceModal, showRemoveBalanceModal, addBalance, removeBalance, banUser, unbanUser)
  // تبقى كما هي مع تعديلات طفيفة للتوافق مع Ninja TON

  async renderTasks() {
    this.elements.mainContent.innerHTML = `
      <div id="tasks" class="page active">
        <div class="tasks-management">
          <div class="card">
            <h3><i class="fas fa-tasks"></i> Tasks Management</h3>
            
            <div class="form-group">
              <label for="taskName">Task Name *</label>
              <input type="text" id="taskName" placeholder="e.g., Join Our Channel" required>
            </div>
            
            <div class="form-group">
              <label for="taskLink">Task Link (URL) *</label>
              <input type="text" id="taskLink" placeholder="https://t.me/..." required>
              <small>For channels/groups</small>
            </div>
            
            <div class="form-group">
              <label>Task Category *</label>
              <div class="task-category-buttons">
                <button type="button" class="category-btn active" data-category="channel">
                  <i class="fas fa-bullhorn"></i> Channel/Group
                </button>
                <button type="button" class="category-btn" data-category="bot">
                  <i class="fas fa-robot"></i> Website/Bot
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label for="taskReward">Reward per User (TON) *</label>
              <input type="number" id="taskReward" placeholder="0.001" value="0.001" min="0.001" step="0.001">
              <small>How much TON each user gets for completing</small>
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
    
    this.setupTaskFormEvents();
    await this.loadTasksList();
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
          // تصفية المهام المحذوفة
          if (task.status !== 'deleted') {
            tasksArray.push({
              id: child.key,
              ...task
            });
          }
        });
        
        // ترتيب المهام حسب تاريخ الإنشاء (الأحدث أولاً)
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
            
            tasksHTML += `
              <div class="task-item">
                <div class="task-item-header">
                  <div class="task-title">
                    <h4>${task.name || 'Unnamed Task'}</h4>
                    <div class="task-meta">
                      <span class="task-type-badge ${task.type || 'channel'}">${task.type || 'channel'}</span>
                      <span class="task-status-badge ${statusClass}">${status}</span>
                    </div>
                  </div>
                  <div class="task-actions">
                    <button class="action-btn btn-danger btn-sm" onclick="admin.deleteTask('${task.id}')">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                
                <div class="task-item-details">
                  <div class="task-detail">
                    <span class="detail-label">URL:</span>
                    <a href="${task.url}" target="_blank" class="task-link">${task.url}</a>
                  </div>
                  <div class="task-detail">
                    <span class="detail-label">Reward per User:</span>
                    <span class="reward-amount">
                      <img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm">
                      ${task.reward || 0.001} TON
                    </span>
                  </div>
                  <div class="task-detail">
                    <span class="detail-label">Max Completions:</span>
                    <span>${maxCompletions}</span>
                  </div>
                  <div class="task-detail">
                    <span class="detail-label">Current Completions:</span>
                    <span>${currentCompletions}</span>
                  </div>
                </div>
                
                <div class="task-progress">
                  <div class="progress-info">
                    <span>Progress: ${currentCompletions}/${maxCompletions}</span>
                    <span>${progress.toFixed(1)}%</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                  </div>
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

  async renderGames() {
    this.elements.mainContent.innerHTML = `
      <div id="games" class="page active">
        <div class="card">
          <h3><i class="fas fa-dice"></i> Dice Games Statistics</h3>
          <div class="loading">
            <div class="spinner"></div>
            <p>Loading Games Statistics...</p>
          </div>
        </div>
      </div>
    `;
    
    try {
      const usersSnap = await this.db.ref('users').once('value');
      
      let totalGames = 0;
      let totalPoints = 0;
      let gamesByDay = {};
      let usersArray = [];
      
      usersSnap.forEach(child => {
        const user = child.val();
        const userGames = this.safeNumber(user.dicePlays);
        const userPoints = this.safeNumber(user.dicePoints);
        
        totalGames += userGames;
        totalPoints += userPoints;
        
        // جمع بيانات للمستخدمين النشطين
        if (userGames > 0) {
          usersArray.push({
            id: user.id || child.key,
            firstName: user.firstName || '',
            username: user.username || '',
            games: userGames,
            points: userPoints,
            balance: this.safeNumber(user.balance)
          });
        }
        
        // تحليل تاريخ آخر لعبة
        if (user.lastDicePlay) {
          const date = new Date(user.lastDicePlay);
          const dayKey = date.toISOString().split('T')[0];
          gamesByDay[dayKey] = (gamesByDay[dayKey] || 0) + 1;
        }
      });
      
      // ترتيب المستخدمين حسب الألعاب
      const topPlayers = [...usersArray]
        .sort((a, b) => b.games - a.games)
        .slice(0, 20);
      
      // تحضير بيانات الرسم البياني
      const sortedDays = Object.keys(gamesByDay).sort();
      const last7Days = sortedDays.slice(-7);
      const gamesData = last7Days.map(day => gamesByDay[day] || 0);
      
      let topPlayersHTML = '';
      topPlayers.forEach((user, index) => {
        topPlayersHTML += `
          <div class="dashboard-user-item">
            <div class="user-rank">${index + 1}</div>
            <div class="user-info">
              <strong>${user.firstName || 'User'}</strong>
              ${user.username ? `<br><small>@${user.username}</small>` : ''}
            </div>
            <div class="user-stats">
              <span class="stat-badge games">
                <i class="fas fa-dice"></i> ${user.games} Games
              </span>
              <span class="stat-badge points">
                <i class="fas fa-star"></i> ${user.points.toLocaleString()} Pts
              </span>
            </div>
          </div>
        `;
      });
      
      this.elements.mainContent.innerHTML = `
        <div id="games" class="page active">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                <i class="fas fa-dice"></i>
              </div>
              <div class="stat-content">
                <h3>Total Games Played</h3>
                <p>${totalGames.toLocaleString()}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                <i class="fas fa-star"></i>
              </div>
              <div class="stat-content">
                <h3>Total Points Earned</h3>
                <p>${totalPoints.toLocaleString()}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                <i class="fas fa-users"></i>
              </div>
              <div class="stat-content">
                <h3>Active Players</h3>
                <p>${usersArray.length}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
                <i class="fas fa-chart-line"></i>
              </div>
              <div class="stat-content">
                <h3>Avg Games/Player</h3>
                <p>${usersArray.length > 0 ? Math.round(totalGames / usersArray.length) : 0}</p>
              </div>
            </div>
          </div>
          
          <div class="card">
            <h3><i class="fas fa-trophy"></i> Top 20 Dice Players</h3>
            <div class="user-list-container" style="max-height: 500px;">
              ${topPlayersHTML || '<div class="empty-state">No players found</div>'}
            </div>
          </div>
          
          <div class="card">
            <h3><i class="fas fa-chart-bar"></i> Games Activity (Last 7 Days)</h3>
            <div class="games-chart">
              <div class="chart-container">
                ${last7Days.map((day, index) => `
                  <div class="chart-bar-container">
                    <div class="chart-bar" style="height: ${gamesData[index] > 0 ? (gamesData[index] / Math.max(...gamesData) * 100) : 0}%">
                      <span class="chart-bar-value">${gamesData[index]}</span>
                    </div>
                    <div class="chart-bar-label">${new Date(day).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
      
    } catch (error) {
      console.error("Error loading games statistics:", error);
      this.elements.mainContent.innerHTML = `
        <div id="games" class="page active">
          <div class="card">
            <h3>Error loading games statistics</h3>
            <p>${error.message}</p>
          </div>
        </div>
      `;
    }
  }

  async renderQuests() {
    this.elements.mainContent.innerHTML = `
      <div id="quests" class="page active">
        <div class="card">
          <h3><i class="fas fa-flag"></i> Quests Management</h3>
          <div class="loading">
            <div class="spinner"></div>
            <p>Loading Quests...</p>
          </div>
        </div>
      </div>
    `;
    
    try {
      // الحصول على إحصائيات المهام
      let totalTasksCompleted = 0;
      let totalReferrals = 0;
      let totalDicePoints = 0;
      
      const usersSnap = await this.db.ref('users').once('value');
      usersSnap.forEach(child => {
        const user = child.val();
        totalTasksCompleted += user.totalTasks || 0;
        totalReferrals += user.referrals || 0;
        totalDicePoints += user.dicePoints || 0;
      });
      
      // تعريف المهام الافتراضية (كما في ninja.js)
      const diceQuests = [
        { target: 1000, reward: 0.01, completed: false, claimed: false },
        { target: 2000, reward: 0.02, completed: false, claimed: false },
        { target: 4000, reward: 0.04, completed: false, claimed: false },
        { target: 8000, reward: 0.08, completed: false, claimed: false },
        { target: 16000, reward: 0.16, completed: false, claimed: false },
        { target: 32000, reward: 0.32, completed: false, claimed: false },
        { target: 64000, reward: 0.64, completed: false, claimed: false }
      ];
      
      const tasksQuests = [
        { target: 10, reward: 0.01, completed: false, claimed: false },
        { target: 20, reward: 0.02, completed: false, claimed: false },
        { target: 40, reward: 0.04, completed: false, claimed: false },
        { target: 80, reward: 0.08, completed: false, claimed: false },
        { target: 160, reward: 0.16, completed: false, claimed: false },
        { target: 320, reward: 0.32, completed: false, claimed: false },
        { target: 640, reward: 0.64, completed: false, claimed: false },
        { target: 1280, reward: 1.28, completed: false, claimed: false },
        { target: 2560, reward: 2.56, completed: false, claimed: false }
      ];
      
      const referralQuests = [
        { target: 1, reward: 0.01, completed: false, claimed: false },
        { target: 5, reward: 0.02, completed: false, claimed: false },
        { target: 10, reward: 0.04, completed: false, claimed: false },
        { target: 20, reward: 0.08, completed: false, claimed: false },
        { target: 40, reward: 0.16, completed: false, claimed: false },
        { target: 80, reward: 0.32, completed: false, claimed: false },
        { target: 160, reward: 0.64, completed: false, claimed: false },
        { target: 320, reward: 1.28, completed: false, claimed: false },
        { target: 640, reward: 2.56, completed: false, claimed: false },
        { target: 1000, reward: 5, completed: false, claimed: false }
      ];
      
      this.elements.mainContent.innerHTML = `
        <div id="quests" class="page active">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                <i class="fas fa-dice"></i>
              </div>
              <div class="stat-content">
                <h3>Total Dice Points</h3>
                <p>${totalDicePoints.toLocaleString()}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                <i class="fas fa-tasks"></i>
              </div>
              <div class="stat-content">
                <h3>Tasks Completed</h3>
                <p>${totalTasksCompleted.toLocaleString()}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                <i class="fas fa-users"></i>
              </div>
              <div class="stat-content">
                <h3>Total Referrals</h3>
                <p>${totalReferrals.toLocaleString()}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
                <i class="fas fa-flag"></i>
              </div>
              <div class="stat-content">
                <h3>Quests Defined</h3>
                <p>${diceQuests.length + tasksQuests.length + referralQuests.length}</p>
              </div>
            </div>
          </div>
          
          <div class="quests-container">
            <div class="quests-section">
              <h3><i class="fas fa-dice"></i> Dice Quests</h3>
              <div class="quests-grid">
                ${diceQuests.map((quest, index) => `
                  <div class="quest-card">
                    <div class="quest-card-header">
                      <div class="quest-type-badge dice">Dice</div>
                      <div class="quest-target">Target: ${quest.target.toLocaleString()} points</div>
                    </div>
                    <div class="quest-card-body">
                      <div class="quest-reward">
                        <img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm">
                        ${quest.reward.toFixed(2)} TON
                      </div>
                      <div class="quest-progress">
                        <div class="progress-info">
                          <span>Global Progress:</span>
                          <span>${((totalDicePoints / quest.target) * 100).toFixed(1)}%</span>
                        </div>
                        <div class="progress-bar">
                          <div class="progress-fill" style="width: ${Math.min((totalDicePoints / quest.target) * 100, 100)}%"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="quests-section">
              <h3><i class="fas fa-tasks"></i> Tasks Quests</h3>
              <div class="quests-grid">
                ${tasksQuests.map((quest, index) => `
                  <div class="quest-card">
                    <div class="quest-card-header">
                      <div class="quest-type-badge tasks">Tasks</div>
                      <div class="quest-target">Target: ${quest.target} tasks</div>
                    </div>
                    <div class="quest-card-body">
                      <div class="quest-reward">
                        <img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm">
                        ${quest.reward.toFixed(2)} TON
                      </div>
                      <div class="quest-progress">
                        <div class="progress-info">
                          <span>Global Progress:</span>
                          <span>${((totalTasksCompleted / quest.target) * 100).toFixed(1)}%</span>
                        </div>
                        <div class="progress-bar">
                          <div class="progress-fill" style="width: ${Math.min((totalTasksCompleted / quest.target) * 100, 100)}%"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="quests-section">
              <h3><i class="fas fa-users"></i> Referral Quests</h3>
              <div class="quests-grid">
                ${referralQuests.map((quest, index) => `
                  <div class="quest-card">
                    <div class="quest-card-header">
                      <div class="quest-type-badge referral">Referral</div>
                      <div class="quest-target">Target: ${quest.target} referrals</div>
                    </div>
                    <div class="quest-card-body">
                      <div class="quest-reward">
                        <img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm">
                        ${quest.reward.toFixed(2)} TON
                      </div>
                      <div class="quest-progress">
                        <div class="progress-info">
                          <span>Global Progress:</span>
                          <span>${((totalReferrals / quest.target) * 100).toFixed(1)}%</span>
                        </div>
                        <div class="progress-bar">
                          <div class="progress-fill" style="width: ${Math.min((totalReferrals / quest.target) * 100, 100)}%"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
      
    } catch (error) {
      console.error("Error loading quests:", error);
      this.elements.mainContent.innerHTML = `
        <div id="quests" class="page active">
          <div class="card">
            <h3>Error loading quests</h3>
            <p>${error.message}</p>
          </div>
        </div>
      `;
    }
  }

  // باقي الدوال (renderWithdrawals, handleWithdrawal, renderPromoCodes, etc.)
  // تبقى كما هي مع تعديلات طفيفة للتوافق مع Ninja TON

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

  safeNumber(value) {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }
}

const admin = new AdminPanel();
window.admin = admin;
