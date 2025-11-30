class AdminApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.users = [];
        this.tasks = [];
        this.transactions = [];
        this.statistics = {};
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Starting Admin App...');
            
            // الانتظار حتى يكون adminDB جاهز
            await this.waitForAdminDB();
            
            this.setupEventListeners();
            await this.loadAllData();
            this.updateStatsGrid();
            this.isInitialized = true;
            
            console.log('✅ Admin App initialized successfully');
            this.showNotification('Admin panel loaded successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Admin App initialization failed:', error);
            this.showNotification('Failed to initialize admin panel', 'error');
        }
    }

    async waitForAdminDB() {
        const maxWaitTime = 15000; // 15 ثانية
        const startTime = Date.now();
        
        console.log('⏳ Waiting for Admin Database...');
        
        while (!window.adminDB?.isInitialized && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (!window.adminDB?.isInitialized) {
            throw new Error('Admin Database not available');
        }
        
        console.log('✅ Admin Database is ready');
    }

    async loadAllData() {
        try {
            console.log('📥 Loading all data...');
            
            const [users, tasks, transactions, statistics] = await Promise.all([
                window.adminDB.getAllUsers(),
                window.adminDB.getAllTasks(),
                window.adminDB.getAllTransactions(),
                window.adminDB.getStatistics()
            ]);

            this.users = users;
            this.tasks = tasks;
            this.transactions = transactions;
            this.statistics = statistics;

            this.renderUsersTable();
            this.renderTasksTable();
            this.renderTransactionsTable();
            this.updateStatisticsSection();
            
            console.log('✅ All data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading data:', error);
            throw error;
        }
    }

    // باقي الدوال تبقى كما هي...
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.showSection(section);
            });
        });

        // Search
        const userSearch = document.getElementById('user-search');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                this.filterUsers('search', e.target.value);
            });
        }
    }

    showSection(sectionName) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName).classList.add('active');

        const titles = {
            dashboard: 'Dashboard',
            users: 'Users Management',
            tasks: 'Tasks Management',
            transactions: 'Transactions',
            statistics: 'Statistics',
            settings: 'Settings'
        };
        document.getElementById('page-title').textContent = titles[sectionName];

        this.currentSection = sectionName;
    }

    renderUsersTable() {
        const tbody = document.getElementById('users-table');
        if (!tbody) return;

        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-users"></i>
                        <div>No users found</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.users.map(user => `
            <tr>
                <td><strong>${user.id}</strong></td>
                <td>${user.firstName} ${user.lastName}</td>
                <td>@${user.username}</td>
                <td><span style="color: var(--success);">${user.balance.toFixed(3)} TON</span></td>
                <td><span style="color: gold;">${user.tub.toLocaleString()} GOLD</span></td>
                <td>${user.referrals}</td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderTasksTable() {
        const tbody = document.getElementById('tasks-table');
        if (!tbody) return;

        if (this.tasks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-tasks"></i>
                        <div>No tasks found</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.tasks.map(task => {
            const progress = ((task.completions || 0) / task.targetCompletions) * 100;
            return `
                <tr>
                    <td><strong>${task.name}</strong></td>
                    <td>${task.type}</td>
                    <td>${task.user?.firstName || 'Public'} ${task.user?.lastName || ''}</td>
                    <td>${Math.round(progress)}%</td>
                    <td>${task.reward} GOLD</td>
                    <td>${task.cost} TON</td>
                    <td><span class="badge badge-success">${task.status}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderTransactionsTable() {
        const tbody = document.getElementById('transactions-table');
        if (!tbody) return;

        if (this.transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-exchange-alt"></i>
                        <div>No transactions found</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.transactions.map(transaction => `
            <tr>
                <td>${transaction.user?.firstName} ${transaction.user?.lastName}</td>
                <td><span class="badge badge-primary">${transaction.type}</span></td>
                <td style="color: ${transaction.amount < 0 ? 'var(--danger)' : 'var(--success)'};">
                    ${transaction.amount > 0 ? '+' : ''}${transaction.amount}
                </td>
                <td>${transaction.description}</td>
                <td><span class="badge badge-success">${transaction.status}</span></td>
                <td>${new Date(transaction.createdAt).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }

    updateStatsGrid() {
        const grid = document.getElementById('stats-grid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-value">${this.users.length}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-tasks"></i>
                </div>
                <div class="stat-value">${this.tasks.length}</div>
                <div class="stat-label">Active Tasks</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-exchange-alt"></i>
                </div>
                <div class="stat-value">${this.transactions.length}</div>
                <div class="stat-label">Transactions</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-coins"></i>
                </div>
                <div class="stat-value">${this.statistics.totalEarned?.toFixed(0) || 0}</div>
                <div class="stat-label">Total Earned</div>
            </div>
        `;
    }

    updateStatisticsSection() {
        document.getElementById('stat-total-users').textContent = this.statistics.totalUsers || 0;
        document.getElementById('stat-total-tasks').textContent = this.statistics.tasksCreated || 0;
        document.getElementById('stat-completed-tasks').textContent = this.statistics.tasksCompleted || 0;
        document.getElementById('stat-total-earned').textContent = this.statistics.totalEarned?.toFixed(2) || '0';
    }

    showNotification(message, type = 'info') {
        // كود الإشعارات كما هو
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--accent)'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 400px;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    // دوال أخرى...
    async refreshAllData() {
        this.showNotification('Refreshing data...', 'info');
        await this.loadAllData();
        this.updateStatsGrid();
        this.showNotification('Data refreshed successfully!', 'success');
    }
}

// التهيئة عندما يكون الـ DOM جاهز
let admin;
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, starting Admin App...');
    admin = new AdminApp();
});

// جعل admin متاح globally للاستدعاء من الأزرار
window.admin = admin;
