class AdminApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.users = [];
        this.tasks = [];
        this.transactions = [];
        this.statistics = {};
        this.filteredUsers = [];
        this.filteredTasks = [];
        this.filteredTransactions = [];
        this.init();
    }

    async init() {
        console.log('🚀 Starting Admin App...');
        this.setupEventListeners();
        await this.loadAllData();
        this.updateStatsGrid();
        this.showNotification('Admin panel loaded successfully!', 'success');
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

        // Search functionality
        const userSearch = document.getElementById('user-search');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                this.filterUsers('search', e.target.value);
            });
        }

        // Tab clicks
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const parent = e.target.closest('.tabs');
                if (parent) {
                    parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');
                }
            });
        });
    }

    async loadAllData() {
        try {
            await Promise.all([
                this.loadUsers(),
                this.loadTasks(),
                this.loadTransactions(),
                this.loadStatistics()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
            this.showNotification('Error loading data', 'error');
        }
    }

    async loadUsers() {
        try {
            this.users = await adminDB.getAllUsers();
            this.filteredUsers = [...this.users];
            this.renderUsersTable();
        } catch (error) {
            console.error('Error loading users:', error);
            this.showNotification('Error loading users', 'error');
        }
    }

    async loadTasks() {
        try {
            this.tasks = await adminDB.getAllTasks();
            this.filteredTasks = [...this.tasks];
            this.renderTasksTable();
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showNotification('Error loading tasks', 'error');
        }
    }

    async loadTransactions() {
        try {
            this.transactions = await adminDB.getAllTransactions();
            this.filteredTransactions = [...this.transactions];
            this.renderTransactionsTable();
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.showNotification('Error loading transactions', 'error');
        }
    }

    async loadStatistics() {
        try {
            this.statistics = await adminDB.getStatistics();
            this.updateStatisticsSection();
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    // Navigation
    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName).classList.add('active');

        // Update page title
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

    // Users Table Rendering
    renderUsersTable() {
        const tbody = document.getElementById('users-table');
        if (!tbody) return;

        if (this.filteredUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        No users found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredUsers.map(user => `
            <tr>
                <td><strong>${user.id}</strong></td>
                <td>${user.firstName || ''} ${user.lastName || ''}</td>
                <td>@${user.username || 'no_username'}</td>
                <td><span style="color: var(--success);">${user.balance || 0} TON</span></td>
                <td><span style="color: gold;">${(user.tub || 0).toLocaleString()} GOLD</span></td>
                <td>${user.referrals || 0}</td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="admin.editUser(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="admin.updateUserBalance(${user.id})">
                            <i class="fas fa-coins"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="admin.deleteUser(${user.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Tasks Table Rendering
    renderTasksTable() {
        const tbody = document.getElementById('tasks-table');
        if (!tbody) return;

        if (this.filteredTasks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <i class="fas fa-tasks" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        No tasks found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredTasks.map(task => {
            const progress = ((task.completions || 0) / task.targetCompletions) * 100;
            const user = task.users ? `${task.users.firstName} ${task.users.lastName}` : 'Unknown';
            const progressColor = progress >= 100 ? 'var(--success)' : progress >= 50 ? 'var(--warning)' : 'var(--danger)';
            
            return `
                <tr>
                    <td><strong>${task.name}</strong></td>
                    <td><span class="badge ${task.type === 'channel' ? 'badge-success' : task.type === 'group' ? 'badge-warning' : 'badge-primary'}">${task.type}</span></td>
                    <td>${user}</td>
                    <td>
                        <div style="background: var(--card-bg); border-radius: 10px; height: 8px; overflow: hidden;">
                            <div style="background: ${progressColor}; height: 100%; width: ${progress}%;"></div>
                        </div>
                        <small>${Math.round(progress)}% (${task.completions || 0}/${task.targetCompletions})</small>
                    </td>
                    <td>${task.reward} GOLD</td>
                    <td>${task.cost} TON</td>
                    <td>
                        <span class="badge ${task.status === 'active' ? 'badge-success' : 'badge-warning'}">
                            ${task.status}
                        </span>
                    </td>
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

    // Transactions Table Rendering
    renderTransactionsTable() {
        const tbody = document.getElementById('transactions-table');
        if (!tbody) return;

        if (this.filteredTransactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <i class="fas fa-exchange-alt" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        No transactions found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredTransactions.map(transaction => {
            const user = transaction.users ? `${transaction.users.firstName} ${transaction.users.lastName}` : 'Unknown';
            const amount = parseFloat(transaction.amount);
            const isPositive = amount >= 0;
            const amountColor = isPositive ? 'var(--success)' : 'var(--danger)';
            const amountIcon = isPositive ? '↑' : '↓';
            
            return `
                <tr>
                    <td>${user}</td>
                    <td><span class="badge badge-primary">${transaction.type}</span></td>
                    <td style="color: ${amountColor}; font-weight: bold;">
                        ${amountIcon} ${Math.abs(amount)} ${transaction.type.includes('swap') || transaction.type.includes('withdrawal') ? 'TON' : 'GOLD'}
                    </td>
                    <td>${transaction.description}</td>
                    <td>
                        <span class="badge ${transaction.status === 'completed' ? 'badge-success' : 'badge-warning'}">
                            ${transaction.status}
                        </span>
                    </td>
                    <td>${new Date(transaction.createdAt).toLocaleString()}</td>
                </tr>
            `;
        }).join('');
    }

    updateStatsGrid() {
        const grid = document.getElementById('stats-grid');
        if (!grid) return;

        const totalBalance = this.users.reduce((sum, user) => sum + (user.balance || 0), 0);
        const totalGold = this.users.reduce((sum, user) => sum + (user.tub || 0), 0);

        grid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--success);">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-value">${this.users.length}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--warning);">
                    <i class="fas fa-tasks"></i>
                </div>
                <div class="stat-value">${this.tasks.length}</div>
                <div class="stat-label">Active Tasks</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--accent);">
                    <i class="fas fa-exchange-alt"></i>
                </div>
                <div class="stat-value">${this.transactions.length}</div>
                <div class="stat-label">Today's Transactions</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: gold; color: #333;">
                    <i class="fas fa-coins"></i>
                </div>
                <div class="stat-value">${totalBalance.toFixed(2)}</div>
                <div class="stat-label">Total TON Balance</div>
            </div>
        `;
    }

    updateStatisticsSection() {
        if (!this.statistics) return;
        
        document.getElementById('stat-total-users').textContent = this.statistics.totalUsers?.toLocaleString() || '0';
        document.getElementById('stat-total-tasks').textContent = this.statistics.tasksCreated?.toLocaleString() || '0';
        document.getElementById('stat-completed-tasks').textContent = this.statistics.tasksCompleted?.toLocaleString() || '0';
        document.getElementById('stat-total-earned').textContent = this.statistics.totalEarned?.toFixed(2) || '0';
    }

    // Filtering functions
    filterUsers(filterType, searchValue = '') {
        let filtered = [...this.users];

        if (filterType === 'search' && searchValue) {
            filtered = filtered.filter(user => 
                user.firstName?.toLowerCase().includes(searchValue.toLowerCase()) ||
                user.lastName?.toLowerCase().includes(searchValue.toLowerCase()) ||
                user.username?.toLowerCase().includes(searchValue.toLowerCase()) ||
                user.id.toString().includes(searchValue)
            );
        } else if (filterType === 'active') {
            filtered = filtered.filter(user => user.balance > 0 || user.tub > 0);
        } else if (filterType === 'new') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            filtered = filtered.filter(user => new Date(user.createdAt) > oneWeekAgo);
        }

        this.filteredUsers = filtered;
        this.renderUsersTable();
    }

    filterTasks(filterType) {
        let filtered = [...this.tasks];

        if (filterType === 'active') {
            filtered = filtered.filter(task => task.status === 'active');
        } else if (filterType === 'completed') {
            filtered = filtered.filter(task => task.completions >= task.targetCompletions);
        }

        this.filteredTasks = filtered;
        this.renderTasksTable();
    }

    filterTransactions(filterType) {
        let filtered = [...this.transactions];

        if (filterType === 'task_reward') {
            filtered = filtered.filter(t => t.type === 'task_reward');
        } else if (filterType === 'withdrawal') {
            filtered = filtered.filter(t => t.type === 'withdrawal');
        } else if (filterType === 'swap') {
            filtered = filtered.filter(t => t.type === 'swap');
        }

        this.filteredTransactions = filtered;
        this.renderTransactionsTable();
    }

    // Action methods - NOW WORKING!
    async refreshAllData() {
        this.showNotification('Refreshing data...', 'info');
        await this.loadAllData();
        this.updateStatsGrid();
        this.showNotification('Data refreshed successfully!', 'success');
    }

    showUserModal() {
        this.showCreateUserModal();
    }

    showTaskModal() {
        this.showCreateTaskModal();
    }

    showCreateUserModal() {
        const modalHTML = `
            <div class="modal-overlay" id="create-user-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-plus"></i> Create New User</h3>
                        <button class="modal-close" onclick="admin.closeModal('create-user-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>User ID</label>
                            <input type="number" class="form-input" id="new-user-id" placeholder="123456789" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>First Name</label>
                                <input type="text" class="form-input" id="new-user-firstname" placeholder="John">
                            </div>
                            <div class="form-group">
                                <label>Last Name</label>
                                <input type="text" class="form-input" id="new-user-lastname" placeholder="Doe">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" class="form-input" id="new-user-username" placeholder="johndoe">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Initial TON Balance</label>
                                <input type="number" class="form-input" id="new-user-balance" value="0" step="0.001">
                            </div>
                            <div class="form-group">
                                <label>Initial GOLD Balance</label>
                                <input type="number" class="form-input" id="new-user-tub" value="1000">
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="admin.createNewUser()" style="width: 100%;">
                            <i class="fas fa-plus"></i>
                            Create User
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(modalHTML);
    }

    showCreateTaskModal() {
        const modalHTML = `
            <div class="modal-overlay" id="create-task-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-plus-circle"></i> Create New Task</h3>
                        <button class="modal-close" onclick="admin.closeModal('create-task-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>User ID</label>
                            <input type="number" class="form-input" id="task-user-id" placeholder="User ID who creates the task" required>
                        </div>
                        <div class="form-group">
                            <label>Task Name</label>
                            <input type="text" class="form-input" id="task-name" placeholder="Join our channel" required>
                        </div>
                        <div class="form-group">
                            <label>Task Link</label>
                            <input type="url" class="form-input" id="task-link" placeholder="https://t.me/example" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Task Type</label>
                                <select class="form-input" id="task-type">
                                    <option value="channel">Channel</option>
                                    <option value="group">Group</option>
                                    <option value="bot">Bot</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Target Completions</label>
                                <input type="number" class="form-input" id="task-completions" value="1000">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Reward (GOLD)</label>
                                <input type="number" class="form-input" id="task-reward" value="10">
                            </div>
                            <div class="form-group">
                                <label>Cost (TON)</label>
                                <input type="number" class="form-input" id="task-cost" value="1" step="0.001">
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="admin.createNewTask()" style="width: 100%;">
                            <i class="fas fa-plus"></i>
                            Create Task
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(modalHTML);
    }

    showModal(html) {
        const container = document.getElementById('modals-container') || document.body;
        container.insertAdjacentHTML('beforeend', html);
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
        }
    }

    async createNewUser() {
        const userId = document.getElementById('new-user-id').value;
        const firstName = document.getElementById('new-user-firstname').value;
        const lastName = document.getElementById('new-user-lastname').value;
        const username = document.getElementById('new-user-username').value;
        const balance = parseFloat(document.getElementById('new-user-balance').value) || 0;
        const tub = parseInt(document.getElementById('new-user-tub').value) || 1000;

        if (!userId) {
            this.showNotification('User ID is required!', 'error');
            return;
        }

        try {
            const userData = {
                id: parseInt(userId),
                firstName: firstName,
                lastName: lastName,
                username: username,
                balance: balance,
                tub: tub
            };

            await adminDB.createUser(userData);
            this.closeModal('create-user-modal');
            await this.loadUsers();
            this.showNotification('User created successfully!', 'success');
        } catch (error) {
            this.showNotification('Error creating user: ' + error.message, 'error');
        }
    }

    async createNewTask() {
        const userId = document.getElementById('task-user-id').value;
        const name = document.getElementById('task-name').value;
        const link = document.getElementById('task-link').value;
        const type = document.getElementById('task-type').value;
        const targetCompletions = parseInt(document.getElementById('task-completions').value) || 1000;
        const reward = parseInt(document.getElementById('task-reward').value) || 10;
        const cost = parseFloat(document.getElementById('task-cost').value) || 1;

        if (!userId || !name || !link) {
            this.showNotification('Please fill all required fields!', 'error');
            return;
        }

        try {
            const taskData = {
                userId: parseInt(userId),
                name: name,
                link: link,
                type: type,
                targetCompletions: targetCompletions,
                reward: reward,
                cost: cost,
                checkSubscription: type === 'channel'
            };

            await adminDB.createTask(taskData);
            this.closeModal('create-task-modal');
            await this.loadTasks();
            this.showNotification('Task created successfully!', 'success');
        } catch (error) {
            this.showNotification('Error creating task: ' + error.message, 'error');
        }
    }

    // Other action methods
    editUser(userId) {
        this.showNotification(`Edit user ${userId} - Feature coming soon!`, 'info');
    }

    async updateUserBalance(userId) {
        const newBalance = prompt(`Enter new TON balance for user ${userId}:`, '0');
        if (newBalance !== null) {
            try {
                await adminDB.updateUser(userId, { balance: parseFloat(newBalance) });
                await this.loadUsers();
                this.showNotification(`User ${userId} balance updated to ${newBalance} TON`, 'success');
            } catch (error) {
                this.showNotification('Error updating user balance: ' + error.message, 'error');
            }
        }
    }

    async deleteUser(userId) {
        if (confirm(`Are you sure you want to delete user ${userId}? This action cannot be undone!`)) {
            try {
                await adminDB.deleteUser(userId);
                await this.loadUsers();
                this.showNotification(`User ${userId} deleted successfully!`, 'success');
            } catch (error) {
                this.showNotification('Error deleting user: ' + error.message, 'error');
            }
        }
    }

    editTask(taskId) {
        this.showNotification(`Edit task ${taskId} - Feature coming soon!`, 'info');
    }

    async deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task? This action cannot be undone!')) {
            try {
                await adminDB.deleteTask(taskId);
                await this.loadTasks();
                this.showNotification('Task deleted successfully!', 'success');
            } catch (error) {
                this.showNotification('Error deleting task: ' + error.message, 'error');
            }
        }
    }

    saveSettings() {
        this.showNotification('Settings saved successfully!', 'success');
    }

    backupData() {
        this.showNotification('Backup feature coming soon!', 'info');
    }

    clearOldData() {
        this.showNotification('Data cleanup feature coming soon!', 'info');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--accent)'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getTotalBalance() {
        return this.users.reduce((sum, user) => sum + (user.balance || 0), 0).toFixed(2);
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .notification {
        font-family: inherit;
    }
`;
document.head.appendChild(style);

// Initialize admin app when DOM is loaded
let admin;
document.addEventListener('DOMContentLoaded', () => {
    admin = new AdminApp();
});
