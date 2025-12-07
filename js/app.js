// app.js
import { FIREBASE_CONFIG, ADMIN_PASSWORDS, APP_DEFAULT_CONFIG } from '../config.js';

class AdminPanel {
  constructor() {
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    this.appConfig = APP_DEFAULT_CONFIG;
    
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
    const navLinks = document.querySelectorAll('.nav-menu li');
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
    
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
    
    switch(pageName) {
      case 'dashboard':
        await this.renderDashboard();
        break;
      case 'users':
        await this.renderUsers();
        break;
      case 'withdrawals':
        await this.renderWithdrawals();
        break;
      case 'wallet':
        await this.renderWallet();
        break;
      case 'history':
        await this.renderHistory();
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
      const [usersSnap, withdrawalsSnap, promoCodesSnap, tasksSnap] = await Promise.all([
        this.db.ref('users').once('value'),
        this.db.ref('withdrawals/pending').once('value'),
        this.db.ref('config/promoCodes').once('value'),
        this.db.ref('config/tasks').once('value')
      ]);
      
      const usersCount = usersSnap.numChildren();
      const withdrawalsCount = withdrawalsSnap.numChildren();
      const promoCodesCount = promoCodesSnap.numChildren();
      const tasksCount = tasksSnap.numChildren();
      
      const totalBalance = await this.calculateTotalBalance(usersSnap);
      const totalGold = await this.calculateTotalGold(usersSnap);
      
      this.elements.mainContent.innerHTML = `
        <div id="dashboard" class="page active">
          <div class="stats-grid">
            <div class="stat-card">
              <h3>Total Users</h3>
              <p>${usersCount}</p>
            </div>
            <div class="stat-card">
              <h3>Pending Withdrawals</h3>
              <p>${withdrawalsCount}</p>
            </div>
            <div class="stat-card">
              <h3>Active Tasks</h3>
              <p>${tasksCount}</p>
            </div>
            <div class="stat-card">
              <h3>Promo Codes</h3>
              <p>${promoCodesCount}</p>
            </div>
            <div class="stat-card">
              <h3>Total TON</h3>
              <p>${totalBalance.toFixed(3)}</p>
            </div>
            <div class="stat-card">
              <h3>Total GOLD</h3>
              <p>${totalGold.toLocaleString()}</p>
            </div>
          </div>
          
          <div class="card">
            <h3>Quick Actions</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px;">
              <button class="action-btn btn-primary" onclick="admin.showPage('users')">
                <i class="fas fa-users"></i> Manage Users
              </button>
              <button class="action-btn btn-warning" onclick="admin.showPage('withdrawals')">
                <i class="fas fa-wallet"></i> Pending Withdrawals
              </button>
              <button class="action-btn btn-success" onclick="admin.showPage('addBalance')">
                <i class="fas fa-plus-circle"></i> Add Balance
              </button>
              <button class="action-btn btn-info" onclick="admin.showPage('tasks')">
                <i class="fas fa-tasks"></i> Manage Tasks
              </button>
            </div>
          </div>
          
          <div class="card">
            <h3>System Status</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
              <div style="padding: 10px; background: rgba(0, 217, 166, 0.1); border-radius: 8px; border-left: 4px solid var(--success);">
                <p style="color: var(--success); font-weight: 600;">✅ Connected to Firebase</p>
                <small style="color: var(--text-secondary);">Database: new-you-6a04c</small>
              </div>
              <div style="padding: 10px; background: rgba(0, 217, 166, 0.1); border-radius: 8px; border-left: 4px solid var(--success);">
                <p style="color: var(--success); font-weight: 600;">✅ Firebase Authentication</p>
                <small style="color: var(--text-secondary);">Anonymous login active</small>
              </div>
              <div style="padding: 10px; background: rgba(0, 136, 204, 0.1); border-radius: 8px; border-left: 4px solid var(--info);">
                <p style="color: var(--info); font-weight: 600;">📊 Live Statistics</p>
                <small style="color: var(--text-secondary);">Real-time data monitoring</small>
              </div>
              <div style="padding: 10px; background: rgba(0, 136, 204, 0.1); border-radius: 8px; border-left: 4px solid var(--info);">
                <p style="color: var(--info); font-weight: 600;">🔐 Admin Panel</p>
                <small style="color: var(--text-secondary);">Secure access control</small>
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

  async calculateTotalBalance(usersSnap) {
    let total = 0;
    usersSnap.forEach(child => {
      const user = child.val();
      total += user.balance || 0;
    });
    return total;
  }

  async calculateTotalGold(usersSnap) {
    let total = 0;
    usersSnap.forEach(child => {
      const user = child.val();
      total += user.gold || 0;
    });
    return total;
  }

  async renderUsers() {
    this.elements.mainContent.innerHTML = `
      <div id="users" class="page active">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading Users...</p>
        </div>
      </div>
    `;
    
    try {
      const usersSnap = await this.db.ref('users').once('value');
      let usersCount = 0;
      let tableContent = '';
      
      if (usersSnap.exists()) {
        usersSnap.forEach(child => {
          const user = child.val();
          usersCount++;
          
          const telegramId = user.id || child.key;
          const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No Name';
          const username = user.username ? `@${user.username}` : 'N/A';
          const balance = (user.balance || 0).toFixed(3);
          const gold = (user.gold || 0).toFixed(0);
          const referrals = user.referrals || 0;
          
          tableContent += `
            <tr>
              <td data-label="User">
                <strong>${userName}</strong><br>
                <small style="color: var(--text-secondary);">${username}</small><br>
                <small style="color: var(--text-secondary);">ID: ${telegramId}</small>
              </td>
              <td data-label="Balance">
                <strong>${balance} TON</strong><br>
                <small style="color: var(--text-secondary);">${gold} GOLD</small>
              </td>
              <td data-label="Referrals">
                <strong>${referrals}</strong>
              </td>
              <td data-label="Actions">
                <button class="action-btn btn-primary" onclick="admin.fillUserId('${telegramId}'); admin.showPage('addBalance');">
                  <i class="fas fa-plus"></i> Add Balance
                </button>
              </td>
            </tr>
          `;
        });
      } else {
        tableContent = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-secondary);">No users found</td></tr>';
      }
      
      this.elements.mainContent.innerHTML = `
        <div id="users" class="page active">
          <div class="card">
            <h3>All Users (${usersCount})</h3>
            <div style="overflow-x: auto;">
              <table>
                <thead>
                  <tr>
                    <th>User Information</th>
                    <th>Balance</th>
                    <th>Referrals</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>${tableContent}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      
    } catch (error) {
      console.error("Error loading users:", error);
      this.elements.mainContent.innerHTML = `
        <div id="users" class="page active">
          <div class="card">
            <h3>Error loading users</h3>
            <p>${error.message}</p>
          </div>
        </div>
      `;
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
                <div class="withdrawal-amount">${req.tonAmount || req.amount || 0} TON</div>
              </div>
              <div class="withdrawal-details">
                <div><strong>Wallet:</strong> ${req.walletAddress || req.account || 'Not specified'}</div>
                <div><strong>GOLD Amount:</strong> ${req.goldAmount ? req.goldAmount.toLocaleString() : '0'} GOLD</div>
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
      
      const depositHistory = deposits.map(deposit => {
        const date = new Date(deposit.timestamp);
        return `
          <tr>
            <td>${deposit.userId}</td>
            <td>${deposit.amount} TON</td>
            <td>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</td>
            <td><span class="status-deposit" style="padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">${deposit.status || 'completed'}</span></td>
            <td>${deposit.txid ? deposit.txid.substring(0, 10) + '...' : 'N/A'}</td>
          </tr>
        `;
      }).join('');
      
      const withdrawalHistory = withdrawals.map(withdrawal => {
        const date = new Date(withdrawal.createdAt || withdrawal.timestamp);
        let statusClass = 'status-pending';
        if (withdrawal.status === 'completed') statusClass = 'status-completed';
        if (withdrawal.status === 'rejected') statusClass = 'status-rejected';
        
        return `
          <tr>
            <td>${withdrawal.userId}</td>
            <td>${withdrawal.userName || 'Unknown'}</td>
            <td>${withdrawal.tonAmount || withdrawal.amount || 0} TON</td>
            <td>${withdrawal.goldAmount ? withdrawal.goldAmount.toLocaleString() : '0'} GOLD</td>
            <td>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</td>
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
            </div>
          </div>
          
          <div class="card">
            <h4>Deposit History</h4>
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
                <tbody>${depositHistory}</tbody>
              </table>
            </div>
          </div>
          
          <div class="card">
            <h4>Withdrawal History</h4>
            <div style="overflow-x: auto; margin-top: 15px;">
              <table class="balance-history-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>TON Amount</th>
                    <th>GOLD Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>${withdrawalHistory}</tbody>
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

  async renderHistory() {
    this.elements.mainContent.innerHTML = `
      <div id="history" class="page active">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading History...</p>
        </div>
      </div>
    `;
    
    try {
      const balanceHistorySnap = await this.db.ref('balanceHistory').orderByChild('timestamp').limitToLast(50).once('value');
      let historyContent = '';
      
      if (balanceHistorySnap.exists()) {
        balanceHistorySnap.forEach(child => {
          const record = child.val();
          const date = new Date(record.timestamp);
          const type = record.balanceType === 'gold' ? '🟡 GOLD' : '🔵 TON';
          
          historyContent += `
            <tr>
              <td data-label="User">${record.userName || 'Unknown'}<br><small>ID: ${record.telegramId}</small></td>
              <td data-label="Type">${type}</td>
              <td data-label="Amount" class="balance-positive">+${record.amount}</td>
              <td data-label="Reason">${record.reason || 'Balance Addition'}</td>
              <td data-label="Admin">${record.adminId || 'Admin'}</td>
              <td data-label="Date">${date.toLocaleString()}</td>
            </tr>
          `;
        });
      } else {
        historyContent = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">No balance history found</td></tr>';
      }
      
      this.elements.mainContent.innerHTML = `
        <div id="history" class="page active">
          <div class="card">
            <h3>Balance Addition History</h3>
            <div style="overflow-x: auto;">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Admin</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>${historyContent}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      
    } catch (error) {
      console.error("Error loading history:", error);
      this.elements.mainContent.innerHTML = `
        <div id="history" class="page active">
          <div class="card">
            <h3>Error loading history</h3>
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
      const tasksSnap = await this.db.ref('config/tasks').once('value');
      let tasksContent = '';
      let tasksCount = 0;
      
      if (tasksSnap.exists()) {
        tasksSnap.forEach(child => {
          const task = child.val();
          tasksCount++;
          
          const progress = Math.min((task.currentCompletions || 0) / task.maxCompletions * 100, 100);
          const createdBy = task.createdBy === 'admin' ? 'Admin' : 'User';
          
          tasksContent += `
            <div class="task-card">
              <div class="task-header">
                <div class="task-title">${task.name || task.title || 'Unnamed Task'}</div>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">Created by: ${createdBy}</div>
              </div>
              <div style="margin: 10px 0;">
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 5px;">
                  <span>Progress: ${task.currentCompletions || 0}/${task.maxCompletions}</span>
                  <span>${progress.toFixed(0)}%</span>
                </div>
                <div class="task-progress">
                  <div class="task-progress-bar" style="width: ${progress}%"></div>
                </div>
              </div>
              <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="action-btn btn-primary">Edit</button>
                <button class="action-btn btn-danger" onclick="admin.deleteTask('${child.key}')">Delete</button>
              </div>
            </div>
          `;
        });
      } else {
        tasksContent = `
          <div class="card">
            <div style="text-align: center; padding: 40px;">
              <i class="fas fa-tasks" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 15px;"></i>
              <h3 style="color: var(--text-secondary);">No Tasks Found</h3>
              <p style="color: var(--text-secondary);">No tasks have been added yet.</p>
            </div>
          </div>
        `;
      }
      
      this.elements.mainContent.innerHTML = `
        <div id="tasks" class="page active">
          <h3>Tasks Management (${tasksCount})</h3>
          ${tasksContent}
          
          <div class="card">
            <h4>Add New Task (Admin)</h4>
            <div class="form-group">
              <label for="taskTitle">Task Title</label>
              <input type="text" id="taskTitle" placeholder="Enter task title">
            </div>
            <div class="form-group">
              <label for="taskReward">Reward (GOLD)</label>
              <input type="number" id="taskReward" placeholder="0" step="1">
            </div>
            <div class="form-group">
              <label for="taskMaxCompletions">Maximum Completions</label>
              <input type="number" id="taskMaxCompletions" placeholder="100" min="1">
            </div>
            <div class="form-group">
              <label for="taskLink">Task Link (URL)</label>
              <input type="text" id="taskLink" placeholder="https://...">
            </div>
            <button class="action-btn btn-success" style="width: 100%;" onclick="admin.addTask()">
              <i class="fas fa-plus"></i> Add Task
            </button>
          </div>
        </div>
      `;
      
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
                <div class="promo-reward">${promo.reward} ${promo.type === 'ton' ? 'TON' : 'GOLD'}</div>
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
              <label for="botUsername">Bot Username</label>
              <input type="text" id="botUsername" value="${config.botUsername || this.appConfig.botUsername}">
            </div>
            <div class="form-group">
              <label for="walletAddress">Wallet Address</label>
              <input type="text" id="walletAddress" value="${config.walletAddress || this.appConfig.walletAddress}">
            </div>
            <div class="form-group">
              <label for="communityLink">Community Link</label>
              <input type="text" id="communityLink" value="${config.communityLink || this.appConfig.communityLink}">
            </div>
          </div>
          
          <div class="card">
            <h4>Advertisement Settings</h4>
            <div class="form-group">
              <label for="adZoneId">Ad Zone ID</label>
              <input type="text" id="adZoneId" value="${config.adZoneId || this.appConfig.adZoneId}">
            </div>
            <div class="form-group">
              <label for="adValue">Ad Value (GOLD)</label>
              <input type="number" id="adValue" value="${config.adValue || this.appConfig.adValue}" step="1">
            </div>
            <div class="form-group">
              <label for="dailyAdLimit">Daily Ad Limit</label>
              <input type="number" id="dailyAdLimit" value="${config.dailyAdLimit || this.appConfig.dailyAdLimit}" step="1">
            </div>
            <div class="form-group">
              <label for="adsPerBreak">Ads Per Break</label>
              <input type="number" id="adsPerBreak" value="${config.adsPerBreak || this.appConfig.adsPerBreak}" step="1">
            </div>
            <div class="form-group">
              <label for="breakDuration">Break Duration (minutes)</label>
              <input type="number" id="breakDuration" value="${config.breakDuration || this.appConfig.breakDuration}" step="1">
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
            <h4>Task Pricing</h4>
            <div class="form-group">
              <label for="taskPrice500">500 Users (TON)</label>
              <input type="number" id="taskPrice500" value="${config.taskPrices ? config.taskPrices[500] : this.appConfig.taskPrices[500]}" step="0.01">
            </div>
            <div class="form-group">
              <label for="taskPrice1000">1000 Users (TON)</label>
              <input type="number" id="taskPrice1000" value="${config.taskPrices ? config.taskPrices[1000] : this.appConfig.taskPrices[1000]}" step="0.01">
            </div>
            <div class="form-group">
              <label for="taskPrice3000">3000 Users (TON)</label>
              <input type="number" id="taskPrice3000" value="${config.taskPrices ? config.taskPrices[3000] : this.appConfig.taskPrices[3000]}" step="0.01">
            </div>
            <div class="form-group">
              <label for="taskPrice5000">5000 Users (TON)</label>
              <input type="number" id="taskPrice5000" value="${config.taskPrices ? config.taskPrices[5000] : this.appConfig.taskPrices[5000]}" step="0.01">
            </div>
          </div>
          
          <div class="card">
            <h4>Admin Settings</h4>
            <div class="form-group">
              <label for="adminPassword">Admin Password</label>
              <input type="password" id="adminPassword" value="${config.adminPassword || 'Admin@123'}">
              <small style="color: var(--text-secondary);">Change the admin login password</small>
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

  async renderBroadcast() {
    this.elements.mainContent.innerHTML = `
      <div id="broadcast" class="page active">
        <div class="card">
          <h3>Broadcast Message</h3>
          <div class="form-group">
            <label for="broadcastTitle">Title</label>
            <input type="text" id="broadcastTitle" placeholder="Enter message title">
          </div>
          <div class="form-group">
            <label for="broadcastMessage">Message</label>
            <textarea id="broadcastMessage" rows="5" placeholder="Enter your message"></textarea>
          </div>
          <div class="form-group">
            <label for="broadcastType">Message Type</label>
            <select id="broadcastType" class="form-input">
              <option value="info">Information</option>
              <option value="warning">Warning</option>
              <option value="update">Update</option>
              <option value="promotion">Promotion</option>
            </select>
          </div>
          <button class="action-btn btn-primary" style="width: 100%;" onclick="admin.sendBroadcast()">
            <i class="fas fa-paper-plane"></i> Send Broadcast to All Users
          </button>
        </div>
      </div>
    `;
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
          <div id="balanceMessage" class="hidden"></div>
        </div>

        <div class="card">
          <h4>Find User by Telegram ID</h4>
          <div class="form-group">
            <label for="searchUserId">Search Telegram ID</label>
            <input type="text" id="searchUserId" placeholder="Enter Telegram ID to search">
          </div>
          <button class="action-btn btn-primary" onclick="admin.searchUser()">
            <i class="fas fa-search"></i> Search User
          </button>
          <div id="userSearchResult" style="margin-top: 15px;"></div>
        </div>
      </div>
    `;
  }

  async addTask() {
    const title = document.getElementById('taskTitle').value;
    const reward = parseFloat(document.getElementById('taskReward').value);
    const maxCompletions = parseInt(document.getElementById('taskMaxCompletions').value);
    const link = document.getElementById('taskLink').value;
    
    if (!title || isNaN(reward) || isNaN(maxCompletions) || !link) {
      this.showNotification("Error", "Please fill all fields correctly", "error");
      return;
    }
    
    try {
      const taskData = {
        name: title,
        reward: reward,
        maxCompletions: maxCompletions,
        currentCompletions: 0,
        url: link,
        status: 'active',
        createdBy: 'admin',
        createdAt: Date.now()
      };
      
      await this.db.ref('config/tasks').push(taskData);
      
      this.showNotification("Success", "Task added successfully!", "success");
      
      document.getElementById('taskTitle').value = '';
      document.getElementById('taskReward').value = '';
      document.getElementById('taskMaxCompletions').value = '';
      document.getElementById('taskLink').value = '';
      
      this.renderTasks();
      
    } catch (error) {
      console.error("Error adding task:", error);
      this.showNotification("Error", "Failed to add task", "error");
    }
  }

  async deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await this.db.ref(`config/tasks/${taskId}`).remove();
      this.showNotification("Success", "Task deleted successfully", "success");
      this.renderTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      this.showNotification("Error", "Failed to delete task", "error");
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

  async searchUser() {
    const telegramId = document.getElementById('searchUserId').value.trim();
    if (!telegramId) {
      this.showNotification("Error", "Please enter a Telegram ID", "error");
      return;
    }

    try {
      const userSnap = await this.db.ref(`users/${telegramId}`).once('value');
      const resultDiv = document.getElementById('userSearchResult');
      
      if (userSnap.exists()) {
        const user = userSnap.val();
        resultDiv.innerHTML = `
          <div class="success-message">
            <h4>✅ User Found</h4>
            <p><strong>Name:</strong> ${user.firstName || 'No Name'} ${user.lastName || ''}</p>
            <p><strong>Telegram ID:</strong> ${telegramId}</p>
            ${user.username ? `<p><strong>Username:</strong> @${user.username}</p>` : ''}
            <p><strong>🟡 GOLD Balance:</strong> ${(user.gold || 0).toFixed(0)}</p>
            <p><strong>🔵 TON Balance:</strong> ${(user.balance || 0).toFixed(3)}</p>
            <p><strong>Referrals:</strong> ${user.referrals || 0}</p>
            <button class="action-btn btn-success" onclick="admin.fillUserId('${telegramId}')">Use This Telegram ID</button>
          </div>
        `;
      } else {
        resultDiv.innerHTML = `<div class="error-message">User with Telegram ID "${telegramId}" not found</div>`;
      }
    } catch (error) {
      document.getElementById('userSearchResult').innerHTML = `<div class="error-message">Error searching user: ${error.message}</div>`;
    }
  }

  fillUserId(userId) {
    document.getElementById('userId').value = userId;
    document.getElementById('searchUserId').value = userId;
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

    try {
      const userSnap = await this.db.ref(`users/${telegramId}`).once('value');
      if (!userSnap.exists()) {
        this.showNotification("Error", "User not found!", "error");
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

      const messageEl = document.getElementById('balanceMessage');
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
      messageEl.classList.remove('hidden');

      document.getElementById('balanceAmount').value = '';
      document.getElementById('balanceReason').value = '';

    } catch (error) {
      const messageEl = document.getElementById('balanceMessage');
      messageEl.innerHTML = `<div class="error-message">Error adding balance: ${error.message}</div>`;
      messageEl.classList.remove('hidden');
    }
  }

  async saveSettings() {
    const settings = {
      appName: document.getElementById('appName').value,
      botUsername: document.getElementById('botUsername').value,
      walletAddress: document.getElementById('walletAddress').value,
      communityLink: document.getElementById('communityLink').value,
      adZoneId: document.getElementById('adZoneId').value,
      adValue: parseFloat(document.getElementById('adValue').value),
      dailyAdLimit: parseInt(document.getElementById('dailyAdLimit').value),
      adsPerBreak: parseInt(document.getElementById('adsPerBreak').value),
      breakDuration: parseInt(document.getElementById('breakDuration').value),
      minimumWithdraw: parseFloat(document.getElementById('minimumWithdraw').value),
      minimumDeposit: parseFloat(document.getElementById('minimumDeposit').value),
      exchangeRate: parseInt(document.getElementById('exchangeRate').value),
      taskPrices: {
        500: parseFloat(document.getElementById('taskPrice500').value),
        1000: parseFloat(document.getElementById('taskPrice1000').value),
        3000: parseFloat(document.getElementById('taskPrice3000').value),
        5000: parseFloat(document.getElementById('taskPrice5000').value)
      },
      adminPassword: document.getElementById('adminPassword').value,
      welcomeMessage: document.getElementById('welcomeMessage').value
    };

    try {
      await this.db.ref('config').update(settings);
      
      this.appConfig = { ...this.appConfig, ...settings };
      
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

  async sendBroadcast() {
    const title = document.getElementById('broadcastTitle').value.trim();
    const message = document.getElementById('broadcastMessage').value.trim();
    const type = document.getElementById('broadcastType').value;

    if (!title || !message) {
      this.showNotification("Error", "Please enter title and message", "error");
      return;
    }

    try {
      const broadcastData = {
        title: title,
        message: message,
        type: type,
        timestamp: Date.now(),
        sentBy: 'admin'
      };

      await this.db.ref('broadcasts').push(broadcastData);

      this.showNotification("Success", "Broadcast sent successfully!", "success");

      document.getElementById('broadcastTitle').value = '';
      document.getElementById('broadcastMessage').value = '';
      document.getElementById('broadcastType').value = 'info';

    } catch (error) {
      console.error("Error sending broadcast:", error);
      this.showNotification("Error", "Failed to send broadcast", "error");
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
