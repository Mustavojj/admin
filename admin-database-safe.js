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

    // دوال جلب البيانات من Supabase - معدلة للهياكل الحالية
    async getAllUsers() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(user => ({
                id: user.id,
                firstName: user.first_name || user.name || 'Unknown',
                lastName: user.last_name || '',
                username: user.username || user.email?.split('@')[0] || 'N/A',
                email: user.email,
                balance: user.balance || user.ton_balance || 0,
                tub: user.tub || user.gold_balance || user.points || 0,
                referrals: user.referrals || user.referral_count || 0,
                walletAddress: user.wallet_address,
                createdAt: user.created_at,
                // إضافة حقول إضافية قد تكون موجودة
                ...user
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
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(task => ({
                id: task.id,
                name: task.name || task.title || 'Unnamed Task',
                type: task.type || task.category || 'general',
                description: task.description,
                reward: task.reward || task.points_reward || 0,
                cost: task.cost || task.ton_cost || 0,
                status: task.status || 'active',
                completions: task.completions || task.completed_count || 0,
                targetCompletions: task.target_completions || task.required_completions || 1,
                createdAt: task.created_at,
                // إضافة حقول إضافية قد تكون موجودة
                ...task
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
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(transaction => ({
                id: transaction.id,
                userId: transaction.user_id,
                type: transaction.type,
                amount: parseFloat(transaction.amount),
                description: transaction.description || 'No description',
                status: transaction.status || 'completed',
                createdAt: transaction.created_at,
                // إضافة حقول إضافية قد تكون موجودة
                ...transaction
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
                .select('amount, type, status')
                .eq('status', 'completed');

            if (transactionsError) throw transactionsError;

            const totalEarned = transactionsData
                .filter(t => t.amount > 0)
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);

            const tasksCompleted = transactionsData
                .filter(t => t.type === 'task_reward' || t.type === 'task_completion' || t.type?.includes('task'))
                .length;

            // إحصائيات السحوبات إذا كان الجدول موجوداً
            let totalWithdrawals = 0;
            try {
                const { data: withdrawalsData } = await this.supabase
                    .from('withdrawals')
                    .select('amount, status');
                
                totalWithdrawals = withdrawalsData
                    ?.filter(w => w.status === 'completed')
                    ?.reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0;
            } catch (e) {
                console.log('Withdrawals table not available or error:', e);
            }

            return {
                totalUsers: totalUsers || 0,
                tasksCreated: totalTasks || 0,
                tasksCompleted: tasksCompleted || 0,
                totalEarned: totalEarned || 0,
                totalWithdrawals: totalWithdrawals || 0
            };

        } catch (error) {
            console.error('Error fetching statistics:', error);
            return {
                totalUsers: 0,
                tasksCreated: 0,
                tasksCompleted: 0,
                totalEarned: 0,
                totalWithdrawals: 0
            };
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
                this.filterUsers(e.target.value);
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
                        <div>No users found</div>
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

    // ... باقي الدوال (showSection, renderUsersTable, renderTasksTable, etc.) تبقى كما هي ...

    updateStatsGrid() {
        const grid = document.getElementById('stats-grid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-value">${this.statistics.totalUsers || 0}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-tasks"></i>
                </div>
                <div class="stat-value">${this.statistics.tasksCreated || 0}</div>
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

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            this.showNotification(`Editing user: ${user.firstName} ${user.lastName}`, 'info');
            // يمكنك فتح modal أو form هنا
        }
    }

    async deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
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
