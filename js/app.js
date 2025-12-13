class AdminPanel {
  constructor() {
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    this.appConfig = APP_DEFAULT_CONFIG;
    this.botToken = "8245344556:AAHePdCS2OC6z3Um6HweQqszFOhGpPWMlKU";
    
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
        totalAds: 0
      };
      
      if (appStatsSnap.exists()) {
        appStats = appStatsSnap.val();
      }
      
      // حساب إجمالي الـ GOLD و TON للمستخدمين
      let totalGold = 0;
      let totalTON = 0;
      let usersArray = [];
      
      usersSnap.forEach(child => {
        const user = child.val();
        usersArray.push({
          id: user.id || child.key,
          firstName: user.firstName || '',
          username: user.username || '',
          gold: this.safeNumber(user.gold),
          balance: this.safeNumber(user.balance),
          referrals: user.totalReferrals || user.referrals || 0,
          tasksCompleted: user.tasksCompleted || user.totalTasks || 0
        });
        
        totalGold += this.safeNumber(user.gold);
        totalTON += this.safeNumber(user.balance);
      });
      
      // Sort by balance (gold + ton converted to gold)
      const topByBalance = [...usersArray]
        .sort((a, b) => (b.gold + (b.balance * this.appConfig.exchangeRate)) - (a.gold + (a.balance * this.appConfig.exchangeRate)))
        .slice(0, 20);
      
      // Sort by referrals
      const topByReferrals = [...usersArray]
        .sort((a, b) => b.referrals - a.referrals)
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
              <span class="stat-badge gold">
                <img src="https://cdn-icons-png.flaticon.com/512/16035/16035538.png" alt="GOLD" class="coin-icon-sm">
                ${user.gold.toLocaleString()} GOLD
              </span>
              <span class="stat-badge ton">
                <img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm">
                ${user.balance.toFixed(3)} TON
              </span>
            </div>
          </div>
        `;
      });
      
      let topReferralsHTML = '';
      topByReferrals.forEach((user, index) => {
        topReferralsHTML += `
          <div class="dashboard-user-item">
            <div class="user-rank">${index + 1}</div>
            <div class="user-info">
              <strong>${user.firstName || 'User'}</strong>
              ${user.username ? `<br><small>@${user.username}</small>` : ''}
            </div>
            <div class="user-stats">
              <span class="stat-badge referral">
                <i class="fas fa-users"></i> ${user.referrals} Referrals
              </span>
              <span class="stat-badge task">
                <i class="fas fa-tasks"></i> ${user.tasksCompleted} Tasks
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
                <h3>Total GOLD</h3>
                <p>${totalGold.toLocaleString()}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">
                <i class="fab fa-telegram"></i>
              </div>
              <div class="stat-content">
                <h3>Total TON</h3>
                <p>${totalTON.toFixed(3)}</p>
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
                <h3><i class="fas fa-chart-line"></i> Top 20 Users by Referrals</h3>
                <div class="user-list-container">
                  ${topReferralsHTML || '<div class="empty-state">No users found</div>'}
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
      
      // الحصول على حالة المستخدم من config/id/status مثل التطبيق الأساسي
      const statusSnap = await this.db.ref(`config/${userId}/status`).once('value');
      const userStatus = statusSnap.exists() ? statusSnap.val() : 'free';
      
      // الحصول على المهام المكتملة
      const tasksCompleted = user.tasksCompleted || user.weeklyCompletedTasks?.length || 0;
      
      // الحصول على الإحالات (compatible with both old and new field names)
      const totalReferrals = user.totalReferrals || user.referrals || 0;
      const activeReferrals = user.activeReferrals || 0;
      const referralEarnings = user.referralEarnings || 0;
      
      // الحصول على التاريخ المتبقي للـ Hourly Bonus
      const lastHourlyBonus = user.lastHourlyBonus || 0;
      const hourlyBonusCooldown = 3600000; // ساعة واحدة
      const canClaimHourlyBonus = !lastHourlyBonus || (Date.now() - lastHourlyBonus) >= hourlyBonusCooldown;
      const timeRemaining = canClaimHourlyBonus ? "00:00" : this.formatTimeRemaining(hourlyBonusCooldown - (Date.now() - lastHourlyBonus));

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
              <div class="user-stat-icon gold">
                <img src="https://cdn-icons-png.flaticon.com/512/16035/16035538.png" alt="GOLD" class="coin-icon-sm">
              </div>
              <div class="user-stat-content">
                <h4>GOLD Balance</h4>
                <p>${(user.gold || 0).toLocaleString()}</p>
              </div>
            </div>
            
            <div class="user-stat-card">
              <div class="user-stat-icon ton">
                <img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm">
              </div>
              <div class="user-stat-content">
                <h4>TON Balance</h4>
                <p>${(user.balance || 0).toFixed(3)}</p>
              </div>
            </div>
            
            <div class="user-stat-card">
              <div class="user-stat-icon referral">
                <i class="fas fa-users"></i>
              </div>
              <div class="user-stat-content">
                <h4>Total Referrals</h4>
                <p>${totalReferrals}</p>
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
                  <span class="info-label">Active Referrals:</span>
                  <span class="info-value">${activeReferrals}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Referral Earnings:</span>
                  <span class="info-value gold-text">${referralEarnings.toLocaleString()} GOLD</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Earned:</span>
                  <span class="info-value gold-text">${(user.totalEarned || 0).toLocaleString()} GOLD</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Hourly Bonus:</span>
                  <span class="info-value ${canClaimHourlyBonus ? 'success-text' : 'warning-text'}">
                    ${canClaimHourlyBonus ? 'Available' : `Wait ${timeRemaining}`}
                  </span>
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
                <i class="fas fa-plus-circle"></i> Add Balance
              </button>
              <button class="action-btn btn-danger" onclick="admin.showRemoveBalanceModal('${userId}', '${user.firstName || 'User'}')">
                <i class="fas fa-minus-circle"></i> Remove Balance
              </button>
              ${userStatus === 'free' ? 
                `<button class="action-btn btn-warning" onclick="admin.banUser('${userId}')">
                  <i class="fas fa-ban"></i> Ban User
                </button>` : 
                `<button class="action-btn btn-info" onclick="admin.unbanUser('${userId}')">
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

  formatTimeRemaining(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
              <label for="addBalanceType">Balance Type</label>
              <select id="addBalanceType" class="form-input">
                <option value="gold">GOLD</option>
                <option value="ton">TON</option>
              </select>
            </div>
            <div class="form-group">
              <label for="addBalanceAmount">Amount</label>
              <input type="number" id="addBalanceAmount" placeholder="Enter amount" step="0.001" min="0">
              <small>For GOLD: whole numbers | For TON: decimals allowed</small>
            </div>
            <div class="form-group">
              <label for="addBalanceReason">Reason</label>
              <input type="text" id="addBalanceReason" placeholder="Reason for adding balance">
              <small>This will be recorded in history</small>
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
              <label for="removeBalanceType">Balance Type</label>
              <select id="removeBalanceType" class="form-input">
                <option value="gold">GOLD</option>
                <option value="ton">TON</option>
              </select>
            </div>
            <div class="form-group">
              <label for="removeBalanceAmount">Amount</label>
              <input type="number" id="removeBalanceAmount" placeholder="Enter amount" step="0.001" min="0">
              <small>For GOLD: whole numbers | For TON: decimals allowed</small>
            </div>
            <div class="form-group">
              <label for="removeBalanceReason">Reason</label>
              <input type="text" id="removeBalanceReason" placeholder="Reason for removing balance">
              <small>This will be recorded in history</small>
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
    const type = document.getElementById('addBalanceType').value;
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
      const currentBalance = type === 'gold' ? (user.gold || 0) : (user.balance || 0);
      const newBalance = currentBalance + amount;

      const updateData = {};
      if (type === 'gold') {
        updateData[`users/${userId}/gold`] = newBalance;
      } else {
        updateData[`users/${userId}/balance`] = newBalance;
      }

      await this.db.ref().update(updateData);

      // Add to balance history
      const balanceHistory = {
        telegramId: userId,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
        balanceType: type,
        amount: amount,
        reason: reason,
        previousBalance: currentBalance,
        newBalance: newBalance,
        adminId: 'admin',
        timestamp: Date.now(),
        date: new Date().toLocaleString()
      };

      await this.db.ref('balanceHistory').push(balanceHistory);

      this.showNotification("Success", `Added ${amount} ${type.toUpperCase()} to user`, "success");
      
      // Close modal and refresh user details
      document.querySelector('#addBalanceModal').remove();
      await this.searchUser();
      
    } catch (error) {
      console.error("Error adding balance:", error);
      this.showNotification("Error", "Failed to add balance", "error");
    }
  }

  async removeBalance(userId) {
    const type = document.getElementById('removeBalanceType').value;
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
      const currentBalance = type === 'gold' ? (user.gold || 0) : (user.balance || 0);
      
      if (currentBalance < amount) {
        this.showNotification("Error", `User only has ${currentBalance} ${type.toUpperCase()}`, "error");
        return;
      }

      const newBalance = currentBalance - amount;

      const updateData = {};
      if (type === 'gold') {
        updateData[`users/${userId}/gold`] = newBalance;
      } else {
        updateData[`users/${userId}/balance`] = newBalance;
      }

      await this.db.ref().update(updateData);

      // Add to balance history
      const balanceHistory = {
        telegramId: userId,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
        balanceType: type,
        amount: -amount,
        reason: reason,
        previousBalance: currentBalance,
        newBalance: newBalance,
        adminId: 'admin',
        timestamp: Date.now(),
        date: new Date().toLocaleString()
      };

      await this.db.ref('balanceHistory').push(balanceHistory);

      this.showNotification("Success", `Removed ${amount} ${type.toUpperCase()} from user`, "success");
      
      // Close modal and refresh user details
      document.querySelector('#removeBalanceModal').remove();
      await this.searchUser();
      
    } catch (error) {
      console.error("Error removing balance:", error);
      this.showNotification("Error", "Failed to remove balance", "error");
    }
  }

  async banUser(userId) {
    if (!confirm('Are you sure you want to ban this user?')) return;

    try {
      await this.db.ref(`config/${userId}`).update({
        status: 'banned',
        bannedAt: Date.now(),
        bannedBy: 'admin'
      });

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
      await this.db.ref(`config/${userId}`).update({
        status: 'free',
        unbannedAt: Date.now(),
        unbannedBy: 'admin'
      });

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
            <h3><i class="fas fa-tasks"></i> Tasks Management</h3>
            
            <div class="form-group">
              <label for="taskName">Task Name *</label>
              <input type="text" id="taskName" placeholder="e.g., Join Our Channel" required>
            </div>
            
            <div class="form-group">
              <label for="taskLink">Task Link (URL) *</label>
              <input type="text" id="taskLink" placeholder="https://t.me/..." required>
              <small>For channels/groups: Add @${this.appConfig.botUsername} as admin</small>
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
              <label>Number of Completions *</label>
              <div class="completion-options-grid">
                ${Object.keys(this.appConfig.taskPrices).map(users => `
                  <div class="completion-option" data-users="${users}">
                    <div class="users-count">${users}</div>
                    <small>Users</small>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="form-group">
              <label for="taskReward">Reward per User (GOLD) *</label>
              <input type="number" id="taskReward" placeholder="50" value="50" min="10" step="1">
              <small>How much GOLD each user gets for completing</small>
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
            // حساب النسبة المئوية للإنجاز
            const currentCompletions = task.currentCompletions || 0;
            const maxCompletions = task.maxCompletions || 100;
            const progress = Math.min((currentCompletions / maxCompletions) * 100, 100);
            
            // تحديد الحالة بناءً على النسبة
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
                      <img src="https://cdn-icons-png.flaticon.com/512/16035/16035538.png" alt="GOLD" class="coin-icon-sm">
                      ${task.reward || 50} GOLD
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
                  <div class="task-detail">
                    <span class="detail-label">Created By:</span>
                    <span>${task.createdBy || 'admin'}</span>
                  </div>
                  <div class="task-detail">
                    <span class="detail-label">Created At:</span>
                    <span>${task.createdAt ? new Date(task.createdAt).toLocaleString() : 'N/A'}</span>
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

  setupTaskFormEvents() {
    // Category buttons
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        categoryButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    
    // Completion options
    const completionOptions = document.querySelectorAll('.completion-option');
    completionOptions.forEach(option => {
      option.addEventListener('click', () => {
        completionOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
      });
    });
  }

  async addNewTask() {
    const taskName = document.getElementById('taskName').value.trim();
    const taskLink = document.getElementById('taskLink').value.trim();
    const taskReward = parseInt(document.getElementById('taskReward').value) || 50;
    
    const selectedCategory = document.querySelector('.category-btn.active').dataset.category;
    const selectedOption = document.querySelector('.completion-option.selected');
    
    if (!taskName || !taskLink) {
      this.showNotification("Error", "Please fill all required fields", "error");
      return;
    }
    
    if (!selectedOption) {
      this.showNotification("Error", "Please select number of completions", "error");
      return;
    }
    
    const maxCompletions = parseInt(selectedOption.dataset.users);
    
    try {
      let cleanLink = taskLink.trim();
      
      // نفس منطق معالجة الروابط في التطبيق الأساسي
      if (!cleanLink.startsWith('http') && !cleanLink.startsWith('@')) {
        cleanLink = 'https://t.me/' + cleanLink;
      } else if (cleanLink.startsWith('@')) {
        cleanLink = 'https://t.me/' + cleanLink.substring(1);
      }
      
      // تحقق من عدم وجود المهمة مسبقاً بنفس الرابط
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
        description: "Join channel & get reward",
        type: selectedCategory,
        url: cleanLink,
        maxCompletions: maxCompletions,
        reward: taskReward,
        createdBy: 'admin',
        status: 'active',
        currentCompletions: 0,
        createdAt: Date.now()
      };
      
      await this.db.ref('config/tasks').push(taskData);
      
      // تحديث إحصائيات التطبيق
      await this.updateAppStats('totalTasks', 1);
      
      this.showNotification("Success", `Task "${taskName}" created successfully!`, "success");
      
      // Reset form
      document.getElementById('taskName').value = '';
      document.getElementById('taskLink').value = '';
      document.getElementById('taskReward').value = '50';
      
      // Refresh tasks list
      await this.loadTasksList();
      
    } catch (error) {
      console.error("Error adding task:", error);
      this.showNotification("Error", "Failed to create task", "error");
    }
  }

  async deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      // تحديث حالة المهمة بدلاً من حذفها (متوافق مع التطبيق الأساسي)
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
      const withdrawalsSnap = await this.db.ref('withdrawals/pending').once('value');
      let withdrawalsContent = '';
      let requests = [];
      
      if (withdrawalsSnap.exists()) {
        withdrawalsSnap.forEach(child => {
          requests.push({ id: child.key, ...child.val() });
        });
      }
      
      if (requests.length > 0) {
        // الحصول على بيانات جميع المستخدمين دفعة واحدة لتحسين الأداء
        const userIds = requests.map(req => req.userId).filter(id => id);
        const userPromises = userIds.map(userId => this.db.ref(`users/${userId}`).once('value'));
        const userSnapshots = await Promise.all(userPromises);
        
        const usersData = {};
        userSnapshots.forEach((snap, index) => {
          if (snap.exists()) {
            usersData[userIds[index]] = snap.val();
          }
        });
        
        for (const req of requests) {
          const user = usersData[req.userId] || {};
          
          withdrawalsContent += `
            <div class="withdrawal-card">
              <div class="withdrawal-header">
                <div class="withdrawal-user">
                  <strong>${req.userName || user.firstName || 'Unknown User'}</strong>
                  <div class="user-meta">
                    <span><i class="fab fa-telegram"></i> ${user.username ? '@' + user.username : 'No username'}</span>
                    <span><i class="fas fa-id-card"></i> ID: ${req.userId}</span>
                  </div>
                </div>
                <div class="withdrawal-amount">
                  <img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm">
                  ${req.tonAmount || req.amount || 0} TON
                  <div class="gold-amount">
                    <img src="https://cdn-icons-png.flaticon.com/512/16035/16035538.png" alt="GOLD" class="coin-icon-sm">
                    ${req.goldAmount ? req.goldAmount.toLocaleString() : '0'} GOLD
                  </div>
                </div>
              </div>
              
              <div class="withdrawal-details-grid">
                <div class="detail-item">
                  <span class="detail-label">First Name:</span>
                  <span class="detail-value">${user.firstName || 'N/A'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Username:</span>
                  <span class="detail-value">${user.username ? '@' + user.username : 'N/A'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Total Referrals:</span>
                  <span class="detail-value">${user.totalReferrals || user.referrals || 0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Tasks Completed:</span>
                  <span class="detail-value">${user.tasksCompleted || 0}</span>
                </div>
                <div class="detail-item full-width">
                  <span class="detail-label">Amount:</span>
                  <span class="detail-value amount-highlight">
                    <img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm">
                    ${req.tonAmount || req.amount || 0} TON
                    (${req.goldAmount ? req.goldAmount.toLocaleString() : '0'} GOLD)
                  </span>
                </div>
                <div class="detail-item full-width">
                  <span class="detail-label">Wallet Address:</span>
                  <span class="detail-value wallet-address">${req.walletAddress || req.account || 'Not specified'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${new Date(req.createdAt || req.timestamp).toLocaleString()}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value status-pending">Pending</span>
                </div>
              </div>
              
              <div class="withdrawal-actions">
                <button class="action-btn btn-success" onclick="admin.handleWithdrawal('${req.id}', 'approve')">
                  <i class="fas fa-check"></i> Approve
                </button>
                <button class="action-btn btn-danger" onclick="admin.handleWithdrawal('${req.id}', 'reject')">
                  <i class="fas fa-times"></i> Reject
                </button>
              </div>
            </div>
          `;
        }
      } else {
        withdrawalsContent = `
          <div class="empty-state">
            <i class="fas fa-wallet"></i>
            <h3>No Pending Withdrawals</h3>
            <p>There are no pending withdrawal requests.</p>
          </div>
        `;
      }
      
      this.elements.mainContent.innerHTML = `
        <div id="withdrawals" class="page active">
          <div class="withdrawals-header">
            <h3><i class="fas fa-wallet"></i> Pending Withdrawals</h3>
            <span class="badge">${requests.length}</span>
          </div>
          ${withdrawalsContent}
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

  async handleWithdrawal(requestId, action) {
    try {
      const requestRef = this.db.ref(`withdrawals/pending/${requestId}`);
      const snapshot = await requestRef.once('value');
      const request = snapshot.val();
      
      if (!request) {
        this.showNotification("Error", "Request not found", "error");
        return;
      }
      
      const status = action === 'approve' ? 'completed' : 'rejected';
      const targetPath = `withdrawals/${status}/${requestId}`;
      
      await this.db.ref(targetPath).set({
        ...request,
        status: status,
        processedAt: Date.now(),
        processedBy: 'admin'
      });
      
      await requestRef.remove();
      
      // تحديث إحصائيات التطبيق
      if (status === 'completed') {
        await this.updateAppStats('totalWithdrawals', 1);
      }
      
      this.showNotification("Success", `Withdrawal ${status} successfully`, "success");
      this.renderWithdrawals();
      
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      this.showNotification("Error", "Failed to process withdrawal", "error");
    }
  }

  async renderPromoCodes() {
    this.elements.mainContent.innerHTML = `
      <div id="promoCodes" class="page active">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading Promo Codes...</p>
        </div>
      </div>
    `;
    
    try {
      const promoCodesSnap = await this.db.ref('config/promoCodes').once('value');
      let promoCodesContent = '';
      let promoCodesList = [];
      
      if (promoCodesSnap.exists()) {
        promoCodesSnap.forEach(child => {
          const promo = { id: child.key, ...child.val() };
          promoCodesList.push(promo);
          
          promoCodesContent += `
            <div class="promo-card">
              <div class="promo-header">
                <div class="promo-code">${promo.code}</div>
                <div class="promo-reward">
                  ${promo.type === 'ton' ? 
                    `<img src="https://logo.svgcdn.com/token-branded/ton.png" alt="TON" class="coin-icon-sm"> ${promo.reward} TON` : 
                    `<img src="https://cdn-icons-png.flaticon.com/512/16035/16035538.png" alt="GOLD" class="coin-icon-sm"> ${promo.reward} GOLD`
                  }
                </div>
              </div>
              <div class="promo-stats">
                <span><strong>Type:</strong> <span class="promo-type ${promo.type}">${promo.type.toUpperCase()}</span></span>
                <span><strong>Created:</strong> ${new Date(promo.createdAt).toLocaleDateString()}</span>
                <span><strong>Used:</strong> ${promo.usedCount || 0} times</span>
              </div>
              <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="action-btn btn-danger" onclick="admin.deletePromoCode('${promo.id}')">
                  <i class="fas fa-trash"></i> Delete
                </button>
              </div>
            </div>
          `;
        });
      } else {
        promoCodesContent = `
          <div class="empty-state">
            <i class="fas fa-gift"></i>
            <h3>No Promo Codes Found</h3>
            <p>No promo codes have been created yet.</p>
          </div>
        `;
      }
      
      this.elements.mainContent.innerHTML = `
        <div id="promoCodes" class="page active">
          <div class="promo-management">
            <div class="card">
              <h3><i class="fas fa-gift"></i> Create New Promo Code</h3>
              <div class="form-group">
                <label for="promoType">Reward Type</label>
                <select id="promoType" class="form-input">
                  <option value="gold">GOLD</option>
                  <option value="ton">TON</option>
                </select>
              </div>
              <div class="form-group">
                <label for="promoReward">Reward Amount</label>
                <input type="number" id="promoReward" placeholder="Enter reward amount" min="1" step="1">
              </div>
              <div class="form-group">
                <label for="customCode">Custom Code (Optional)</label>
                <input type="text" id="customCode" placeholder="Leave empty for auto-generate" maxlength="12">
                <small>Leave empty to generate random 8-character code</small>
              </div>
              <button class="action-btn btn-success" style="width: 100%;" onclick="admin.createPromoCode()">
                <i class="fas fa-plus-circle"></i> Generate Promo Code
              </button>
            </div>
            
            <div class="card">
              <div class="promo-codes-header">
                <h3><i class="fas fa-list"></i> Active Promo Codes</h3>
                <span class="badge">${promoCodesList.length}</span>
              </div>
              ${promoCodesContent}
            </div>
          </div>
        </div>
      `;
      
    } catch (error) {
      console.error("Error loading promo codes:", error);
      this.elements.mainContent.innerHTML = `
        <div id="promoCodes" class="page active">
          <div class="error-message">
            <h3>Error loading promo codes</h3>
            <p>${error.message}</p>
          </div>
        </div>
      `;
    }
  }

  async createPromoCode() {
    const type = document.getElementById('promoType').value;
    const reward = parseFloat(document.getElementById('promoReward').value);
    const customCode = document.getElementById('customCode').value.trim().toUpperCase();
    
    if (!reward || reward <= 0) {
      this.showNotification("Error", "Please enter a valid reward amount", "error");
      return;
    }
    
    const code = customCode || this.generatePromoCode(8);
    
    if (code.length < 4) {
      this.showNotification("Error", "Promo code must be at least 4 characters long", "error");
      return;
    }
    
    try {
      const existingSnap = await this.db.ref('config/promoCodes').orderByChild('code').equalTo(code).once('value');
      if (existingSnap.exists()) {
        this.showNotification("Error", "This promo code already exists", "error");
        return;
      }
      
      const promoData = {
        code: code,
        type: type,
        reward: reward,
        createdAt: Date.now(),
        usedCount: 0,
        createdBy: 'admin'
      };
      
      await this.db.ref('config/promoCodes').push(promoData);
      
      this.showNotification("Success", `Promo code created: ${code}`, "success");
      
      document.getElementById('promoReward').value = '';
      document.getElementById('customCode').value = '';
      
      this.renderPromoCodes();
      
    } catch (error) {
      console.error("Error creating promo code:", error);
      this.showNotification("Error", "Failed to create promo code", "error");
    }
  }

  async deletePromoCode(promoId) {
    if (!confirm('Are you sure you want to delete this promo code?')) return;
    
    try {
      await this.db.ref(`config/promoCodes/${promoId}`).remove();
      this.showNotification("Success", "Promo code deleted", "success");
      this.renderPromoCodes();
    } catch (error) {
      console.error("Error deleting promo code:", error);
      this.showNotification("Error", "Failed to delete promo code", "error");
    }
  }

  generatePromoCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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

  async updateAppStats(stat, value = 1) {
    try {
      if (!this.db) return;
      await this.db.ref(`appStats/${stat}`).transaction(current => (current || 0) + value);
    } catch (error) {
      console.error("Update stats error:", error);
    }
  }

  safeNumber(value) {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }
}

const admin = new AdminPanel();
window.admin = admin;
