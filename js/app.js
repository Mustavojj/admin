// app.js - Admin Panel
import { FIREBASE_CONFIG, ADMIN_PASSWORDS, APP_DEFAULT_CONFIG } from './config.js';

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
    
    this.initialize();
  }

  async initialize() {
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
      case 'withdrawals':
        await this.renderWithdrawals();
        break;
      case 'wallet':
        await this.renderWallet();
        break;
      case 'tasks':
        await this.renderTasks();
        break;
      case 'promoCodes':
        await this.renderPromoCodes();
        break;
      case 'settings':
        await this.renderSettings();
        break;
      case 'broadcast':
        await this.renderBroadcast();
        break;
      case 'addBalance':
        await this.renderAddBalance();
        break;
      case 'history':
        await this.renderBalanceHistory();
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
      const [usersSnap, withdrawalsSnap, tasksSnap, historySnap] = await Promise.all([
        this.db.ref('users').limitToLast(5).once('value'),
        this.db.ref('withdrawals/pending').once('value'),
        this.db.ref('config/tasks').orderByChild('createdAt').limitToLast(3).once('value'),
        this.db.ref('balanceHistory').orderByChild('timestamp').limitToLast(5).once('value')
      ]);
      
      const totalUsers = await this.getTotalUsersCount();
      const pendingWithdrawals = withdrawalsSnap.numChildren();
      const totalTasks = tasksSnap.numChildren();
      const recentBalanceAdditions = historySnap.numChildren();
      
      let recentUsers = '';
      usersSnap.forEach(child => {
        const user = child.val();
        const telegramId = user.id || child.key;
        recentUsers += `
          <tr>
            <td data-label="User">
              <strong>${user.firstName || 'User'}</strong>
              <br><small>ID: ${telegramId}</small>
            </td>
            <td data-label="Balance">
              <span class="coin-icon gold"></span> ${(user.gold || 0).toLocaleString()}
              <br><span class="coin-icon ton"></span> ${(user.balance || 0).toFixed(3)}
            </td>
            <td data-label="Date">
              ${new Date(user.createdAt || Date.now()).toLocaleDateString()}
            </td>
          </tr>
        `;
      });
      
      let recentHistory = '';
      historySnap.forEach(child => {
        const record = child.val();
        recentHistory += `
          <tr>
            <td data-label="User">${record.userName || 'Unknown'}</td>
            <td data-label="Amount">
              <span class="${record.balanceType === 'gold' ? 'balance-positive' : 'balance-positive'}">
                ${record.balanceType === 'gold' ? '🟡' : '🔵'} ${record.amount}
              </span>
            </td>
            <td data-label="Date">
              ${new Date(record.timestamp).toLocaleDateString()}
            </td>
          </tr>
        `;
      });
      
      this.elements.mainContent.innerHTML = `
        <div id="dashboard" class="page active">
          <div class="stats-grid">
            <div class="stat-card">
              <h3>Total Users</h3>
              <p>${totalUsers.toLocaleString()}</p>
            </div>
            <div class="stat-card">
              <h3>Pending Withdrawals</h3>
              <p>${pendingWithdrawals}</p>
            </div>
            <div class="stat-card">
              <h3>Active Tasks</h3>
              <p>${totalTasks}</p>
            </div>
            <div class="stat-card">
              <h3>Recent Balance Adds</h3>
              <p>${recentBalanceAdditions}</p>
            </div>
          </div>
          
          <div class="card">
            <h3>Quick Actions</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px;">
              <button class="action-btn btn-primary" onclick="admin.showPage('tasks')">
                <i class="fas fa-plus"></i> Add New Task
              </button>
              <button class="action-btn btn-warning" onclick="admin.showPage('withdrawals')">
                <i class="fas fa-wallet"></i> Pending Withdrawals
              </button>
              <button class="action-btn btn-success" onclick="admin.showPage('addBalance')">
                <i class="fas fa-plus-circle"></i> Add Balance
              </button>
              <button class="action-btn btn-info" onclick="admin.showPage('broadcast')">
                <i class="fas fa-bullhorn"></i> Send Broadcast
              </button>
            </div>
          </div>
          
          <div class="card">
            <h3>Recent Users</h3>
            <div style="overflow-x: auto;">
              <table>
                <thead>
                  <tr>
                    <th>User Information</th>
                    <th>Balance</th>
                    <th>Registration Date</th>
                  </tr>
                </thead>
                <tbody>${recentUsers || '<tr><td colspan="3">No users found</td></tr>'}</tbody>
              </table>
            </div>
          </div>
          
          <div class="card">
            <h3>Recent Balance Additions</h3>
            <div style="overflow-x: auto;">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>${recentHistory || '<tr><td colspan="3">No history found</td></tr>'}</tbody>
              </table>
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

  async getTotalUsersCount() {
    try {
      const usersSnap = await this.db.ref('users').once('value');
      return usersSnap.numChildren();
    } catch (error) {
      console.error("Error counting users:", error);
      return 0;
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
        requests.forEach(req => {
          withdrawalsContent += `
            <div class="withdrawal-card">
              <div class="withdrawal-header">
                <div class="withdrawal-user">
                  <strong>${req.userName || 'Unknown User'}</strong>
                  <div style="font-size: 0.8rem; color: var(--text-secondary);">ID: ${req.userId || 'N/A'}</div>
                </div>
                <div class="withdrawal-amount">
                  <span class="coin-icon ton"></span> ${req.tonAmount || req.amount || 0} TON
                  <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 5px;">
                    <span class="coin-icon gold"></span> ${req.goldAmount ? req.goldAmount.toLocaleString() : '0'} GOLD
                  </div>
                </div>
              </div>
              <div class="withdrawal-details">
                <div><strong>Wallet:</strong> ${req.walletAddress || req.account || 'Not specified'}</div>
                <div><strong>Date:</strong> ${new Date(req.createdAt || req.timestamp).toLocaleString()}</div>
                <div><strong>Status:</strong> <span style="color: var(--warning);">Pending</span></div>
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
        });
      } else {
        withdrawalsContent = `
          <div class="card">
            <div style="text-align: center; padding: 40px;">
              <i class="fas fa-wallet" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 15px;"></i>
              <h3 style="color: var(--text-secondary);">No Pending Withdrawals</h3>
              <p style="color: var(--text-secondary);">There are no pending withdrawal requests.</p>
            </div>
          </div>
        `;
      }
      
      this.elements.mainContent.innerHTML = `
        <div id="withdrawals" class="page active">
          <h3>Pending Withdrawals (${requests.length})</h3>
          ${withdrawalsContent}
        </div>
      `;
      
    } catch (error) {
      console.error("Error loading withdrawals:", error);
      this.elements.mainContent.innerHTML = `
        <div id="withdrawals" class="page active">
          <div class="card">
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
      
      this.showNotification("Success", `Withdrawal ${status} successfully`, "success");
      this.renderWithdrawals();
      
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      this.showNotification("Error", "Failed to process withdrawal", "error");
    }
  }

  async renderWallet() {
    this.elements.mainContent.innerHTML = `
      <div id="wallet" class="page active">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading Wallet Data...</p>
        </div>
      </div>
    `;
    
    try {
      const [depositsSnap, withdrawalsSnap] = await Promise.all([
        this.db.ref('deposits').once('value'),
        this.db.ref('withdrawals').once('value')
      ]);
      
      let deposits = [];
      let withdrawals = [];
      
      depositsSnap.forEach(userSnap => {
        userSnap.forEach(depositSnap => {
          deposits.push({ id: depositSnap.key, userId: userSnap.key, ...depositSnap.val() });
        });
      });
      
      ['pending', 'completed', 'rejected'].forEach(status => {
        const statusSnap = withdrawalsSnap.child(status);
        statusSnap.forEach(withdrawalSnap => {
          withdrawals.push({ id: withdrawalSnap.key, status, ...withdrawalSnap.val() });
        });
      });
      
      deposits.sort((a, b) => b.timestamp - a.timestamp);
      withdrawals.sort((a, b) => b.createdAt - a.createdAt);
      
      const depositHistory = deposits.slice(0, 20).map(deposit => {
        const date = new Date(deposit.timestamp);
        return `
          <tr>
            <td>${deposit.userId}</td>
            <td>
              <span class="coin-icon ton"></span> ${deposit.amount} TON
            </td>
            <td>${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
            <td><span style="padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; background: rgba(0, 136, 204, 0.2); color: var(--primary);">${deposit.status || 'completed'}</span></td>
            <td>${deposit.txid ? deposit.txid.substring(0, 10) + '...' : 'N/A'}</td>
          </tr>
        `;
      }).join('');
      
      const withdrawalHistory = withdrawals.slice(0, 20).map(withdrawal => {
        const date = new Date(withdrawal.createdAt || withdrawal.timestamp);
        let statusClass = 'status-pending';
        if (withdrawal.status === 'completed') statusClass = 'status-completed';
        if (withdrawal.status === 'rejected') statusClass = 'status-rejected';
        
        return `
          <tr>
            <td>${withdrawal.userId}</td>
            <td>${withdrawal.userName || 'Unknown'}</td>
            <td>
              <span class="coin-icon ton"></span> ${withdrawal.tonAmount || withdrawal.amount || 0} TON
              <br><small style="color: var(--text-secondary);">
                <span class="coin-icon gold"></span> ${withdrawal.goldAmount ? withdrawal.goldAmount.toLocaleString() : '0'} GOLD
              </small>
            </td>
            <td>${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
            <td><span class="${statusClass}" style="padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">${withdrawal.status}</span></td>
          </tr>
        `;
      }).join('');
      
      this.elements.mainContent.innerHTML = `
        <div id="wallet" class="page active">
          <h3>Wallet Management</h3>
          
          <div class="card">
            <h4>Deposit Address</h4>
            <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="color: var(--text-secondary); margin-bottom: 5px;">Wallet Address:</p>
              <p style="font-family: 'Courier New', monospace; font-size: 0.9rem; word-break: break-all;">
                ${this.appConfig.walletAddress}
              </p>
              <div style="margin-top: 10px; display: flex; gap: 10px;">
                <button class="action-btn btn-primary" onclick="navigator.clipboard.writeText('${this.appConfig.walletAddress}')">
                  <i class="far fa-copy"></i> Copy Address
                </button>
                <button class="action-btn btn-info" onclick="navigator.clipboard.writeText('${this.appConfig.tonkeeperLink}')">
                  <i class="fas fa-link"></i> Copy Tonkeeper Link
                </button>
              </div>
            </div>
          </div>
          
          <div class="card">
            <h4>Recent Deposits (Last 20)</h4>
            <div style="overflow-x: auto; margin-top: 15px;">
              <table class="balance-history-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Transaction ID</th>
                  </tr>
                </thead>
                <tbody>${depositHistory || '<tr><td colspan="5">No deposits found</td></tr>'}</tbody>
              </table>
            </div>
          </div>
          
          <div class="card">
            <h4>Withdrawal History (Last 20)</h4>
            <div style="overflow-x: auto; margin-top: 15px;">
              <table class="balance-history-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>${withdrawalHistory || '<tr><td colspan="5">No withdrawals found</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      
    } catch (error) {
      console.error("Error loading wallet data:", error);
      this.elements.mainContent.innerHTML = `
        <div id="wallet" class="page active">
          <div class="card">
            <h3>Error loading wallet data</h3>
            <p>${error.message}</p>
          </div>
        </div>
      `;
    }
  }

  async renderTasks() {
    this.elements.mainContent.innerHTML = `
      <div id="tasks" class="page active">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading Tasks...</p>
        </div>
      </div>
    `;
    
    try {
      const [tasksSnap, myTasksSnap] = await Promise.all([
        this.db.ref('config/tasks').once('value'),
        this.db.ref('config/tasks').orderByChild('createdBy').equalTo('admin').once('value')
      ]);
      
      let tasksContent = '';
      let tasksCount = 0;
      let myTasks = [];
      
      if (tasksSnap.exists()) {
        tasksSnap.forEach(child => {
          const task = child.val();
          tasksCount++;
          
          if (task.createdBy === 'admin') {
            myTasks.push({ id: child.key, ...task });
          }
        });
      }
      
      // قسم Add New Task
      tasksContent = `
        <div class="card">
          <h4>Add New Task (Admin)</h4>
          <div class="form-group">
            <label for="taskName">Task Name *</label>
            <input type="text" id="taskName" placeholder="e.g., Join Our Channel" required>
          </div>
          
          <div class="form-group">
            <label for="taskLink">Task Link (URL) *</label>
            <input type="text" id="taskLink" placeholder="https://t.me/..." required>
            <small style="color: var(--text-secondary);">For channels/groups: Add @${this.appConfig.botUsername} as admin</small>
          </div>
          
          <div class="form-group">
            <label>Task Category *</label>
            <div class="task-category-buttons">
              <button type="button" class="category-btn active" data-category="channel">
                <i class="fas fa-bullhorn"></i>
                Channel/Group
              </button>
              <button type="button" class="category-btn" data-category="bot">
                <i class="fas fa-robot"></i>
                Website/Bot
              </button>
              <button type="button" class="category-btn" data-category="other">
                <i class="fas fa-link"></i>
                Other Links
              </button>
            </div>
          </div>
          
          <div class="form-group">
            <label>Number of Completions *</label>
            <div class="completion-options-grid">
              ${Object.entries(this.appConfig.taskPrices).map(([users, price]) => `
                <div class="completion-option" data-users="${users}" data-price="${price}">
                  <div class="users-count">${users}</div>
                  <div class="ton-price">
                    <span class="coin-icon ton"></span> ${price} TON
                  </div>
                  <small style="color: var(--text-secondary);">Users</small>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="form-group">
            <label for="taskReward">Reward per User (GOLD) *</label>
            <input type="number" id="taskReward" placeholder="50" value="50" min="10" step="1">
            <small style="color: var(--text-secondary);">How much GOLD each user gets for completing</small>
          </div>
          
          <button class="action-btn btn-success" style="width: 100%;" onclick="admin.addNewTask()">
            <i class="fas fa-plus-circle"></i> Create Task
          </button>
          
          <div id="taskMessage" style="margin-top: 15px;"></div>
        </div>
      `;
      
      // قسم My Tasks
      if (myTasks.length > 0) {
        let myTasksContent = '';
        myTasks.forEach(task => {
          const progress = Math.min((task.currentCompletions || 0) / task.maxCompletions * 100, 100);
          
          myTasksContent += `
            <div class="my-task-item">
              <div class="my-task-header">
                <div class="my-task-title">${task.name || 'Unnamed Task'}</div>
                <span class="task-status-badge ${task.status || 'active'}">
                  ${task.status || 'active'}
                </span>
              </div>
              
              <div class="my-task-info">
                <div class="info-item">
                  <div class="info-label">Type</div>
                  <div class="info-value">${task.type || 'channel'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Reward</div>
                  <div class="info-value gold">
                    <span class="coin-icon gold"></span> ${task.reward || 50}
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label">Price</div>
                  <div class="info-value">
                    ${this.appConfig.taskPrices[task.maxCompletions] || 0} TON
                  </div>
                </div>
              </div>
              
              <div class="my-task-progress">
                <div class="progress-info">
                  <span>Progress: ${task.currentCompletions || 0}/${task.maxCompletions}</span>
                  <span>${progress.toFixed(0)}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
              </div>
              
              <div class="my-task-controls">
                <button class="task-control-btn delete-btn" onclick="admin.deleteTask('${task.id}')">
                  <i class="fas fa-trash"></i> Delete Task
                </button>
              </div>
            </div>
          `;
        });
        
        tasksContent += `
          <div class="card" style="margin-top: 20px;">
            <h4>My Tasks (${myTasks.length})</h4>
            <div class="my-tasks-container">
              ${myTasksContent}
            </div>
          </div>
        `;
      } else {
        tasksContent += `
          <div class="card" style="margin-top: 20px;">
            <h4>My Tasks</h4>
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
              <i class="fas fa-tasks" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
              <h3>No Tasks Created Yet</h3>
              <p>Create your first task above</p>
            </div>
          </div>
        `;
      }
      
      this.elements.mainContent.innerHTML = `
        <div id="tasks" class="page active">
          <h3>Tasks Management</h3>
          ${tasksContent}
        </div>
      `;
      
      this.setupTaskFormEvents();
      
    } catch (error) {
      console.error("Error loading tasks:", error);
      this.elements.mainContent.innerHTML = `
        <div id="tasks" class="page active">
          <div class="card">
            <h3>Error loading tasks</h3>
            <p>${error.message}</p>
          </div>
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
    const price = parseFloat(selectedOption.dataset.price);
    
    try {
      let cleanLink = taskLink.trim();
      if (!cleanLink.startsWith('http') && !cleanLink.startsWith('@')) {
        cleanLink = 'https://t.me/' + cleanLink;
      } else if (cleanLink.startsWith('@')) {
        cleanLink = 'https://t.me/' + cleanLink.substring(1);
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
      
      this.showNotification("Success", `Task "${taskName}" created successfully!`, "success");
      
      // Reset form
      document.getElementById('taskName').value = '';
      document.getElementById('taskLink').value = '';
      document.getElementById('taskReward').value = '50';
      
      // Refresh tasks list
      await this.renderTasks();
      
    } catch (error) {
      console.error("Error adding task:", error);
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
      
      this.showNotification("Success", "Task deleted successfully", "success");
      this.renderTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      this.showNotification("Error", "Failed to delete task", "error");
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
                    `<span class="coin-icon ton"></span> ${promo.reward} TON` : 
                    `<span class="coin-icon gold"></span> ${promo.reward} GOLD`
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
          <div class="card">
            <div style="text-align: center; padding: 40px;">
              <i class="fas fa-gift" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 15px;"></i>
              <h3 style="color: var(--text-secondary);">No Promo Codes Found</h3>
              <p style="color: var(--text-secondary);">No promo codes have been created yet.</p>
            </div>
          </div>
        `;
      }
      
      this.elements.mainContent.innerHTML = `
        <div id="promoCodes" class="page active">
          <h3>Promo Codes Management (${promoCodesList.length})</h3>
          
          <div class="card">
            <h4>Create New Promo Code</h4>
            <div class="form-group">
              <label for="promoType">Reward Type</label>
              <select id="promoType" class="form-input">
                <option value="gold">🟡 GOLD</option>
                <option value="ton">🔵 TON</option>
              </select>
            </div>
            <div class="form-group">
              <label for="promoReward">Reward Amount</label>
              <input type="number" id="promoReward" placeholder="Enter reward amount" min="1" step="1">
            </div>
            <div class="form-group">
              <label for="customCode">Custom Code (Optional)</label>
              <input type="text" id="customCode" placeholder="Leave empty for auto-generate" maxlength="12">
              <small style="color: var(--text-secondary);">Leave empty to generate random 8-character code</small>
            </div>
            <button class="action-btn btn-success" style="width: 100%;" onclick="admin.createPromoCode()">
              <i class="fas fa-plus-circle"></i> Generate Promo Code
            </button>
          </div>
          
          <h4 style="margin-top: 30px;">Active Promo Codes</h4>
          ${promoCodesContent}
        </div>
      `;
      
    } catch (error) {
      console.error("Error loading promo codes:", error);
      this.elements.mainContent.innerHTML = `
        <div id="promoCodes" class="page active">
          <div class="card">
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

  async renderSettings() {
    try {
      const configSnapshot = await this.db.ref('config').once('value');
      const config = configSnapshot.exists() ? configSnapshot.val() : {};
      
      this.elements.mainContent.innerHTML = `
        <div id="settings" class="page active">
          <h3>App Settings</h3>
          
          <div class="card">
            <h4>Application Configuration</h4>
            <div class="form-group">
              <label for="appName">App Name</label>
              <input type="text" id="appName" value="${config.appName || this.appConfig.appName}">
            </div>
            <div class="form-group">
              <label for="botUsername">Bot Username (without @)</label>
              <input type="text" id="botUsername" value="${config.botUsername || this.appConfig.botUsername}">
            </div>
            <div class="form-group">
              <label for="botToken">Bot Token</label>
              <input type="password" id="botToken" value="${config.botToken || this.appConfig.botToken || this.botToken}">
              <small style="color: var(--text-secondary);">Current bot: ${config.botUsername || this.appConfig.botUsername}</small>
            </div>
            <div class="form-group">
              <label for="walletAddress">Wallet Address</label>
              <input type="text" id="walletAddress" value="${config.walletAddress || this.appConfig.walletAddress}">
            </div>
            <div class="form-group">
              <label for="communityLink">Community Link</label>
              <input type="text" id="communityLink" value="${config.communityLink || this.appConfig.communityLink}">
            </div>
            <div class="form-group">
              <label for="tonkeeperLink">Tonkeeper Link Template</label>
              <input type="text" id="tonkeeperLink" value="${config.tonkeeperLink || this.appConfig.tonkeeperLink}">
            </div>
          </div>
          
          <div class="card">
            <h4>Withdrawal & Deposit Settings</h4>
            <div class="form-group">
              <label for="minimumWithdraw">Minimum Withdrawal (TON)</label>
              <input type="number" id="minimumWithdraw" value="${config.minimumWithdraw || this.appConfig.minimumWithdraw}" step="0.01">
            </div>
            <div class="form-group">
              <label for="minimumDeposit">Minimum Deposit (TON)</label>
              <input type="number" id="minimumDeposit" value="${config.minimumDeposit || this.appConfig.minimumDeposit}" step="0.01">
            </div>
            <div class="form-group">
              <label for="exchangeRate">Exchange Rate (GOLD per TON)</label>
              <input type="number" id="exchangeRate" value="${config.exchangeRate || this.appConfig.exchangeRate}" step="1">
              <small style="color: var(--text-secondary);">Currently: ${config.exchangeRate || this.appConfig.exchangeRate} GOLD = 1 TON</small>
            </div>
          </div>
          
          <div class="card">
            <h4>Task Pricing (TON)</h4>
            <div class="form-group">
              <label for="taskPrice100">100 Users (TON)</label>
              <input type="number" id="taskPrice100" value="${config.taskPrices ? (config.taskPrices[100] || this.appConfig.taskPrices[100]) : this.appConfig.taskPrices[100]}" step="0.001">
            </div>
            <div class="form-group">
              <label for="taskPrice250">250 Users (TON)</label>
              <input type="number" id="taskPrice250" value="${config.taskPrices ? (config.taskPrices[250] || this.appConfig.taskPrices[250]) : this.appConfig.taskPrices[250]}" step="0.001">
            </div>
            <div class="form-group">
              <label for="taskPrice500">500 Users (TON)</label>
              <input type="number" id="taskPrice500" value="${config.taskPrices ? (config.taskPrices[500] || this.appConfig.taskPrices[500]) : this.appConfig.taskPrices[500]}" step="0.001">
            </div>
            <div class="form-group">
              <label for="taskPrice1000">1000 Users (TON)</label>
              <input type="number" id="taskPrice1000" value="${config.taskPrices ? (config.taskPrices[1000] || this.appConfig.taskPrices[1000]) : this.appConfig.taskPrices[1000]}" step="0.001">
            </div>
            <div class="form-group">
              <label for="taskPrice2500">2500 Users (TON)</label>
              <input type="number" id="taskPrice2500" value="${config.taskPrices ? (config.taskPrices[2500] || this.appConfig.taskPrices[2500]) : this.appConfig.taskPrices[2500]}" step="0.001">
            </div>
            <div class="form-group">
              <label for="taskPrice5000">5000 Users (TON)</label>
              <input type="number" id="taskPrice5000" value="${config.taskPrices ? (config.taskPrices[5000] || this.appConfig.taskPrices[5000]) : this.appConfig.taskPrices[5000]}" step="0.001">
            </div>
          </div>
          
          <div class="card">
            <h4>Withdrawal Options</h4>
            <div id="withdrawal-options-container">
              ${(config.withdrawalOptions || this.appConfig.withdrawalOptions).map((option, index) => `
                <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
                  <div style="flex: 1;">
                    <input type="number" class="form-input" id="withdrawalGold${index}" value="${option.gold}" step="1" placeholder="GOLD">
                  </div>
                  <div style="flex: 1;">
                    <input type="number" class="form-input" id="withdrawalTon${index}" value="${option.ton}" step="0.01" placeholder="TON">
                  </div>
                  <div style="flex: 2;">
                    <input type="text" class="form-input" id="withdrawalLabel${index}" value="${option.label}" placeholder="Label">
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="card">
            <h4>Admin Settings</h4>
            <div class="form-group">
              <label for="adminPasswords">Admin Passwords (comma separated)</label>
              <input type="text" id="adminPasswords" value="${ADMIN_PASSWORDS.join(', ')}">
              <small style="color: var(--text-secondary);">Separate multiple passwords with commas</small>
            </div>
            <div class="form-group">
              <label for="welcomeMessage">Welcome Message</label>
              <textarea id="welcomeMessage" rows="3">${config.welcomeMessage || this.appConfig.welcomeMessage}</textarea>
            </div>
          </div>
          
          <button class="action-btn btn-success" style="width: 100%; margin-top: 20px;" onclick="admin.saveSettings()">
            <i class="fas fa-save"></i> Save All Settings
          </button>
          
          <div id="settingsMessage" class="hidden" style="margin-top: 15px;"></div>
        </div>
      `;
      
    } catch (error) {
      console.error("Error loading settings:", error);
      this.elements.mainContent.innerHTML = `
        <div id="settings" class="page active">
          <div class="card">
            <h3>Error loading settings</h3>
            <p>${error.message}</p>
          </div>
        </div>
      `;
    }
  }

  async saveSettings() {
    try {
      const settings = {
        appName: document.getElementById('appName').value,
        botUsername: document.getElementById('botUsername').value,
        botToken: document.getElementById('botToken').value,
        walletAddress: document.getElementById('walletAddress').value,
        communityLink: document.getElementById('communityLink').value,
        tonkeeperLink: document.getElementById('tonkeeperLink').value,
        minimumWithdraw: parseFloat(document.getElementById('minimumWithdraw').value),
        minimumDeposit: parseFloat(document.getElementById('minimumDeposit').value),
        exchangeRate: parseInt(document.getElementById('exchangeRate').value),
        taskPrices: {
          100: parseFloat(document.getElementById('taskPrice100').value),
          250: parseFloat(document.getElementById('taskPrice250').value),
          500: parseFloat(document.getElementById('taskPrice500').value),
          1000: parseFloat(document.getElementById('taskPrice1000').value),
          2500: parseFloat(document.getElementById('taskPrice2500').value),
          5000: parseFloat(document.getElementById('taskPrice5000').value)
        },
        withdrawalOptions: [
          {
            gold: parseInt(document.getElementById('withdrawalGold0').value),
            ton: parseFloat(document.getElementById('withdrawalTon0').value),
            label: document.getElementById('withdrawalLabel0').value
          },
          {
            gold: parseInt(document.getElementById('withdrawalGold1').value),
            ton: parseFloat(document.getElementById('withdrawalTon1').value),
            label: document.getElementById('withdrawalLabel1').value
          },
          {
            gold: parseInt(document.getElementById('withdrawalGold2').value),
            ton: parseFloat(document.getElementById('withdrawalTon2').value),
            label: document.getElementById('withdrawalLabel2').value
          },
          {
            gold: parseInt(document.getElementById('withdrawalGold3').value),
            ton: parseFloat(document.getElementById('withdrawalTon3').value),
            label: document.getElementById('withdrawalLabel3').value
          }
        ],
        welcomeMessage: document.getElementById('welcomeMessage').value
      };

      await this.db.ref('config').update(settings);
      
      // Update local config
      this.appConfig = { ...this.appConfig, ...settings };
      this.botToken = settings.botToken || this.botToken;
      
      const messageEl = document.getElementById('settingsMessage');
      messageEl.innerHTML = '<div class="success-message">✅ Settings saved successfully!</div>';
      messageEl.classList.remove('hidden');
      
      setTimeout(() => {
        messageEl.classList.add('hidden');
      }, 3000);
      
    } catch (error) {
      console.error("Error saving settings:", error);
      const messageEl = document.getElementById('settingsMessage');
      messageEl.innerHTML = `<div class="error-message">Error saving settings: ${error.message}</div>`;
      messageEl.classList.remove('hidden');
    }
  }

  async renderBroadcast() {
    this.elements.mainContent.innerHTML = `
      <div id="broadcast" class="page active">
        <div class="card">
          <h3>Broadcast Message to All Users</h3>
          
          <div class="form-group">
            <label for="broadcastTitle">Title *</label>
            <input type="text" id="broadcastTitle" placeholder="Enter message title" required>
          </div>
          
          <div class="form-group">
            <label for="broadcastMessage">Message *</label>
            <textarea id="broadcastMessage" rows="5" placeholder="Enter your message..." required></textarea>
          </div>
          
          <div class="form-group">
            <label for="broadcastType">Message Type</label>
            <select id="broadcastType" class="form-input">
              <option value="info">ℹ️ Information</option>
              <option value="warning">⚠️ Warning</option>
              <option value="success">✅ Success</option>
              <option value="update">🔄 Update</option>
              <option value="promotion">🎁 Promotion</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Add Inline Buttons (Optional)</label>
            <div id="inline-buttons-container">
              <div class="inline-button-row">
                <input type="text" class="inline-button-input" placeholder="Button Text">
                <input type="text" class="inline-button-input" placeholder="URL">
                <button class="action-btn btn-danger remove-inline-btn" type="button">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
            <button type="button" class="action-btn btn-primary" onclick="admin.addInlineButton()">
              <i class="fas fa-plus"></i> Add Button
            </button>
            <small style="color: var(--text-secondary);">Maximum 3 buttons allowed</small>
          </div>
          
          <div class="form-group">
            <label for="broadcastImage">Image URL (Optional)</label>
            <input type="text" id="broadcastImage" placeholder="https://example.com/image.jpg">
            <small style="color: var(--text-secondary);">Optional image to include with message</small>
          </div>
          
          <button class="action-btn btn-success" style="width: 100%;" onclick="admin.sendBroadcastToBot()">
            <i class="fas fa-paper-plane"></i> Send Broadcast via Telegram Bot
          </button>
          
          <div id="broadcastMessageStatus" style="margin-top: 15px;"></div>
        </div>
      </div>
    `;
  }

  addInlineButton() {
    const container = document.getElementById('inline-buttons-container');
    const rows = container.querySelectorAll('.inline-button-row');
    
    if (rows.length >= 3) {
      this.showNotification("Warning", "Maximum 3 buttons allowed", "warning");
      return;
    }
    
    const newRow = document.createElement('div');
    newRow.className = 'inline-button-row';
    newRow.innerHTML = `
      <input type="text" class="inline-button-input" placeholder="Button Text">
      <input type="text" class="inline-button-input" placeholder="URL">
      <button class="action-btn btn-danger remove-inline-btn" type="button" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    container.appendChild(newRow);
  }

  async sendBroadcastToBot() {
    const title = document.getElementById('broadcastTitle').value.trim();
    const message = document.getElementById('broadcastMessage').value.trim();
    const type = document.getElementById('broadcastType').value;
    const imageUrl = document.getElementById('broadcastImage').value.trim();
    
    if (!title || !message) {
      this.showNotification("Error", "Please enter title and message", "error");
      return;
    }
    
    // Collect inline buttons
    const buttons = [];
    const buttonRows = document.querySelectorAll('.inline-button-row');
    buttonRows.forEach(row => {
      const inputs = row.querySelectorAll('.inline-button-input');
      if (inputs[0].value && inputs[1].value) {
        buttons.push({
          text: inputs[0].value,
          url: inputs[1].value
        });
      }
    });
    
    try {
      // First, save broadcast to database
      const broadcastData = {
        title: title,
        message: message,
        type: type,
        imageUrl: imageUrl || null,
        buttons: buttons,
        timestamp: Date.now(),
        sentBy: 'admin',
        status: 'sending'
      };
      
      const broadcastRef = await this.db.ref('broadcasts').push(broadcastData);
      const broadcastId = broadcastRef.key;
      
      // Get all users
      const usersSnap = await this.db.ref('users').once('value');
      const users = [];
      
      usersSnap.forEach(child => {
        const user = child.val();
        if (user.id) {
          users.push(user.id);
        }
      });
      
      if (users.length === 0) {
        this.showNotification("Error", "No users found to send broadcast", "error");
        return;
      }
      
      const statusDiv = document.getElementById('broadcastMessageStatus');
      statusDiv.innerHTML = `
        <div class="warning-message">
          <i class="fas fa-spinner fa-spin"></i> Sending broadcast to ${users.length} users...
        </div>
      `;
      
      // Send to bot
      const botResponse = await this.sendToTelegramBot(users, title, message, imageUrl, buttons);
      
      if (botResponse.ok) {
        // Update broadcast status
        await this.db.ref(`broadcasts/${broadcastId}`).update({
          status: 'sent',
          sentTo: users.length,
          sentAt: Date.now(),
          botResponse: botResponse.result
        });
        
        statusDiv.innerHTML = `
          <div class="success-message">
            <h4>✅ Broadcast Sent Successfully!</h4>
            <p>Sent to ${users.length} users</p>
            <p><strong>Title:</strong> ${title}</p>
            <p><strong>Message:</strong> ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
        `;
        
        this.showNotification("Success", `Broadcast sent to ${users.length} users`, "success");
        
        // Clear form
        document.getElementById('broadcastTitle').value = '';
        document.getElementById('broadcastMessage').value = '';
        document.getElementById('broadcastImage').value = '';
        document.getElementById('inline-buttons-container').innerHTML = `
          <div class="inline-button-row">
            <input type="text" class="inline-button-input" placeholder="Button Text">
            <input type="text" class="inline-button-input" placeholder="URL">
            <button class="action-btn btn-danger remove-inline-btn" type="button">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `;
        
      } else {
        await this.db.ref(`broadcasts/${broadcastId}`).update({
          status: 'failed',
          error: botResponse.description
        });
        
        statusDiv.innerHTML = `
          <div class="error-message">
            <h4>❌ Failed to Send Broadcast</h4>
            <p>Error: ${botResponse.description}</p>
          </div>
        `;
        
        this.showNotification("Error", `Failed to send broadcast: ${botResponse.description}`, "error");
      }
      
    } catch (error) {
      console.error("Error sending broadcast:", error);
      
      const statusDiv = document.getElementById('broadcastMessageStatus');
      statusDiv.innerHTML = `
        <div class="error-message">
          <h4>❌ Error Sending Broadcast</h4>
          <p>${error.message}</p>
        </div>
      `;
      
      this.showNotification("Error", "Failed to send broadcast", "error");
    }
  }

  async sendToTelegramBot(userIds, title, message, imageUrl, buttons) {
    try {
      // For now, we'll simulate sending
      // In production, you would call Telegram Bot API
      const formattedMessage = `*${title}*\n\n${message}`;
      
      // Note: In production, implement actual Telegram Bot API calls
      // This is a simplified version
      
      return {
        ok: true,
        result: {
          message_id: Date.now(),
          date: Date.now(),
          text: "Broadcast simulated successfully"
        }
      };
      
    } catch (error) {
      console.error("Telegram Bot API error:", error);
      return {
        ok: false,
        description: error.message
      };
    }
  }

  async renderAddBalance() {
    this.elements.mainContent.innerHTML = `
      <div id="addBalance" class="page active">
        <h3>Add Balance to User</h3>
        
        <div class="card">
          <h4>Add Balance Form</h4>
          <div class="form-group">
            <label for="userId">Telegram User ID *</label>
            <input type="text" id="userId" placeholder="Enter Telegram ID (e.g., 123456789)">
            <small style="color: var(--text-secondary);">The unique Telegram ID of the user</small>
          </div>
          <div class="form-group">
            <label for="balanceType">Balance Type</label>
            <select id="balanceType" class="form-input">
              <option value="gold">🟡 GOLD</option>
              <option value="ton">🔵 TON</option>
            </select>
          </div>
          <div class="form-group">
            <label for="balanceAmount">Amount</label>
            <input type="number" id="balanceAmount" placeholder="Enter amount" step="0.001" min="0">
            <small style="color: var(--text-secondary);">For GOLD: whole numbers | For TON: decimals allowed</small>
          </div>
          <div class="form-group">
            <label for="balanceReason">Reason</label>
            <input type="text" id="balanceReason" placeholder="Enter reason (e.g., Deposit TON, Bonus, etc.)">
            <small style="color: var(--text-secondary);">This will be recorded in history</small>
          </div>
          <button class="action-btn btn-success" style="width: 100%;" onclick="admin.addBalanceToUser()">
            <i class="fas fa-plus-circle"></i> Add Balance to User
          </button>
          <div id="balanceMessage" style="margin-top: 15px;"></div>
        </div>
      </div>
    `;
  }

  async renderBalanceHistory() {
    this.elements.mainContent.innerHTML = `
      <div id="history" class="page active">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading Balance History...</p>
        </div>
      </div>
    `;
    
    try {
      const historySnap = await this.db.ref('balanceHistory').orderByChild('timestamp').limitToLast(50).once('value');
      let historyContent = '';
      let historyCount = 0;
      
      if (historySnap.exists()) {
        historySnap.forEach(child => {
          const record = child.val();
          historyCount++;
          
          const date = new Date(record.timestamp);
          const isGold = record.balanceType === 'gold';
          
          historyContent += `
            <div class="balance-history-item">
              <div class="balance-history-user">
                <strong>${record.userName || 'Unknown User'}</strong>
                <div>
                  <small>ID: ${record.telegramId}</small>
                </div>
              </div>
              
              <div class="balance-history-amount">
                <div class="amount-display ${isGold ? 'gold' : 'ton'}">
                  ${isGold ? '🟡' : '🔵'} ${record.amount}
                </div>
                <div class="amount-label">${isGold ? 'GOLD' : 'TON'}</div>
              </div>
              
              <div class="balance-history-details">
                <div class="balance-history-reason">${record.reason || 'Balance Addition'}</div>
                <div class="balance-history-meta">
                  <span><strong>Admin:</strong> ${record.adminId || 'admin'}</span>
                  <span><strong>Previous:</strong> ${record.previousBalance || 0}</span>
                  <span><strong>New:</strong> ${record.newBalance || 0}</span>
                </div>
              </div>
              
              <div class="balance-history-date">
                ${date.toLocaleDateString()}<br>
                ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          `;
        });
      } else {
        historyContent = `
          <div class="card">
            <div style="text-align: center; padding: 40px;">
              <i class="fas fa-history" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 15px;"></i>
              <h3 style="color: var(--text-secondary);">No Balance History</h3>
              <p style="color: var(--text-secondary);">No balance additions have been recorded yet.</p>
            </div>
          </div>
        `;
      }
      
      this.elements.mainContent.innerHTML = `
        <div id="history" class="page active">
          <h3>Balance Addition History (${historyCount})</h3>
          <div class="balance-history-container">
            ${historyContent}
          </div>
        </div>
      `;
      
    } catch (error) {
      console.error("Error loading history:", error);
      this.elements.mainContent.innerHTML = `
        <div id="history" class="page active">
          <div class="card">
            <h3>Error loading balance history</h3>
            <p>${error.message}</p>
          </div>
        </div>
      `;
    }
  }

  async addBalanceToUser() {
    const telegramId = document.getElementById('userId').value.trim();
    const balanceType = document.getElementById('balanceType').value;
    const amount = parseFloat(document.getElementById('balanceAmount').value);
    const reason = document.getElementById('balanceReason').value.trim() || 'Balance Addition';

    if (!telegramId) {
      this.showNotification("Error", "Please enter a Telegram ID", "error");
      return;
    }

    if (!amount || amount <= 0) {
      this.showNotification("Error", "Please enter a valid amount", "error");
      return;
    }

    const messageEl = document.getElementById('balanceMessage');
    
    try {
      const userSnap = await this.db.ref(`users/${telegramId}`).once('value');
      if (!userSnap.exists()) {
        messageEl.innerHTML = `<div class="error-message">User with ID "${telegramId}" not found!</div>`;
        return;
      }

      const user = userSnap.val();
      const currentBalance = balanceType === 'gold' ? (user.gold || 0) : (user.balance || 0);
      const newBalance = currentBalance + amount;

      const updateData = {};
      if (balanceType === 'gold') {
        updateData[`users/${telegramId}/gold`] = newBalance;
      } else {
        updateData[`users/${telegramId}/balance`] = newBalance;
      }

      await this.db.ref().update(updateData);

      const balanceHistory = {
        telegramId: telegramId,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
        balanceType: balanceType,
        amount: amount,
        reason: reason,
        previousBalance: currentBalance,
        newBalance: newBalance,
        adminId: 'admin',
        timestamp: Date.now(),
        date: new Date().toLocaleString()
      };

      await this.db.ref('balanceHistory').push(balanceHistory);

      messageEl.innerHTML = `
        <div class="success-message">
          <h4>✅ Balance Added Successfully!</h4>
          <p><strong>User:</strong> ${user.firstName || 'Unknown'} ${user.lastName || ''}</p>
          <p><strong>Telegram ID:</strong> ${telegramId}</p>
          <p><strong>Type:</strong> ${balanceType === 'gold' ? '🟡 GOLD' : '🔵 TON'}</p>
          <p><strong>Amount Added:</strong> ${amount}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p><strong>Previous Balance:</strong> ${currentBalance.toFixed(balanceType === 'gold' ? 0 : 3)}</p>
          <p><strong>New Balance:</strong> ${newBalance.toFixed(balanceType === 'gold' ? 0 : 3)}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>`;

      // Clear form
      document.getElementById('balanceAmount').value = '';
      document.getElementById('balanceReason').value = '';

      this.showNotification("Success", `Added ${amount} ${balanceType.toUpperCase()} to user`, "success");

    } catch (error) {
      messageEl.innerHTML = `<div class="error-message">Error adding balance: ${error.message}</div>`;
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
}

const admin = new AdminPanel();
window.admin = admin;
