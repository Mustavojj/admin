// admin.js - Fixed Version
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
            console.log('🚀 Starting Admin Panel...');
            
            // Wait for adminDB to be ready
            await this.waitForAdminDB();
            
            this.setupEventListeners();
            await this.loadAllData();
            this.updateStatsGrid();
            this.isInitialized = true;
            
            console.log('✅ Admin Panel ready');
            this.showNotification('Admin panel loaded successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to initialize admin panel:', error);
            this.showNotification('Failed to load admin panel: ' + error.message, 'error');
        }
    }

    async waitForAdminDB() {
        const maxWaitTime = 10000; // 10 seconds
        const startTime = Date.now();
        
        while (!window.adminDB?.isInitialized && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (!window.adminDB?.isInitialized) {
            throw new Error('Admin database not available');
        }
    }

    async loadAllData() {
        try {
            console.log('📥 Loading data...');
            
            const [users, tasks, transactions, statistics] = await Promise.all([
                window.adminDB.getAllUsers(),
                window.adminDB.getAllTasks(),
                window.adminDB.getAllTransactions(),
                window.adminDB.getStatistics()
            ]);

            this.users = this.formatUsers(users);
            this.tasks = this.formatTasks(tasks);
            this.transactions = this.formatTransactions(transactions);
            this.statistics = statistics;

            this.renderUsersTable();
            this.renderTasksTable();
            this.renderTransactionsTable();
            this.updateStatisticsSection();
            
            console.log('✅ Data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading data:', error);
            throw error;
        }
    }

    formatUsers(users) {
        return users.map(user => ({
            id: user.id,
            firstName: user.first_name || 'Unknown',
            lastName: user.last_name || '',
            username: user.username || 'N/A',
            email: user.email,
            balance: user.balance || 0,
            tub: user.tub || 0,
            referrals: user.referrals || 0,
            walletAddress: user.wallet_address,
            createdAt: user.created_at
        }));
    }

    formatTasks(tasks) {
        return tasks.map(task => ({
            id: task.id,
            name: task.name || 'Unnamed Task',
            type: task.type || 'General',
            description: task.description,
            reward: task.reward || 0,
            cost: task.cost || 0,
            status: task.status || 'Active',
            completions: task.completions || 0,
            targetCompletions: task.target_completions || 1,
            createdAt: task.created_at
        }));
    }

    formatTransactions(transactions) {
        return transactions.map(transaction => ({
            id: transaction.id,
            userId: transaction.user_id,
            type: transaction.type,
            amount: parseFloat(transaction.amount),
            description: transaction.description || 'No description',
            status: transaction.status || 'Completed',
            createdAt: transaction.created_at
        }));
    }

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
                this.filterUsers(e.target.value);
            });
        }

        // Refresh data
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshAllData();
            });
        }
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNav = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }

        // Update title
        const titles = {
            dashboard: 'Dashboard',
            users: 'Users Management',
            tasks: 'Tasks Management',
            transactions: 'Transactions',
            statistics: 'Statistics',
            settings: 'Settings'
        };
        
        const titleElement = document.getElementById('page-title');
        if (titleElement) {
            titleElement.textContent = titles[sectionName] || 'Dashboard';
        }

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
                <td>${user.email || 'N/A'}</td>
                <td><span style="color: var(--success);">${user.balance.toFixed(3)} TON</span></td>
                <td><span style="color: gold;">${user.tub.toLocaleString()} GOLD</span></td>
                <td>${user.referrals}</td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="admin.editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="admin.deleteUser('${user.id}')">
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
            const progress = task.targetCompletions > 0 ? 
                ((task.completions || 0) / task.targetCompletions) * 100 : 0;
                
            return `
                <tr>
                    <td><strong>${task.name}</strong></td>
                    <td>${task.type}</td>
                    <td>${Math.round(progress)}%</td>
                    <td>${task.reward} GOLD</td>
                    <td>${task.cost} TON</td>
                    <td><span class="badge badge-success">${task.status}</span></td>
                    <td>${new Date(task.createdAt).toLocaleDateString()}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary" onclick="admin.editTask('${task.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="admin.deleteTask('${task.id}')">
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
                <td>${transaction.userId}</td>
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

    filterUsers(searchTerm) {
        const filteredUsers = this.users.filter(user => 
            user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderFilteredUsers(filteredUsers);
    }

    renderFilteredUsers(users) {
        const tbody = document.getElementById('users-table');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-users"></i>
                        <div>No results found</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td><strong>${user.id}</strong></td>
                <td>${user.firstName} ${user.lastName}</td>
                <td>@${user.username}</td>
                <td>${user.email || 'N/A'}</td>
                <td><span style="color: var(--success);">${user.balance.toFixed(3)} TON</span></td>
                <td><span style="color: gold;">${user.tub.toLocaleString()} GOLD</span></td>
                <td>${user.referrals}</td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="admin.editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="admin.deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
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
        const elements = {
            'stat-total-users': this.statistics.totalUsers || 0,
            'stat-total-tasks': this.statistics.tasksCreated || 0,
            'stat-completed-tasks': this.statistics.tasksCompleted || 0,
            'stat-total-earned': this.statistics.totalEarned?.toFixed(2) || '0'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async refreshAllData() {
        this.showNotification('Refreshing data...', 'info');
        await this.loadAllData();
        this.updateStatsGrid();
        this.showNotification('Data refreshed successfully!', 'success');
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            this.showNotification(`Editing user: ${user.firstName} ${user.lastName}`, 'info');
        }
    }

    async deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                const { error } = await window.adminDB.supabase
                    .from('users')
                    .delete()
                    .eq('id', userId);

                if (error) throw error;
                
                await this.loadAllData();
                this.showNotification('User deleted successfully!', 'success');
                
            } catch (error) {
                console.error('Error deleting user:', error);
                this.showNotification('Failed to delete user', 'error');
            }
        }
    }

    async deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            try {
                const { error } = await window.adminDB.supabase
                    .from('tasks')
                    .delete()
                    .eq('id', taskId);

                if (error) throw error;
                
                await this.loadAllData();
                this.showNotification('Task deleted successfully!', 'success');
                
            } catch (error) {
                console.error('Error deleting task:', error);
                this.showNotification('Failed to delete task', 'error');
            }
        }
    }
}


let admin;
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, starting Admin Panel...');
    admin = new AdminApp();
});

window.admin = admin;
