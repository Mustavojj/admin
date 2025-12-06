// Admin Panel - Main Application
class AdminPanel {
    constructor() {
        this.firebase = adminFirebaseService;
        this.currentPage = 'dashboard';
        this.currentUser = null;
        this.appConfig = null;
        
        // State
        this.users = [];
        this.pendingWithdrawals = [];
        this.tasks = [];
        this.promoCodes = [];
        this.systemStats = null;
        
        // Services
        this.notifications = new AdminNotifications();
        this.validators = new FormValidators();
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize Firebase
            await this.firebase.initialize();
            
            // Load app configuration
            await this.loadAppConfig();
            
            // Setup UI
            this.setupUI();
            this.setupEventListeners();
            this.setupNavigation();
            
            // Show dashboard
            await this.showPage('dashboard');
            
        } catch (error) {
            console.error('Admin panel initialization failed:', error);
            this.showLoginError('Failed to initialize admin panel');
        }
    }
    
    async loadAppConfig() {
        try {
            this.appConfig = await this.firebase.getAppConfig();
            
            // Set defaults if config is empty
            if (!this.appConfig) {
                this.appConfig = {
                    adminPassword: "Mostafa$500",
                    botUsername: "xbossbot",
                    minWithdrawal: 0.1,
                    minDeposit: 0.5,
                    exchangeRate: 10000,
                    depositAddress: "UQDMj-aLehj4WZwvw0ZEcIVD14blpLWQxzdCmD7QjKOP6D-F",
                    taskCosts: {
                        500: 0.5,
                        1000: 1.0,
                        3000: 2.5,
                        5000: 4.0
                    }
                };
                
                // Save defaults
                await this.firebase.updateAppConfig(this.appConfig);
            }
            
        } catch (error) {
            console.error('Error loading app config:', error);
            // Use defaults
            this.appConfig = {
                adminPassword: "Mostafa$500",
                botUsername: "xbossbot",
                minWithdrawal: 0.1,
                minDeposit: 0.5,
                exchangeRate: 10000,
                depositAddress: "UQDMj-aLehj4WZwvw0ZEcIVD14blpLWQxzdCmD7QjKOP6D-F",
                taskCosts: {
                    500: 0.5,
                    1000: 1.0,
                    3000: 2.5,
                    5000: 4.0
                }
            };
        }
    }
    
    setupUI() {
        // Set page title
        this.updatePageTitle('Dashboard');
        
        // Setup mobile menu
        this.setupMobileMenu();
    }
    
    setupEventListeners() {
        // Login
        this.setupLoginListeners();
        
        // Logout
        this.setupLogoutListener();
        
        // Form submissions
        this.setupFormListeners();
    }
    
    setupLoginListeners() {
        const loginButton = document.getElementById('login-button');
        const loginPassword = document.getElementById('login-password');
        
        if (loginButton && loginPassword) {
            loginButton.addEventListener('click', () => this.login());
            loginPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.login();
            });
        }
    }
    
    setupLogoutListener() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }
    
    setupFormListeners() {
        // Add Balance form
        this.setupAddBalanceForm();
        
        // Add Task form
        this.setupAddTaskForm();
        
        // Add Promo Code form
        this.setupAddPromoForm();
        
        // Settings form
        this.setupSettingsForm();
    }
    
    setupAddBalanceForm() {
        const form = document.getElementById('add-balance-form');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addBalanceToUser();
        });
        
        // Search user
        const searchBtn = document.getElementById('search-user-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchUser());
        }
    }
    
    setupAddTaskForm() {
        const form = document.getElementById('add-task-form');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addTask();
        });
        
        // Task cost calculation
        this.setupTaskCostCalculator();
    }
    
    setupAddPromoForm() {
        const form = document.getElementById('add-promo-form');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addPromoCode();
        });
        
        // Generate random code
        const generateBtn = document.getElementById('generate-code-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generatePromoCode());
        }
    }
    
    setupSettingsForm() {
        const form = document.getElementById('settings-form');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveSettings();
        });
    }
    
    setupTaskCostCalculator() {
        const usersSelect = document.getElementById('task-users');
        const costDisplay = document.getElementById('task-cost-display');
        
        if (usersSelect && costDisplay) {
            usersSelect.addEventListener('change', () => {
                this.updateTaskCost();
            });
        }
    }
    
    updateTaskCost() {
        const usersSelect = document.getElementById('task-users');
        const costDisplay = document.getElementById('task-cost-display');
        
        if (!usersSelect || !costDisplay) return;
        
        const userCount = parseInt(usersSelect.value) || 0;
        const cost = (userCount / 500) * 0.5; // 0.5 TON per 500 users
        
        costDisplay.textContent = cost.toFixed(2);
        costDisplay.innerHTML = `${cost.toFixed(2)} <img src="https://logo.svgcdn.com/token-branded/ton.png" style="width: 20px; height: 20px; vertical-align: middle;">`;
    }
    
    setupMobileMenu() {
        const menuToggle = document.getElementById('menu-toggle');
        const closeBtn = document.querySelector('#sidebar .close-btn');
        const overlay = document.getElementById('overlay');
        
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.add('open');
                overlay.classList.add('show');
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('sidebar').classList.remove('open');
                overlay.classList.remove('show');
            });
        }
        
        if (overlay) {
            overlay.addEventListener('click', () => {
                document.getElementById('sidebar').classList.remove('open');
                overlay.classList.remove('show');
            });
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
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }
    
    async showPage(pageName) {
        // Update active states
        const navLinks = document.querySelectorAll('.nav-menu li');
        const pages = document.querySelectorAll('.page');
        
        pages.forEach(page => page.classList.remove('active'));
        navLinks.forEach(link => link.classList.remove('active'));
        
        // Update page title
        this.updatePageTitle(pageName);
        
        // Add active class to selected menu item
        const activeLink = document.querySelector(`[data-page="${pageName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // Close sidebar on mobile
        if (window.innerWidth < 768) {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('overlay').classList.remove('show');
        }
        
        // Load page content
        try {
            const mainContent = document.getElementById('main-content');
            mainContent.innerHTML = `<div class="loading"><div class="spinner"></div><p>Loading ${pageName}...</p></div>`;
            
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
                    await this.renderWalletManager();
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
                case 'history':
                    await this.renderHistory();
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
            
        } catch (error) {
            console.error(`Error loading ${pageName}:`, error);
            this.notifications.error(`Error loading ${pageName}`, error.message);
        }
    }
    
    updatePageTitle(pageName) {
        const title = pageName.charAt(0).toUpperCase() + pageName.slice(1);
        document.getElementById('page-title').textContent = title;
    }
    
    async renderDashboard() {
        try {
            // Load system stats
            this.systemStats = await this.firebase.getSystemStats();
            
            const html = `
                <div id="dashboard" class="page active">
                    <h2>Dashboard</h2>
                    <p class="subtitle">System Overview & Statistics</p>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h3>Total Users</h3>
                            <div class="stat-value">${this.systemStats.users || 0}</div>
                            <div class="stat-label">Registered Users</div>
                        </div>
                        
                        <div class="stat-card">
                            <h3>Pending Withdrawals</h3>
                            <div class="stat-value">${this.systemStats.pendingWithdrawals || 0}</div>
                            <div class="stat-label">Awaiting Processing</div>
                        </div>
                        
                        <div class="stat-card">
                            <h3>Active Tasks</h3>
                            <div class="stat-value">${this.systemStats.activeTasks || 0}</div>
                            <div class="stat-label">Available Tasks</div>
                        </div>
                        
                        <div class="stat-card">
                            <h3>Active Promo Codes</h3>
                            <div class="stat-value">${this.systemStats.activePromos || 0}</div>
                            <div class="stat-label">Valid Promo Codes</div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3>Quick Actions</h3>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px;">
                            <button class="action-btn admin-btn-primary" onclick="window.adminPanel.showPage('users')">
                                <i class="fas fa-users"></i> Manage Users
                            </button>
                            <button class="action-btn admin-btn-success" onclick="window.adminPanel.showPage('withdrawals')">
                                <i class="fas fa-wallet"></i> Process Withdrawals
                            </button>
                            <button class="action-btn admin-btn-warning" onclick="window.adminPanel.showPage('addBalance')">
                                <i class="fas fa-plus-circle"></i> Add Balance
                            </button>
                            <button class="action-btn admin-btn-info" onclick="window.adminPanel.showPage('tasks')">
                                <i class="fas fa-tasks"></i> Manage Tasks
                            </button>
                            <button class="action-btn admin-btn-primary" onclick="window.adminPanel.showPage('promoCodes')">
                                <i class="fas fa-gift"></i> Promo Codes
                            </button>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3>System Status</h3>
                        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-circle" style="color: var(--admin-success);"></i>
                                <span>Firebase Connection: Active</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-circle" style="color: var(--admin-success);"></i>
                                <span>Database: Connected</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-circle" style="color: var(--admin-success);"></i>
                                <span>Authentication: Active</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-circle" style="color: var(--admin-success);"></i>
                                <span>Last Updated: ${new Date().toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('main-content').innerHTML = html;
            
        } catch (error) {
            console.error('Error rendering dashboard:', error);
            document.getElementById('main-content').innerHTML = `
                <div class="page active">
                    <div class="error-message">
                        <h3>Error Loading Dashboard</h3>
                        <p>${error.message}</p>
                    </div>
                </div>
            `;
        }
    }
    
    async renderUsers() {
        try {
            this.users = await this.firebase.getUsers(50);
            
            const html = `
                <div id="users" class="page active">
                    <h2>Users Management</h2>
                    <p class="subtitle">Total Users: ${this.users.length}</p>
                    
                    <div class="card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h3>All Users</h3>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" id="search-users" placeholder="Search users..." class="form-input" style="width: 200px;">
                                <button class="action-btn admin-btn-primary" onclick="window.adminPanel.searchUsers()">
                                    <i class="fas fa-search"></i> Search
                                </button>
                            </div>
                        </div>
                        
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Balance</th>
                                        <th>Referrals</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.users.map(user => this.renderUserRow(user)).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div style="margin-top: 20px; text-align: center;">
                            <button class="action-btn admin-btn-primary" onclick="window.adminPanel.loadMoreUsers()">
                                <i class="fas fa-arrow-down"></i> Load More
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('main-content').innerHTML = html;
            
        } catch (error) {
            console.error('Error rendering users:', error);
            this.notifications.error('Error', 'Failed to load users');
        }
    }
    
    renderUserRow(user) {
        const joinDate = new Date(user.createdAt || Date.now());
        const formattedDate = joinDate.toLocaleDateString();
        
        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${user.photoUrl || 'https://ui-avatars.com/api/?name=User&background=4A6FA5&color=fff'}" 
                             style="width: 36px; height: 36px; border-radius: 50%;">
                        <div>
                            <div style="font-weight: 600;">${user.firstName || 'User'} ${user.lastName || ''}</div>
                            <div style="font-size: 12px; color: var(--admin-text-secondary);">
                                ID: ${user.id} ${user.username ? `@${user.username}` : ''}
                            </div>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div style="font-weight: 600; color: var(--admin-accent);">
                            ${user.balance?.toFixed(3) || '0.000'} TON
                        </div>
                        <div style="font-size: 12px; color: var(--admin-text-secondary);">
                            ${user.tub?.toFixed(0) || '0'} GOLD
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-weight: 600;">${user.referrals || 0}</div>
                    <div style="font-size: 12px; color: var(--admin-text-secondary);">
                        ${user.activeReferrals || 0} active
                    </div>
                </td>
                <td>
                    <div style="font-size: 14px;">${formattedDate}</div>
                    <div style="font-size: 12px; color: var(--admin-text-secondary);">
                        ${joinDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="action-btn btn-sm admin-btn-primary" 
                                onclick="window.adminPanel.addBalanceToUserModal('${user.id}')">
                            <i class="fas fa-plus"></i> Add
                        </button>
                        <button class="action-btn btn-sm admin-btn-info" 
                                onclick="window.adminPanel.viewUserDetails('${user.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    async renderWithdrawals() {
        try {
            this.pendingWithdrawals = await this.firebase.getPendingWithdrawals();
            
            const html = `
                <div id="withdrawals" class="page active">
                    <h2>Pending Withdrawals</h2>
                    <p class="subtitle">Total Pending: ${this.pendingWithdrawals.length}</p>
                    
                    ${this.pendingWithdrawals.length === 0 ? `
                        <div class="empty-state">
                            <i class="fas fa-wallet empty-state-icon"></i>
                            <h3>No Pending Withdrawals</h3>
                            <p>There are no pending withdrawal requests at the moment.</p>
                        </div>
                    ` : `
                        <div class="withdrawals-grid">
                            ${this.pendingWithdrawals.map(withdrawal => this.renderWithdrawalCard(withdrawal)).join('')}
                        </div>
                    `}
                </div>
            `;
            
            document.getElementById('main-content').innerHTML = html;
            
        } catch (error) {
            console.error('Error rendering withdrawals:', error);
            this.notifications.error('Error', 'Failed to load withdrawals');
        }
    }
    
    renderWithdrawalCard(withdrawal) {
        const requestDate = new Date(withdrawal.timestamp);
        const formattedDate = requestDate.toLocaleString();
        
        return `
            <div class="withdrawal-card">
                <div class="withdrawal-header">
                    <div class="withdrawal-user">
                        <strong>${withdrawal.userName || 'Unknown User'}</strong>
                        <div style="font-size: 12px; color: var(--admin-text-secondary);">
                            User ID: ${withdrawal.userId}
                        </div>
                    </div>
                    <div class="withdrawal-amount">
                        ${withdrawal.amount?.toFixed(3) || '0.000'} TON
                    </div>
                </div>
                
                <div class="withdrawal-details">
                    <div><strong>Address:</strong> ${withdrawal.address || 'Not specified'}</div>
                    <div><strong>Request Date:</strong> ${formattedDate}</div>
                    <div><strong>Status:</strong> <span class="admin-status-pending">Pending</span></div>
                </div>
                
                <div class="withdrawal-actions">
                    <button class="action-btn admin-btn-success" 
                            onclick="window.adminPanel.processWithdrawal('${withdrawal.id}', 'approve')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="action-btn admin-btn-danger" 
                            onclick="window.adminPanel.processWithdrawal('${withdrawal.id}', 'reject')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `;
    }
    
    async renderWalletManager() {
        const html = `
            <div id="wallet" class="page active">
                <h2>Wallet Manager</h2>
                <p class="subtitle">Deposit & Withdrawal Management</p>
                
                <div class="wallet-manager-grid">
                    <div class="deposit-card">
                        <div class="deposit-header">
                            <h3><i class="fas fa-wallet"></i> Deposit Settings</h3>
                        </div>
                        
                        <div class="deposit-info">
                            <div class="info-label">Deposit Address</div>
                            <div class="info-value" id="deposit-address-value">
                                ${this.appConfig.depositAddress || 'UQDMj-aLehj4WZwvw0ZEcIVD14blpLWQxzdCmD7QjKOP6D-F'}
                            </div>
                            <button class="copy-btn" onclick="window.adminPanel.copyToClipboard('${this.appConfig.depositAddress}', 'Deposit address')">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                        </div>
                        
                        <div class="deposit-info">
                            <div class="info-label">Minimum Deposit</div>
                            <div class="info-value">
                                ${this.appConfig.minDeposit || 0.5} TON
                            </div>
                        </div>
                        
                        <div style="margin-top: 20px;">
                            <button class="action-btn admin-btn-primary btn-full" 
                                    onclick="window.adminPanel.updateDepositAddress()">
                                <i class="fas fa-edit"></i> Update Deposit Address
                            </button>
                        </div>
                    </div>
                    
                    <div class="withdrawal-card">
                        <div class="withdrawal-header">
                            <h3><i class="fas fa-money-bill-wave"></i> Withdrawal Settings</h3>
                        </div>
                        
                        <div class="form-group">
                            <label for="min-withdrawal">Minimum Withdrawal (TON)</label>
                            <input type="number" id="min-withdrawal" class="form-input" 
                                   value="${this.appConfig.minWithdrawal || 0.1}" step="0.01" min="0.01">
                        </div>
                        
                        <div class="form-group">
                            <label for="withdrawal-fee">Withdrawal Fee (%)</label>
                            <input type="number" id="withdrawal-fee" class="form-input" 
                                   value="${this.appConfig.withdrawalFee || 0}" step="0.1" min="0" max="10">
                        </div>
                        
                        <div class="form-group">
                            <label for="daily-withdrawal-limit">Daily Withdrawal Limit (TON)</label>
                            <input type="number" id="daily-withdrawal-limit" class="form-input" 
                                   value="${this.appConfig.dailyWithdrawalLimit || 10}" step="0.1" min="0">
                        </div>
                        
                        <button class="action-btn admin-btn-success btn-full" onclick="window.adminPanel.updateWithdrawalSettings()">
                            <i class="fas fa-save"></i> Save Withdrawal Settings
                        </button>
                    </div>
                </div>
                
                <div class="card" style="margin-top: 24px;">
                    <h3><i class="fas fa-history"></i> Balance History</h3>
                    <p style="color: var(--admin-text-secondary); margin-bottom: 16px;">
                        Recent balance additions and deductions
                    </p>
                    
                    <div id="balance-history-container">
                        <div class="loading">
                            <div class="spinner"></div>
                            <p>Loading balance history...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('main-content').innerHTML = html;
        
        // Load balance history
        await this.loadBalanceHistory();
    }
    
    async loadBalanceHistory() {
        try {
            const transactions = await this.firebase.getBalanceHistory(null, 20);
            const container = document.getElementById('balance-history-container');
            
            if (!container) return;
            
            if (transactions.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-history empty-state-icon"></i>
                        <h3>No Balance History</h3>
                        <p>No balance transactions recorded yet.</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="table-container">
                    <table class="balance-history-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Description</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions.map(tx => this.renderBalanceHistoryRow(tx)).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading balance history:', error);
            document.getElementById('balance-history-container').innerHTML = `
                <div class="error-message">
                    Error loading balance history: ${error.message}
                </div>
            `;
        }
    }
    
    renderBalanceHistoryRow(transaction) {
        const txDate = new Date(transaction.timestamp);
        const formattedDate = txDate.toLocaleDateString();
        const formattedTime = txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const isPositive = transaction.amount > 0;
        const amountClass = isPositive ? 'positive' : 'negative';
        const amountSign = isPositive ? '+' : '';
        
        return `
            <tr>
                <td>
                    <div style="font-size: 14px; font-weight: 600;">${transaction.userId || 'System'}</div>
                    <div style="font-size: 12px; color: var(--admin-text-secondary);">
                        ${transaction.userName || 'Unknown'}
                    </div>
                </td>
                <td>
                    <span style="font-size: 12px; padding: 4px 8px; border-radius: 12px; background: var(--admin-bg-primary);">
                        ${transaction.type || 'transaction'}
                    </span>
                </td>
                <td class="${amountClass}">
                    ${amountSign}${transaction.amount?.toFixed(3) || '0.000'} TON
                </td>
                <td>
                    <div style="font-size: 14px;">${transaction.description || 'No description'}</div>
                    ${transaction.adminAction ? `
                        <div style="font-size: 11px; color: var(--admin-text-secondary);">Admin Action</div>
                    ` : ''}
                </td>
                <td>
                    <div style="font-size: 14px;">${formattedDate}</div>
                    <div style="font-size: 12px; color: var(--admin-text-secondary);">${formattedTime}</div>
                </td>
            </tr>
        `;
    }
    
    async renderTasks() {
        try {
            this.tasks = await this.firebase.getTasks();
            
            const html = `
                <div id="tasks" class="page active">
                    <h2>Tasks Management</h2>
                    <p class="subtitle">Total Tasks: ${this.tasks.length}</p>
                    
                    <div class="card">
                        <h3><i class="fas fa-plus-circle"></i> Add New Task</h3>
                        
                        <form id="add-task-form">
                            <div class="form-group">
                                <label for="task-name">Task Name *</label>
                                <input type="text" id="task-name" class="form-input" placeholder="Enter task name" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="task-type">Task Type *</label>
                                <select id="task-type" class="form-select" required>
                                    <option value="">Choose task type</option>
                                    <option value="group">Group/Channel</option>
                                    <option value="bot">Bot</option>
                                    <option value="other">Other Links</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="task-link">Task Link *</label>
                                <input type="url" id="task-link" class="form-input" placeholder="https://..." required>
                            </div>
                            
                            <div class="form-group">
                                <label for="task-users">Total Users *</label>
                                <select id="task-users" class="form-select" required>
                                    <option value="">Choose target users</option>
                                    <option value="500">500 users (0.5 TON)</option>
                                    <option value="1000">1000 users (1.0 TON)</option>
                                    <option value="3000">3000 users (2.5 TON)</option>
                                    <option value="5000">5000 users (4.0 TON)</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="task-reward">Reward (GOLD) *</label>
                                <input type="number" id="task-reward" class="form-input" 
                                       placeholder="100" min="1" step="1" required>
                                <small style="color: var(--admin-text-secondary);">
                                    Reward in GOLD coins for users who complete the task
                                </small>
                            </div>
                            
                            <div class="form-group">
                                <label>Total Cost</label>
                                <div class="cost-display">
                                    <div class="cost-label">You will pay:</div>
                                    <div class="cost-amount" id="task-cost-display">0.00 TON</div>
                                </div>
                            </div>
                            
                            <button type="submit" class="action-btn admin-btn-success btn-full">
                                <i class="fas fa-plus"></i> Add Task
                            </button>
                        </form>
                    </div>
                    
                    <div class="card" style="margin-top: 24px;">
                        <h3><i class="fas fa-tasks"></i> Active Tasks (${this.tasks.length})</h3>
                        
                        ${this.tasks.length === 0 ? `
                            <div class="empty-state">
                                <i class="fas fa-tasks empty-state-icon"></i>
                                <h3>No Tasks Available</h3>
                                <p>Add your first task to get started!</p>
                            </div>
                        ` : `
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Task Name</th>
                                            <th>Type</th>
                                            <th>Progress</th>
                                            <th>Reward</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.tasks.map(task => this.renderTaskRow(task)).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </div>
                </div>
            `;
            
            document.getElementById('main-content').innerHTML = html;
            
            // Setup task cost calculator
            this.setupTaskCostCalculator();
            
        } catch (error) {
            console.error('Error rendering tasks:', error);
            this.notifications.error('Error', 'Failed to load tasks');
        }
    }
    
    renderTaskRow(task) {
        const createdDate = new Date(task.createdAt || Date.now());
        const formattedDate = createdDate.toLocaleDateString();
        
        return `
            <tr>
                <td>
                    <div style="font-weight: 600;">${task.name || 'Unnamed Task'}</div>
                    <div style="font-size: 12px; color: var(--admin-text-secondary);">
                        Created: ${formattedDate}
                    </div>
                </td>
                <td>
                    <span style="font-size: 12px; padding: 4px 8px; border-radius: 12px; background: var(--admin-bg-primary);">
                        ${task.type === 'group' ? 'Group' : task.type === 'bot' ? 'Bot' : 'Other'}
                    </span>
                </td>
                <td>
                    <div style="font-weight: 600;">${task.progress || 0}%</div>
                    <div style="font-size: 12px; color: var(--admin-text-secondary);">
                        ${task.currentUsers || 0}/${task.targetUsers || 0} users
                    </div>
                </td>
                <td>
                    <div style="font-weight: 600; color: var(--admin-warning);">
                        ${task.reward || 0} GOLD
                    </div>
                </td>
                <td>
                    <span class="admin-status-${task.status === 'active' ? 'completed' : 'pending'}">
                        ${task.status || 'active'}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="action-btn btn-sm admin-btn-info" 
                                onclick="window.adminPanel.editTask('${task.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-btn btn-sm admin-btn-danger" 
                                onclick="window.adminPanel.deleteTask('${task.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    async renderPromoCodes() {
        try {
            this.promoCodes = await this.firebase.getPromoCodes();
            
            const html = `
                <div id="promoCodes" class="page active">
                    <h2>Promo Codes Management</h2>
                    <p class="subtitle">Total Active Promo Codes: ${this.promoCodes.length}</p>
                    
                    <div class="card">
                        <h3><i class="fas fa-plus-circle"></i> Create New Promo Code</h3>
                        
                        <form id="add-promo-form">
                            <div class="form-group">
                                <label for="promo-type">Reward Type *</label>
                                <select id="promo-type" class="form-select" required>
                                    <option value="">Choose reward type</option>
                                    <option value="gold">GOLD</option>
                                    <option value="ton">TON</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="promo-reward">Reward Amount *</label>
                                <input type="number" id="promo-reward" class="form-input" 
                                       placeholder="Enter amount" min="1" step="1" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="promo-code">Promo Code</label>
                                <div style="display: flex; gap: 8px;">
                                    <input type="text" id="promo-code" class="form-input" 
                                           placeholder="Leave empty for auto-generate" maxlength="12">
                                    <button type="button" class="action-btn admin-btn-primary" 
                                            id="generate-code-btn">
                                        <i class="fas fa-random"></i> Generate
                                    </button>
                                </div>
                                <small style="color: var(--admin-text-secondary);">
                                    Leave empty to auto-generate an 8-character code
                                </small>
                            </div>
                            
                            <div class="form-group">
                                <label for="promo-max-uses">Maximum Uses (Optional)</label>
                                <input type="number" id="promo-max-uses" class="form-input" 
                                       placeholder="Unlimited if empty" min="1" step="1">
                            </div>
                            
                            <button type="submit" class="action-btn admin-btn-success btn-full">
                                <i class="fas fa-plus"></i> Create Promo Code
                            </button>
                        </form>
                    </div>
                    
                    <div class="card" style="margin-top: 24px;">
                        <h3><i class="fas fa-gift"></i> Active Promo Codes</h3>
                        
                        ${this.promoCodes.length === 0 ? `
                            <div class="empty-state">
                                <i class="fas fa-gift empty-state-icon"></i>
                                <h3>No Promo Codes</h3>
                                <p>Create your first promo code to get started!</p>
                            </div>
                        ` : `
                            <div class="promo-codes-grid">
                                ${this.promoCodes.map(promo => this.renderPromoCard(promo)).join('')}
                            </div>
                        `}
                    </div>
                </div>
            `;
            
            document.getElementById('main-content').innerHTML = html;
            
        } catch (error) {
            console.error('Error rendering promo codes:', error);
            this.notifications.error('Error', 'Failed to load promo codes');
        }
    }
    
    renderPromoCard(promo) {
        const createdDate = new Date(promo.createdAt || Date.now());
        const formattedDate = createdDate.toLocaleDateString();
        
        return `
            <div class="promo-card">
                <div class="promo-header">
                    <div class="promo-code">${promo.code}</div>
                    <div class="promo-reward">
                        ${promo.reward} ${promo.type === 'ton' ? 'TON' : 'GOLD'}
                    </div>
                </div>
                
                <div class="promo-stats">
                    <div>
                        <div style="font-size: 11px; color: var(--admin-text-secondary);">Type</div>
                        <div class="promo-type ${promo.type}">${promo.type.toUpperCase()}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: var(--admin-text-secondary);">Created</div>
                        <div style="font-weight: 600;">${formattedDate}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: var(--admin-text-secondary);">Used</div>
                        <div style="font-weight: 600;">${promo.usedCount || 0} times</div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: 16px;">
                    <button class="action-btn admin-btn-danger btn-full" 
                            onclick="window.adminPanel.deletePromoCode('${promo.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }
    
    async renderAddBalance() {
        const html = `
            <div id="addBalance" class="page active">
                <h2>Add Balance to User</h2>
                <p class="subtitle">Add GOLD or TON balance to any user</p>
                
                <div class="card">
                    <h3><i class="fab fa-telegram"></i> Add Balance Form</h3>
                    
                    <form id="add-balance-form">
                        <div class="form-group">
                            <label for="user-id">Telegram User ID *</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" id="user-id" class="form-input" 
                                       placeholder="Enter Telegram ID" required>
                                <button type="button" class="action-btn admin-btn-primary" 
                                        id="search-user-btn">
                                    <i class="fas fa-search"></i> Search
                                </button>
                            </div>
                            <small style="color: var(--admin-text-secondary);">
                                This is the unique Telegram ID of the user (e.g., 123456789)
                            </small>
                        </div>
                        
                        <div id="user-info" style="display: none; margin-bottom: 20px;">
                            <!-- User info will be displayed here -->
                        </div>
                        
                        <div class="form-group">
                            <label for="balance-type">Balance Type *</label>
                            <select id="balance-type" class="form-select" required>
                                <option value="">Choose balance type</option>
                                <option value="ton">TON</option>
                                <option value="gold">GOLD</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="balance-amount">Amount *</label>
                            <input type="number" id="balance-amount" class="form-input" 
                                   placeholder="Enter amount" step="0.001" min="0.001" required>
                            <small style="color: var(--admin-text-secondary);">
                                For GOLD: whole numbers | For TON: decimals allowed
                            </small>
                        </div>
                        
                        <div class="form-group">
                            <label for="balance-reason">Reason (Optional)</label>
                            <input type="text" id="balance-reason" class="form-input" 
                                   placeholder="e.g., Bonus, Reward, Correction">
                        </div>
                        
                        <button type="submit" class="action-btn admin-btn-success btn-full">
                            <i class="fas fa-plus-circle"></i> Add Balance to User
                        </button>
                    </form>
                    
                    <div id="balance-message" class="hidden"></div>
                </div>
                
                <div class="card" style="margin-top: 24px;">
                    <h3><i class="fas fa-history"></i> Recent Balance Additions</h3>
                    <p style="color: var(--admin-text-secondary); margin-bottom: 16px;">
                        Last 20 balance additions
                    </p>
                    
                    <div id="recent-balance-history">
                        <div class="loading">
                            <div class="spinner"></div>
                            <p>Loading recent history...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('main-content').innerHTML = html;
        
        // Load recent balance history
        await this.loadRecentBalanceHistory();
    }
    
    async loadRecentBalanceHistory() {
        try {
            const transactions = await this.firebase.getBalanceHistory(null, 20);
            const filteredTransactions = transactions.filter(tx => 
                tx.type === 'admin_addition' || tx.adminAction === true
            );
            
            const container = document.getElementById('recent-balance-history');
            if (!container) return;
            
            if (filteredTransactions.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-history empty-state-icon"></i>
                        <h3>No Recent Balance Additions</h3>
                        <p>No balance additions have been made yet.</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Reason</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredTransactions.map(tx => this.renderRecentBalanceRow(tx)).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading recent balance history:', error);
            document.getElementById('recent-balance-history').innerHTML = `
                <div class="error-message">
                    Error loading history: ${error.message}
                </div>
            `;
        }
    }
    
    renderRecentBalanceRow(transaction) {
        const txDate = new Date(transaction.timestamp);
        const formattedDate = txDate.toLocaleDateString();
        const formattedTime = txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const isTON = transaction.balanceType === 'ton';
        const amountDisplay = isTON ? 
            `${transaction.amount?.toFixed(3)} TON` : 
            `${transaction.amount?.toFixed(0)} GOLD`;
        
        return `
            <tr>
                <td>
                    <div style="font-size: 14px; font-weight: 600;">${transaction.userId || 'System'}</div>
                    <div style="font-size: 12px; color: var(--admin-text-secondary);">
                        ${transaction.userName || 'Unknown'}
                    </div>
                </td>
                <td>
                    <span style="font-size: 12px; padding: 4px 8px; border-radius: 12px; 
                           background: ${isTON ? 'var(--admin-info)' : 'var(--admin-warning)'}; color: white;">
                        ${isTON ? 'TON' : 'GOLD'}
                    </span>
                </td>
                <td style="font-weight: 600; color: var(--admin-success);">
                    +${amountDisplay}
                </td>
                <td>
                    <div style="font-size: 14px;">${transaction.description || 'No reason'}</div>
                </td>
                <td>
                    <div style="font-size: 14px;">${formattedDate}</div>
                    <div style="font-size: 12px; color: var(--admin-text-secondary);">${formattedTime}</div>
                </td>
            </tr>
        `;
    }
    
    async renderSettings() {
        const html = `
            <div id="settings" class="page active">
                <h2>App Settings</h2>
                <p class="subtitle">Configure application settings</p>
                
                <div class="card">
                    <h3><i class="fas fa-cog"></i> General Settings</h3>
                    
                    <form id="settings-form">
                        <div class="form-group">
                            <label for="admin-password">Admin Password *</label>
                            <input type="password" id="admin-password" class="form-input" 
                                   value="${this.appConfig.adminPassword || 'Mostafa$500'}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="bot-username">Bot Username *</label>
                            <input type="text" id="bot-username" class="form-input" 
                                   value="${this.appConfig.botUsername || 'xbossbot'}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="exchange-rate">Exchange Rate (GOLD to TON) *</label>
                            <input type="number" id="exchange-rate" class="form-input" 
                                   value="${this.appConfig.exchangeRate || 10000}" min="1" step="1" required>
                            <small style="color: var(--admin-text-secondary);">
                                How many GOLD coins equal 1 TON
                            </small>
                        </div>
                        
                        <div class="form-group">
                            <label for="min-deposit">Minimum Deposit (TON) *</label>
                            <input type="number" id="min-deposit" class="form-input" 
                                   value="${this.appConfig.minDeposit || 0.5}" step="0.1" min="0.1" required>
                        </div>
                        
                        <button type="submit" class="action-btn admin-btn-success btn-full">
                            <i class="fas fa-save"></i> Save Settings
                        </button>
                    </form>
                    
                    <div id="settings-message" class="hidden"></div>
                </div>
                
                <div class="card" style="margin-top: 24px;">
                    <h3><i class="fas fa-tasks"></i> Task Cost Settings</h3>
                    <p style="color: var(--admin-text-secondary); margin-bottom: 16px;">
                        Configure costs for adding tasks (TON per 500 users)
                    </p>
                    
                    <div class="form-group">
                        <label for="base-task-cost">Base Cost per 500 users (TON)</label>
                        <input type="number" id="base-task-cost" class="form-input" 
                               value="${this.appConfig.taskCosts?.[500] || 0.5}" step="0.1" min="0.1">
                    </div>
                    
                    <button class="action-btn admin-btn-primary btn-full" onclick="window.adminPanel.updateTaskCosts()">
                        <i class="fas fa-save"></i> Update Task Costs
                    </button>
                </div>
                
                <div class="card" style="margin-top: 24px;">
                    <h3><i class="fas fa-shield-alt"></i> Security Settings</h3>
                    
                    <div class="form-group">
                        <label for="max-login-attempts">Max Login Attempts</label>
                        <input type="number" id="max-login-attempts" class="form-input" 
                               value="${this.appConfig.maxLoginAttempts || 5}" min="1" step="1">
                    </div>
                    
                    <div class="form-group">
                        <label for="session-timeout">Session Timeout (minutes)</label>
                        <input type="number" id="session-timeout" class="form-input" 
                               value="${this.appConfig.sessionTimeout || 30}" min="5" step="5">
                    </div>
                    
                    <button class="action-btn admin-btn-primary btn-full" onclick="window.adminPanel.updateSecuritySettings()">
                        <i class="fas fa-save"></i> Update Security Settings
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('main-content').innerHTML = html;
    }
    
    async renderHistory() {
        // Similar to other render methods, implement history page
        const html = `
            <div id="history" class="page active">
                <h2>Withdrawal History</h2>
                <p class="subtitle">Completed and rejected withdrawals</p>
                
                <div class="card">
                    <h3>Withdrawal History</h3>
                    <p>This page would show completed and rejected withdrawal history.</p>
                    <!-- Implement withdrawal history table here -->
                </div>
            </div>
        `;
        
        document.getElementById('main-content').innerHTML = html;
    }
    
    async renderBroadcast() {
        const html = `
            <div id="broadcast" class="page active">
                <h2>Broadcast Messages</h2>
                <p class="subtitle">Send messages to all users</p>
                
                <div class="card">
                    <h3>Broadcast Message</h3>
                    
                    <div class="form-group">
                        <label for="broadcast-title">Message Title</label>
                        <input type="text" id="broadcast-title" class="form-input" 
                               placeholder="Enter message title">
                    </div>
                    
                    <div class="form-group">
                        <label for="broadcast-message">Message Content</label>
                        <textarea id="broadcast-message" class="form-textarea" 
                                  placeholder="Enter your message here..." rows="5"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="broadcast-type">Message Type</label>
                        <select id="broadcast-type" class="form-select">
                            <option value="info">Information</option>
                            <option value="warning">Warning</option>
                            <option value="important">Important</option>
                            <option value="update">Update</option>
                        </select>
                    </div>
                    
                    <button class="action-btn admin-btn-success btn-full" onclick="window.adminPanel.sendBroadcast()">
                        <i class="fas fa-paper-plane"></i> Send Broadcast
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('main-content').innerHTML = html;
    }
    
    async login() {
        const loginButton = document.getElementById('login-button');
        const loginPassword = document.getElementById('login-password');
        const loginMessage = document.getElementById('login-message');
        
        if (!loginButton || !loginPassword || !loginMessage) return;
        
        const password = loginPassword.value.trim();
        
        if (!password) {
            this.showLoginMessage('Please enter admin password', 'error');
            return;
        }
        
        try {
            loginButton.disabled = true;
            loginButton.textContent = 'Authenticating...';
            
            // Check password
            const validPassword = this.appConfig.adminPassword || "Mostafa$500";
            
            if (password === validPassword) {
                this.showLoginMessage('Login successful! Loading admin panel...', 'success');
                
                setTimeout(() => {
                    document.getElementById('login-container').style.display = 'none';
                    document.getElementById('app-container').style.display = 'flex';
                }, 1000);
                
            } else {
                this.showLoginMessage('Invalid password!', 'error');
                loginPassword.focus();
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginMessage('Login failed. Please try again.', 'error');
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'Login';
        }
    }
    
    showLoginMessage(message, type) {
        const loginMessage = document.getElementById('login-message');
        if (!loginMessage) return;
        
        loginMessage.textContent = message;
        loginMessage.className = `login-message ${type}`;
        loginMessage.style.display = 'block';
        
        setTimeout(() => {
            loginMessage.style.display = 'none';
        }, 5000);
    }
    
    showLoginError(message) {
        const loginContainer = document.getElementById('login-container');
        if (!loginContainer) return;
        
        loginContainer.innerHTML = `
            <div class="login-card">
                <h2 class="login-title"><i class="fas fa-exclamation-triangle"></i> Initialization Error</h2>
                <div class="error-message">
                    <h3>Admin Panel Failed to Start</h3>
                    <p>${message}</p>
                    <p style="margin-top: 15px; font-size: 14px;">
                        Please check your Firebase configuration and try again.
                    </p>
                </div>
                <button class="login-btn" onclick="location.reload()">
                    <i class="fas fa-redo"></i> Reload Admin Panel
                </button>
            </div>
        `;
    }
    
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            document.getElementById('app-container').style.display = 'none';
            document.getElementById('login-container').style.display = 'flex';
            
            // Clear password field
            const loginPassword = document.getElementById('login-password');
            if (loginPassword) {
                loginPassword.value = '';
            }
            
            // Reset to dashboard
            this.currentPage = 'dashboard';
        }
    }
    
    async searchUser() {
        const userIdInput = document.getElementById('user-id');
        const userInfoDiv = document.getElementById('user-info');
        
        if (!userIdInput || !userInfoDiv) return;
        
        const userId = userIdInput.value.trim();
        if (!userId) {
            this.notifications.warning('Search', 'Please enter a Telegram ID');
            return;
        }
        
        try {
            const user = await this.firebase.getUserById(userId);
            if (!user) {
                userInfoDiv.innerHTML = `
                    <div class="error-message">
                        User with Telegram ID "${userId}" not found in database.
                    </div>
                `;
                userInfoDiv.style.display = 'block';
                return;
            }
            
            userInfoDiv.innerHTML = `
                <div class="success-message">
                    <h4>✅ User Found</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 12px;">
                        <div>
                            <div style="font-size: 12px; color: var(--admin-text-secondary);">Name</div>
                            <div style="font-weight: 600;">${user.firstName || 'No Name'} ${user.lastName || ''}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--admin-text-secondary);">Telegram ID</div>
                            <div style="font-weight: 600;">${userId}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--admin-text-secondary);">TON Balance</div>
                            <div style="font-weight: 600; color: var(--admin-accent);">
                                ${user.balance?.toFixed(3) || '0.000'} TON
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--admin-text-secondary);">GOLD Balance</div>
                            <div style="font-weight: 600; color: var(--admin-warning);">
                                ${user.tub?.toFixed(0) || '0'} GOLD
                            </div>
                        </div>
                    </div>
                </div>
            `;
            userInfoDiv.style.display = 'block';
            
        } catch (error) {
            console.error('Error searching user:', error);
            userInfoDiv.innerHTML = `
                <div class="error-message">
                    Error searching user: ${error.message}
                </div>
            `;
            userInfoDiv.style.display = 'block';
        }
    }
    
    async addBalanceToUser() {
        const userIdInput = document.getElementById('user-id');
        const balanceTypeSelect = document.getElementById('balance-type');
        const balanceAmountInput = document.getElementById('balance-amount');
        const balanceReasonInput = document.getElementById('balance-reason');
        const messageDiv = document.getElementById('balance-message');
        
        if (!userIdInput || !balanceTypeSelect || !balanceAmountInput || !messageDiv) {
            return;
        }
        
        const userId = userIdInput.value.trim();
        const balanceType = balanceTypeSelect.value;
        const amount = parseFloat(balanceAmountInput.value);
        const reason = balanceReasonInput.value.trim() || 'Admin addition';
        
        if (!userId) {
            this.notifications.error('Error', 'Please enter a Telegram ID');
            return;
        }
        
        if (!balanceType) {
            this.notifications.error('Error', 'Please select balance type');
            return;
        }
        
        if (!amount || amount <= 0) {
            this.notifications.error('Error', 'Please enter a valid amount');
            return;
        }
        
        try {
            // Verify user exists
            const user = await this.firebase.getUserById(userId);
            if (!user) {
                this.notifications.error('Error', 'User not found. Please search for the user first.');
                return;
            }
            
            // Add balance
            await this.firebase.addBalanceToUser(userId, amount, balanceType, reason);
            
            // Show success message
            messageDiv.innerHTML = `
                <div class="success-message">
                    <h4>✅ Balance Added Successfully!</h4>
                    <div style="margin-top: 12px;">
                        <p><strong>User:</strong> ${user.firstName || 'Unknown'} ${user.lastName || ''}</p>
                        <p><strong>Telegram ID:</strong> ${userId}</p>
                        <p><strong>Type:</strong> ${balanceType === 'ton' ? 'TON' : 'GOLD'}</p>
                        <p><strong>Amount Added:</strong> ${amount}</p>
                        <p><strong>Reason:</strong> ${reason}</p>
                        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            `;
            messageDiv.classList.remove('hidden');
            
            // Clear amount field
            balanceAmountInput.value = '';
            balanceReasonInput.value = '';
            
            // Reload recent history
            await this.loadRecentBalanceHistory();
            
            // Show notification
            this.notifications.success(
                'Balance Added',
                `${amount} ${balanceType === 'ton' ? 'TON' : 'GOLD'} added to user ${userId}`
            );
            
        } catch (error) {
            console.error('Error adding balance:', error);
            messageDiv.innerHTML = `
                <div class="error-message">
                    Error adding balance: ${error.message}
                </div>
            `;
            messageDiv.classList.remove('hidden');
            this.notifications.error('Error', error.message || 'Failed to add balance');
        }
    }
    
    async addTask() {
        const taskNameInput = document.getElementById('task-name');
        const taskTypeSelect = document.getElementById('task-type');
        const taskLinkInput = document.getElementById('task-link');
        const taskUsersSelect = document.getElementById('task-users');
        const taskRewardInput = document.getElementById('task-reward');
        
        if (!taskNameInput || !taskTypeSelect || !taskLinkInput || !taskUsersSelect || !taskRewardInput) {
            return;
        }
        
        const taskName = taskNameInput.value.trim();
        const taskType = taskTypeSelect.value;
        const taskLink = taskLinkInput.value.trim();
        const targetUsers = parseInt(taskUsersSelect.value);
        const reward = parseInt(taskRewardInput.value);
        
        // Validation
        if (!taskName || taskName.length < 3) {
            this.notifications.error('Error', 'Task name must be at least 3 characters');
            return;
        }
        
        if (!taskType) {
            this.notifications.error('Error', 'Please select task type');
            return;
        }
        
        if (!taskLink || !this.validators.isValidUrl(taskLink)) {
            this.notifications.error('Error', 'Please enter a valid URL');
            return;
        }
        
        if (!targetUsers || isNaN(targetUsers)) {
            this.notifications.error('Error', 'Please select target users');
            return;
        }
        
        if (!reward || reward < 1) {
            this.notifications.error('Error', 'Please enter a valid reward amount');
            return;
        }
        
        try {
            const taskData = {
                name: taskName,
                type: taskType,
                link: taskLink,
                targetUsers: targetUsers,
                reward: reward,
                description: `Join ${taskType === 'group' ? 'group/channel' : 'bot'} and stay active`
            };
            
            await this.firebase.addTask(taskData);
            
            // Clear form
            taskNameInput.value = '';
            taskTypeSelect.value = '';
            taskLinkInput.value = '';
            taskUsersSelect.value = '';
            taskRewardInput.value = '';
            
            // Update cost display
            document.getElementById('task-cost-display').textContent = '0.00 TON';
            
            // Show success
            this.notifications.success(
                'Task Added',
                `Task "${taskName}" has been added successfully!`
            );
            
            // Reload tasks
            await this.renderTasks();
            
        } catch (error) {
            console.error('Error adding task:', error);
            this.notifications.error('Error', error.message || 'Failed to add task');
        }
    }
    
    async deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
            return;
        }
        
        try {
            await this.firebase.deleteTask(taskId);
            this.notifications.success('Task Deleted', 'Task has been deleted successfully');
            
            // Reload tasks
            await this.renderTasks();
            
        } catch (error) {
            console.error('Error deleting task:', error);
            this.notifications.error('Error', error.message || 'Failed to delete task');
        }
    }
    
    async addPromoCode() {
        const promoTypeSelect = document.getElementById('promo-type');
        const promoRewardInput = document.getElementById('promo-reward');
        const promoCodeInput = document.getElementById('promo-code');
        const promoMaxUsesInput = document.getElementById('promo-max-uses');
        
        if (!promoTypeSelect || !promoRewardInput) return;
        
        const type = promoTypeSelect.value;
        const reward = parseFloat(promoRewardInput.value);
        let code = promoCodeInput?.value.trim() || '';
        const maxUses = promoMaxUsesInput?.value ? parseInt(promoMaxUsesInput.value) : null;
        
        if (!type) {
            this.notifications.error('Error', 'Please select reward type');
            return;
        }
        
        if (!reward || reward <= 0) {
            this.notifications.error('Error', 'Please enter a valid reward amount');
            return;
        }
        
        // Generate code if empty
        if (!code) {
            code = this.generatePromoCode(8);
            if (promoCodeInput) {
                promoCodeInput.value = code;
            }
        }
        
        if (code.length < 4) {
            this.notifications.error('Error', 'Promo code must be at least 4 characters');
            return;
        }
        
        try {
            const promoData = {
                code: code,
                type: type,
                reward: reward,
                maxUses: maxUses,
                status: 'active'
            };
            
            await this.firebase.addPromoCode(promoData);
            
            // Clear form
            promoTypeSelect.value = '';
            promoRewardInput.value = '';
            if (promoCodeInput) promoCodeInput.value = '';
            if (promoMaxUsesInput) promoMaxUsesInput.value = '';
            
            // Show success
            this.notifications.success(
                'Promo Code Created',
                `Promo code "${code}" has been created successfully!`
            );
            
            // Reload promo codes
            await this.renderPromoCodes();
            
        } catch (error) {
            console.error('Error adding promo code:', error);
            this.notifications.error('Error', error.message || 'Failed to create promo code');
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
    
    async deletePromoCode(promoId) {
        if (!confirm('Are you sure you want to delete this promo code?')) {
            return;
        }
        
        try {
            await this.firebase.deletePromoCode(promoId);
            this.notifications.success('Promo Code Deleted', 'Promo code has been deleted');
            
            // Reload promo codes
            await this.renderPromoCodes();
            
        } catch (error) {
            console.error('Error deleting promo code:', error);
            this.notifications.error('Error', error.message || 'Failed to delete promo code');
        }
    }
    
    async saveSettings() {
        const adminPasswordInput = document.getElementById('admin-password');
        const botUsernameInput = document.getElementById('bot-username');
        const exchangeRateInput = document.getElementById('exchange-rate');
        const minDepositInput = document.getElementById('min-deposit');
        const messageDiv = document.getElementById('settings-message');
        
        if (!adminPasswordInput || !botUsernameInput || !exchangeRateInput || !minDepositInput || !messageDiv) {
            return;
        }
        
        const adminPassword = adminPasswordInput.value.trim();
        const botUsername = botUsernameInput.value.trim();
        const exchangeRate = parseInt(exchangeRateInput.value);
        const minDeposit = parseFloat(minDepositInput.value);
        
        // Validation
        if (!adminPassword || adminPassword.length < 4) {
            this.notifications.error('Error', 'Admin password must be at least 4 characters');
            return;
        }
        
        if (!botUsername || !botUsername.startsWith('@')) {
            this.notifications.error('Error', 'Bot username must start with @');
            return;
        }
        
        if (!exchangeRate || exchangeRate < 1) {
            this.notifications.error('Error', 'Please enter a valid exchange rate');
            return;
        }
        
        if (!minDeposit || minDeposit < 0.1) {
            this.notifications.error('Error', 'Minimum deposit must be at least 0.1 TON');
            return;
        }
        
        try {
            const updates = {
                adminPassword: adminPassword,
                botUsername: botUsername,
                exchangeRate: exchangeRate,
                minDeposit: minDeposit
            };
            
            await this.firebase.updateAppConfig(updates);
            
            // Update local config
            this.appConfig = { ...this.appConfig, ...updates };
            
            // Show success message
            messageDiv.innerHTML = `
                <div class="success-message">
                    <h4>✅ Settings Saved Successfully!</h4>
                    <p>Application settings have been updated.</p>
                </div>
            `;
            messageDiv.classList.remove('hidden');
            
            // Hide message after 5 seconds
            setTimeout(() => {
                messageDiv.classList.add('hidden');
            }, 5000);
            
            this.notifications.success('Settings Saved', 'Application settings updated successfully');
            
        } catch (error) {
            console.error('Error saving settings:', error);
            messageDiv.innerHTML = `
                <div class="error-message">
                    Error saving settings: ${error.message}
                </div>
            `;
            messageDiv.classList.remove('hidden');
            this.notifications.error('Error', error.message || 'Failed to save settings');
        }
    }
    
    async processWithdrawal(withdrawalId, action) {
        if (!confirm(`Are you sure you want to ${action} this withdrawal?`)) {
            return;
        }
        
        try {
            await this.firebase.processWithdrawal(withdrawalId, action);
            
            this.notifications.success(
                'Withdrawal Processed',
                `Withdrawal has been ${action === 'approve' ? 'approved' : 'rejected'}`
            );
            
            // Reload withdrawals
            await this.renderWithdrawals();
            
        } catch (error) {
            console.error('Error processing withdrawal:', error);
            this.notifications.error('Error', error.message || 'Failed to process withdrawal');
        }
    }
    
    async updateDepositAddress() {
        const newAddress = prompt('Enter new deposit address:', this.appConfig.depositAddress);
        
        if (!newAddress || newAddress.trim() === '') {
            return;
        }
        
        try {
            await this.firebase.updateAppConfig({
                depositAddress: newAddress.trim()
            });
            
            // Update local config
            this.appConfig.depositAddress = newAddress.trim();
            
            // Update UI
            const addressElement = document.getElementById('deposit-address-value');
            if (addressElement) {
                addressElement.textContent = newAddress.trim();
            }
            
            this.notifications.success(
                'Deposit Address Updated',
                'New deposit address has been saved'
            );
            
        } catch (error) {
            console.error('Error updating deposit address:', error);
            this.notifications.error('Error', error.message || 'Failed to update deposit address');
        }
    }
    
    async updateWithdrawalSettings() {
        const minWithdrawalInput = document.getElementById('min-withdrawal');
        const withdrawalFeeInput = document.getElementById('withdrawal-fee');
        const dailyLimitInput = document.getElementById('daily-withdrawal-limit');
        
        if (!minWithdrawalInput || !withdrawalFeeInput || !dailyLimitInput) {
            return;
        }
        
        const minWithdrawal = parseFloat(minWithdrawalInput.value);
        const withdrawalFee = parseFloat(withdrawalFeeInput.value);
        const dailyLimit = parseFloat(dailyLimitInput.value);
        
        // Validation
        if (!minWithdrawal || minWithdrawal < 0.01) {
            this.notifications.error('Error', 'Minimum withdrawal must be at least 0.01 TON');
            return;
        }
        
        if (withdrawalFee < 0 || withdrawalFee > 10) {
            this.notifications.error('Error', 'Withdrawal fee must be between 0 and 10%');
            return;
        }
        
        if (dailyLimit < 0) {
            this.notifications.error('Error', 'Daily limit cannot be negative');
            return;
        }
        
        try {
            const updates = {
                minWithdrawal: minWithdrawal,
                withdrawalFee: withdrawalFee,
                dailyWithdrawalLimit: dailyLimit
            };
            
            await this.firebase.updateAppConfig(updates);
            
            // Update local config
            this.appConfig = { ...this.appConfig, ...updates };
            
            this.notifications.success(
                'Withdrawal Settings Updated',
                'Withdrawal settings have been saved'
            );
            
        } catch (error) {
            console.error('Error updating withdrawal settings:', error);
            this.notifications.error('Error', error.message || 'Failed to update withdrawal settings');
        }
    }
    
    async updateTaskCosts() {
        const baseCostInput = document.getElementById('base-task-cost');
        
        if (!baseCostInput) return;
        
        const baseCost = parseFloat(baseCostInput.value);
        
        if (!baseCost || baseCost < 0.1) {
            this.notifications.error('Error', 'Base cost must be at least 0.1 TON');
            return;
        }
        
        try {
            const taskCosts = {
                500: baseCost,
                1000: baseCost * 2,
                3000: baseCost * 5,
                5000: baseCost * 8
            };
            
            await this.firebase.updateAppConfig({
                taskCosts: taskCosts
            });
            
            // Update local config
            this.appConfig.taskCosts = taskCosts;
            
            this.notifications.success(
                'Task Costs Updated',
                'Task costs have been updated successfully'
            );
            
        } catch (error) {
            console.error('Error updating task costs:', error);
            this.notifications.error('Error', error.message || 'Failed to update task costs');
        }
    }
    
    async updateSecuritySettings() {
        const maxAttemptsInput = document.getElementById('max-login-attempts');
        const sessionTimeoutInput = document.getElementById('session-timeout');
        
        if (!maxAttemptsInput || !sessionTimeoutInput) return;
        
        const maxAttempts = parseInt(maxAttemptsInput.value);
        const sessionTimeout = parseInt(sessionTimeoutInput.value);
        
        // Validation
        if (!maxAttempts || maxAttempts < 1) {
            this.notifications.error('Error', 'Max login attempts must be at least 1');
            return;
        }
        
        if (!sessionTimeout || sessionTimeout < 5) {
            this.notifications.error('Error', 'Session timeout must be at least 5 minutes');
            return;
        }
        
        try {
            const updates = {
                maxLoginAttempts: maxAttempts,
                sessionTimeout: sessionTimeout
            };
            
            await this.firebase.updateAppConfig(updates);
            
            // Update local config
            this.appConfig = { ...this.appConfig, ...updates };
            
            this.notifications.success(
                'Security Settings Updated',
                'Security settings have been saved'
            );
            
        } catch (error) {
            console.error('Error updating security settings:', error);
            this.notifications.error('Error', error.message || 'Failed to update security settings');
        }
    }
    
    async sendBroadcast() {
        const titleInput = document.getElementById('broadcast-title');
        const messageInput = document.getElementById('broadcast-message');
        const typeSelect = document.getElementById('broadcast-type');
        
        if (!titleInput || !messageInput || !typeSelect) return;
        
        const title = titleInput.value.trim();
        const message = messageInput.value.trim();
        const type = typeSelect.value;
        
        if (!title || title.length < 3) {
            this.notifications.error('Error', 'Title must be at least 3 characters');
            return;
        }
        
        if (!message || message.length < 10) {
            this.notifications.error('Error', 'Message must be at least 10 characters');
            return;
        }
        
        try {
            // In a real implementation, you would save the broadcast to Firebase
            // and notify users through your notification system
            
            this.notifications.success(
                'Broadcast Sent',
                'Message has been sent to all users'
            );
            
            // Clear form
            titleInput.value = '';
            messageInput.value = '';
            typeSelect.value = 'info';
            
        } catch (error) {
            console.error('Error sending broadcast:', error);
            this.notifications.error('Error', error.message || 'Failed to send broadcast');
        }
    }
    
    copyToClipboard(text, label = 'Text') {
        try {
            navigator.clipboard.writeText(text).then(() => {
                this.notifications.success('Copied', `${label} copied to clipboard`);
            }).catch(() => {
                // Fallback
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.notifications.success('Copied', `${label} copied to clipboard`);
            });
        } catch (error) {
            this.notifications.error('Error', 'Failed to copy to clipboard');
        }
    }
    
    addBalanceToUserModal(userId) {
        // Set user ID in add balance form
        const userIdInput = document.getElementById('user-id');
        if (userIdInput) {
            userIdInput.value = userId;
            this.searchUser();
        }
        
        // Navigate to add balance page
        this.showPage('addBalance');
    }
    
    viewUserDetails(userId) {
        // Show user details modal or page
        alert(`Viewing user details for: ${userId}\n\nThis would show detailed user information, transaction history, etc.`);
    }
    
    editTask(taskId) {
        // Find task and populate edit form
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            alert(`Editing task: ${task.name}\n\nThis would open an edit form with task details.`);
        }
    }
    
    searchUsers() {
        const searchInput = document.getElementById('search-users');
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (!searchTerm) {
            this.notifications.warning('Search', 'Please enter a search term');
            return;
        }
        
        // Filter users based on search term
        const filteredUsers = this.users.filter(user => 
            (user.firstName && user.firstName.toLowerCase().includes(searchTerm)) ||
            (user.lastName && user.lastName.toLowerCase().includes(searchTerm)) ||
            (user.username && user.username.toLowerCase().includes(searchTerm)) ||
            (user.id && user.id.toString().includes(searchTerm))
        );
        
        // Update table with filtered results
        const tbody = document.querySelector('#users table tbody');
        if (tbody) {
            tbody.innerHTML = filteredUsers.map(user => this.renderUserRow(user)).join('');
        }
        
        this.notifications.info(
            'Search Results',
            `Found ${filteredUsers.length} users matching "${searchTerm}"`
        );
    }
    
    async loadMoreUsers() {
        try {
            // Get last user ID for pagination
            const lastUserId = this.users.length > 0 ? this.users[this.users.length - 1].id : null;
            
            // Load more users
            const moreUsers = await this.firebase.getUsers(20, lastUserId);
            this.users.push(...moreUsers);
            
            // Update table
            const tbody = document.querySelector('#users table tbody');
            if (tbody && moreUsers.length > 0) {
                moreUsers.forEach(user => {
                    tbody.innerHTML += this.renderUserRow(user);
                });
            }
            
            if (moreUsers.length === 0) {
                this.notifications.info('No More Users', 'All users have been loaded');
            } else {
                this.notifications.success('Users Loaded', `Loaded ${moreUsers.length} more users`);
            }
            
        } catch (error) {
            console.error('Error loading more users:', error);
            this.notifications.error('Error', 'Failed to load more users');
        }
    }
}

// Admin Notifications Class
class AdminNotifications {
    constructor() {
        this.container = null;
        this.queue = new Set();
        this.init();
    }
    
    init() {
        // Create notification container
        this.container = document.createElement('div');
        this.container.className = 'admin-notification-container';
        this.container.id = 'admin-notification-container';
        document.body.appendChild(this.container);
        
        // Add styles
        this.addStyles();
    }
    
    addStyles() {
        const styles = `
        .admin-notification-container {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10001;
            width: 320px;
            max-width: calc(100vw - 40px);
            pointer-events: none;
        }
        
        .admin-notification {
            position: relative;
            background: var(--admin-bg-surface);
            border-left: 4px solid var(--admin-info);
            border-radius: var(--admin-radius-md);
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: var(--admin-shadow-heavy);
            opacity: 0;
            transform: translateX(100px) scale(0.9);
            transition: all 0.3s cubic-bezier(0.21, 1.02, 0.73, 1);
            pointer-events: auto;
        }
        
        .admin-notification.show {
            opacity: 1;
            transform: translateX(0) scale(1);
        }
        
        .admin-notification.hiding {
            opacity: 0;
            transform: translateX(100px) scale(0.9);
        }
        
        .admin-notification.success {
            border-left-color: var(--admin-success);
        }
        
        .admin-notification.error {
            border-left-color: var(--admin-danger);
        }
        
        .admin-notification.warning {
            border-left-color: var(--admin-warning);
        }
        
        .admin-notification.info {
            border-left-color: var(--admin-info);
        }
        
        .notification-title {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
            color: var(--admin-text-primary);
        }
        
        .notification-message {
            font-size: 13px;
            line-height: 1.3;
            color: var(--admin-text-secondary);
        }
        
        .notification-close {
            position: absolute;
            top: 8px;
            right: 8px;
            background: none;
            border: none;
            color: var(--admin-text-secondary);
            cursor: pointer;
            width: 24px;
            height: 24px;
            border-radius: var(--admin-radius-round);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            padding: 0;
            font-size: 12px;
        }
        
        .notification-close:hover {
            background: var(--admin-bg-primary);
            color: var(--admin-text-primary);
        }
        
        @media (max-width: 400px) {
            .admin-notification-container {
                top: 70px;
                right: 10px;
                left: 10px;
                width: auto;
            }
        }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
    
    showNotification(title, message, type = 'info', duration = 4000) {
        const notificationId = `${title}_${message}_${type}_${Date.now()}`;
        
        if (this.queue.has(notificationId)) {
            return;
        }
        
        this.queue.add(notificationId);
        
        const notification = document.createElement('div');
        notification.className = `admin-notification admin-notification-${type}`;
        notification.id = `admin-notification-${notificationId}`;
        
        notification.innerHTML = `
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
            <div class="notification-title">${this.escapeHtml(title)}</div>
            <div class="notification-message">${this.escapeHtml(message)}</div>
        `;
        
        this.container.appendChild(notification);
        
        // Add close button event
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification, notificationId);
        });
        
        // Auto remove after duration
        setTimeout(() => {
            this.removeNotification(notification, notificationId);
        }, duration);
        
        // Animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
    }
    
    removeNotification(notification, notificationId) {
        if (!notification) return;
        
        notification.classList.remove('show');
        notification.classList.add('hiding');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.queue.delete(notificationId);
        }, 300);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Convenience methods
    success(title, message, duration = 4000) {
        this.showNotification(title, message, 'success', duration);
    }
    
    error(title, message, duration = 5000) {
        this.showNotification(title, message, 'error', duration);
    }
    
    warning(title, message, duration = 4000) {
        this.showNotification(title, message, 'warning', duration);
    }
    
    info(title, message, duration = 3000) {
        this.showNotification(title, message, 'info', duration);
    }
}

// Form Validators Class
class FormValidators {
    constructor() {
        // Validation patterns
        this.patterns = {
            telegramId: /^\d+$/,
            username: /^@?[a-zA-Z0-9_]{5,32}$/,
            url: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            number: /^\d+(\.\d+)?$/
        };
    }
    
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    isValidTelegramId(id) {
        return this.patterns.telegramId.test(id);
    }
    
    isValidUsername(username) {
        return this.patterns.username.test(username);
    }
    
    isValidEmail(email) {
        return this.patterns.email.test(email);
    }
    
    isValidNumber(number) {
        return this.patterns.number.test(number);
    }
    
    sanitizeInput(input, maxLength = 1000) {
        if (typeof input !== 'string') return input;
        
        // Remove potentially dangerous characters
        return input
            .replace(/[<>"'`]/g, '')
            .trim()
            .substring(0, maxLength);
    }
    
    validateRequired(value, fieldName) {
        if (!value || value.trim() === '') {
            throw new Error(`${fieldName} is required`);
        }
        return true;
    }
    
    validateMinLength(value, minLength, fieldName) {
        if (value.length < minLength) {
            throw new Error(`${fieldName} must be at least ${minLength} characters`);
        }
        return true;
    }
    
    validateMaxLength(value, maxLength, fieldName) {
        if (value.length > maxLength) {
            throw new Error(`${fieldName} must be no more than ${maxLength} characters`);
        }
        return true;
    }
    
    validateMinValue(value, minValue, fieldName) {
        const num = Number(value);
        if (isNaN(num) || num < minValue) {
            throw new Error(`${fieldName} must be at least ${minValue}`);
        }
        return true;
    }
    
    validateMaxValue(value, maxValue, fieldName) {
        const num = Number(value);
        if (isNaN(num) || num > maxValue) {
            throw new Error(`${fieldName} must be no more than ${maxValue}`);
        }
        return true;
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});
