// admin.js - الإصدار المصحح
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
            console.log('🚀 بدء تشغيل لوحة الإدارة...');
            
            // الانتظار حتى يكون adminDB جاهز
            await this.waitForAdminDB();
            
            this.setupEventListeners();
            await this.loadAllData();
            this.updateStatsGrid();
            this.isInitialized = true;
            
            console.log('✅ لوحة الإدارة جاهزة');
            this.showNotification('تم تحميل لوحة التحكم بنجاح!', 'success');
            
        } catch (error) {
            console.error('❌ فشل في تهيئة لوحة الإدارة:', error);
            this.showNotification('فشل في تحميل لوحة التحكم: ' + error.message, 'error');
        }
    }

    async waitForAdminDB() {
        const maxWaitTime = 10000;
        const startTime = Date.now();
        
        while (!window.adminDB?.isInitialized && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (!window.adminDB?.isInitialized) {
            throw new Error('قاعدة بيانات الإدارة غير متاحة');
        }
    }

    async loadAllData() {
        try {
            console.log('📥 جلب البيانات...');
            
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
            
            console.log('✅ تم تحميل البيانات بنجاح');
            
        } catch (error) {
            console.error('❌ خطأ في جلب البيانات:', error);
            throw error;
        }
    }

    formatUsers(users) {
        return users.map(user => ({
            id: user.id,
            firstName: user.first_name || 'غير معروف',
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
            name: task.name || 'مهمة بدون اسم',
            type: task.type || 'عام',
            description: task.description,
            reward: task.reward || 0,
            cost: task.cost || 0,
            status: task.status || 'نشط',
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
            description: transaction.description || 'لا يوجد وصف',
            status: transaction.status || 'مكتمل',
            createdAt: transaction.created_at
        }));
    }

    setupEventListeners() {
        // التنقل
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.showSection(section);
            });
        });

        // البحث
        const userSearch = document.getElementById('user-search');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                this.filterUsers(e.target.value);
            });
        }

        // تحديث البيانات
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshAllData();
            });
        }
    }

    showSection(sectionName) {
        // إخفاء جميع الأقسام
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // إظهار القسم المطلوب
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // تحديث التنقل
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNav = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
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
                        <div>لا يوجد مستخدمين</div>
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
                        <div>لا يوجد مهام</div>
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
                        <div>لا يوجد معاملات</div>
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
                        <div>لا توجد نتائج</div>
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
                <div class="stat-label">إجمالي المستخدمين</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-tasks"></i>
                </div>
                <div class="stat-value">${this.tasks.length}</div>
                <div class="stat-label">المهام النشطة</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-exchange-alt"></i>
                </div>
                <div class="stat-value">${this.transactions.length}</div>
                <div class="stat-label">المعاملات</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-coins"></i>
                </div>
                <div class="stat-value">${this.statistics.totalEarned?.toFixed(0) || 0}</div>
                <div class="stat-label">إجمالي الأرباح</div>
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
        this.showNotification('جاري تحديث البيانات...', 'info');
        await this.loadAllData();
        this.updateStatsGrid();
        this.showNotification('تم تحديث البيانات بنجاح!', 'success');
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            this.showNotification(`تعديل المستخدم: ${user.firstName} ${user.lastName}`, 'info');
        }
    }

    async deleteUser(userId) {
        if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
            try {
                const { error } = await window.adminDB.supabase
                    .from('users')
                    .delete()
                    .eq('id', userId);

                if (error) throw error;
                
                await this.loadAllData();
                this.showNotification('تم حذف المستخدم بنجاح!', 'success');
                
            } catch (error) {
                console.error('خطأ في حذف المستخدم:', error);
                this.showNotification('فشل في حذف المستخدم', 'error');
            }
        }
    }

    async deleteTask(taskId) {
        if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
            try {
                const { error } = await window.adminDB.supabase
                    .from('tasks')
                    .delete()
                    .eq('id', taskId);

                if (error) throw error;
                
                await this.loadAllData();
                this.showNotification('تم حذف المهمة بنجاح!', 'success');
                
            } catch (error) {
                console.error('خطأ في حذف المهمة:', error);
                this.showNotification('فشل في حذف المهمة', 'error');
            }
        }
    }
}

// التهيئة عندما يكون الـ DOM جاهز
let admin;
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 تم تحميل الصفحة، بدء تشغيل لوحة الإدارة...');
    admin = new AdminApp();
});

window.admin = admin;
