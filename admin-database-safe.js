class AdminApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.users = [];
        this.tasks = [];
        this.transactions = [];
        this.statistics = {};
        this.isInitialized = false;
        this.supabase = null;
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Starting Admin App...');
            
            // تهيئة Supabase
            await this.initializeSupabase();
            
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

    async initializeSupabase() {
        try {
            // تحميل Supabase SDK ديناميكياً
            if (typeof supabase === 'undefined') {
                await this.loadSupabaseSDK();
            }
            
            this.supabase = supabase.createClient(
                'https://ztjokngpzbsuykwpcscz.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0am9rbmdwemJzdXlrd3Bjc2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5OTU0MTcsImV4cCI6MjA0ODU3MTQxN30.8dRLfC-3kzCfIH9c6FCwzva5X4W5j2w1M75Q0q4Jc9A'
            );

            // اختبار الاتصال
            const { data, error } = await this.supabase
                .from('users')
                .select('count')
                .limit(1);

            if (error) throw error;
            
            console.log('✅ Supabase connected successfully');
            
        } catch (error) {
            console.error('❌ Supabase connection failed:', error);
            throw new Error('Failed to connect to database');
        }
    }

    loadSupabaseSDK() {
        return new Promise((resolve, reject) => {
            if (typeof supabase !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async loadAllData() {
        try {
            console.log('📥 Loading all data from Supabase...');
            
            const [users, tasks, transactions, statistics] = await Promise.all([
                this.getAllUsers(),
                this.getAllTasks(),
                this.getAllTransactions(),
                this.getStatistics()
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

    // دوال جلب البيانات من Supabase
    async getAllUsers() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(user => ({
                id: user.id,
                firstName: user.first_name || 'Unknown',
                lastName: user.last_name || '',
                username: user.username || 'N/A',
                balance: user.balance || 0,
                tub: user.tub || 0,
                referrals: user.referrals || 0,
                createdAt: user.created_at,
                email: user.email,
                walletAddress: user.wallet_address
            }));
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    }

    async getAllTasks() {
        try {
            const { data, error } = await this.supabase
                .from('tasks')
                .select(`
                    *,
                    users:user_id (first_name, last_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(task => ({
                id: task.id,
                name: task.name || 'Unnamed Task',
                type: task.type || 'general',
                userId: task.user_id,
                user: task.users ? {
                    firstName: task.users.first_name,
                    lastName: task.users.last_name
                } : null,
                completions: task.completions || 0,
                targetCompletions: task.target_completions || 1,
                reward: task.reward || 0,
                cost: task.cost || 0,
                status: task.status || 'active',
                description: task.description,
                createdAt: task.created_at
            }));
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }
    }

    async getAllTransactions() {
        try {
            const { data, error } = await this.supabase
                .from('transactions')
                .select(`
                    *,
                    users:user_id (first_name, last_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(transaction => ({
                id: transaction.id,
                userId: transaction.user_id,
                user: transaction.users ? {
                    firstName: transaction.users.first_name,
                    lastName: transaction.users.last_name
                } : null,
                type: transaction.type || 'unknown',
                amount: transaction.amount || 0,
                description: transaction.description || 'No description',
                status: transaction.status || 'completed',
                createdAt: transaction.created_at
            }));
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
    }

    async getStatistics() {
        try {
            // إحصائيات المستخدمين
            const { count: totalUsers, error: usersError } = await this.supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            if (usersError) throw usersError;

            // إحصائيات المهام
            const { count: totalTasks, error: tasksError } = await this.supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true });

            if (tasksError) throw tasksError;

            // إحصائيات المعاملات
            const { data: transactionsData, error: transactionsError } = await this.supabase
                .from('transactions')
                .select('amount, type');

            if (transactionsError) throw transactionsError;

            const totalEarned = transactionsData
                .filter(t => t.amount > 0)
                .reduce((sum, t) => sum + t.amount, 0);

            const tasksCompleted = transactionsData
                .filter(t => t.type === 'task_reward')
                .length;

            return {
                totalUsers: totalUsers || 0,
                tasksCreated: totalTasks || 0,
                tasksCompleted: tasksCompleted || 0,
                totalEarned: totalEarned || 0
            };

        } catch (error) {
            console.error('Error fetching statistics:', error);
            return {
                totalUsers: 0,
                tasksCreated: 0,
                tasksCompleted: 0,
                totalEarned: 0
            };
        }
    }

    // دوال الإضافة والحذف والتحديث
    async addUser(userData) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .insert([{
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    username: userData.username,
                    email: userData.email,
                    balance: userData.balance || 0,
                    tub: userData.tub || 0,
                    referrals: userData.referrals || 0,
                    wallet_address: userData.walletAddress
                }])
                .select();

            if (error) throw error;
            
            await this.loadAllData();
            this.showNotification('User added successfully!', 'success');
            return data[0];
            
        } catch (error) {
            console.error('Error adding user:', error);
            this.showNotification('Failed to add user', 'error');
            throw error;
        }
    }

    async updateUser(userId, userData) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .update({
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    username: userData.username,
                    email: userData.email,
                    balance: userData.balance,
                    tub: userData.tub,
                    referrals: userData.referrals,
                    wallet_address: userData.walletAddress
                })
                .eq('id', userId)
                .select();

            if (error) throw error;
            
            await this.loadAllData();
            this.showNotification('User updated successfully!', 'success');
            return data[0];
            
        } catch (error) {
            console.error('Error updating user:', error);
            this.showNotification('Failed to update user', 'error');
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            const { error } = await this.supabase
                .from('users')
                .delete()
                .eq('id', userId);

            if (error) throw error;
            
            await this.loadAllData();
            this.showNotification('User deleted successfully!', 'success');
            
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showNotification('Failed to delete user', 'error');
            throw error;
        }
    }

    // دوال المهام
    async addTask(taskData) {
        try {
            const { data, error } = await this.supabase
                .from('tasks')
                .insert([{
                    name: taskData.name,
                    type: taskData.type,
                    user_id: taskData.userId,
                    target_completions: taskData.targetCompletions,
                    reward: taskData.reward,
                    cost: taskData.cost,
                    status: taskData.status || 'active',
                    description: taskData.description
                }])
                .select();

            if (error) throw error;
            
            await this.loadAllData();
            this.showNotification('Task added successfully!', 'success');
            return data[0];
            
        } catch (error) {
            console.error('Error adding task:', error);
            this.showNotification('Failed to add task', 'error');
            throw error;
        }
    }

    // باقي الدوال تبقى كما هي مع تعديلات بسيطة
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

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshAllData();
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
            const progress = ((task.completions || 0) / task.targetCompletions) * 100;
            return `
                <tr>
                    <td><strong>${task.name}</strong></td>
                    <td>${task.type}</td>
                    <td>${task.user?.firstName || 'Public'} ${task.user?.lastName || ''}</td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                            <span class="progress-text">${Math.round(progress)}%</span>
                        </div>
                    </td>
                    <td>${task.reward} GOLD</td>
                    <td>${task.cost} TON</td>
                    <td><span class="badge badge-${task.status === 'active' ? 'success' : 'warning'}">${task.status}</span></td>
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
                <td>${transaction.user?.firstName || 'System'} ${transaction.user?.lastName || ''}</td>
                <td><span class="badge badge-primary">${transaction.type}</span></td>
                <td style="color: ${transaction.amount < 0 ? 'var(--danger)' : 'var(--success)'};">
                    ${transaction.amount > 0 ? '+' : ''}${transaction.amount}
                </td>
                <td>${transaction.description}</td>
                <td><span class="badge badge-${transaction.status === 'completed' ? 'success' : 'warning'}">${transaction.status}</span></td>
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
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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

    async refreshAllData() {
        this.showNotification('Refreshing data...', 'info');
        await this.loadAllData();
        this.updateStatsGrid();
        this.showNotification('Data refreshed successfully!', 'success');
    }

    // دوال التعديل (ستحتاج لتنفيذ واجهات التعديل)
    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            // تنفيذ واجهة تعديل المستخدم
            this.showNotification(`Editing user: ${user.firstName} ${user.lastName}`, 'info');
            // يمكنك فتح modal أو form هنا
        }
    }

    async deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            try {
                const { error } = await this.supabase
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
    console.log('📄 DOM loaded, starting Admin App...');
    admin = new AdminApp();
});

window.admin = admin;
