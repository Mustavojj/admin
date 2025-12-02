// admin.js - Connected to your new database
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

class AdminApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.users = [];
        this.tasks = [];
        this.transactions = [];
        this.statistics = {};
        this.isInitialized = false;
        this.supabase = null;
        
        // ✅ قاعدة البيانات الجديدة
        this.supabaseConfig = {
            url: 'https://zrdbimzgnuidrwlvuqby.supabase.co',
            key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZGJpbXpnbnVpZHJ3bHZ1cWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MDYzNTEsImV4cCI6MjA0ODk4MjM1MX0.-N5u5TEze4wR7IOk1Z-pqlZ7KIGu3f4Jj-44aRqpKEA' // قد تحتاج لاستبدال هذا
        };
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Starting Admin Panel...');
            
            // Initialize Supabase
            await this.initializeSupabase();
            
            this.setupEventListeners();
            await this.loadAllData();
            this.updateStatsGrid();
            this.isInitialized = true;
            
            console.log('✅ Admin Panel ready');
            this.showNotification('Admin panel loaded successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to initialize admin panel:', error);
            this.showNotification('Failed to load admin panel: ' + error.message, 'error');
            this.showDatabaseInstructions();
        }
    }

    async initializeSupabase() {
        try {
            console.log('🔗 Connecting to Supabase...');
            console.log('📊 Database URL:', this.supabaseConfig.url);
            
            // Create Supabase client
            this.supabase = createClient(
                this.supabaseConfig.url, 
                this.supabaseConfig.key
            );

            // Test connection
            await this.testConnection();
            
            console.log('✅ Supabase connected successfully');
            
        } catch (error) {
            console.error('❌ Supabase connection failed:', error);
            throw new Error('Database connection failed: ' + error.message);
        }
    }

    async testConnection() {
        console.log('🔍 Testing database connection...');
        
        // Try to get tables first
        const { data: tables, error: tablesError } = await this.supabase
            .from('_tables')
            .select('*')
            .limit(5);

        if (!tablesError) {
            console.log('📋 Available tables:', tables);
        }

        // Try to get users
        const { data, error } = await this.supabase
            .from('users')
            .select('count')
            .limit(1);

        if (error) {
            console.error('Database error details:', error);
            
            // If users table doesn't exist, check other tables
            await this.checkAvailableTables();
            
            throw new Error(`${error.message} (Code: ${error.code})`);
        }
        
        console.log('✅ Database connection test passed');
        return data;
    }

    async checkAvailableTables() {
        console.log('🔍 Checking available tables...');
        
        // Try common table names
        const tablesToCheck = [
            'users', 'user', 'profiles', 'accounts',
            'tasks', 'task', 'missions', 'activities',
            'transactions', 'transaction', 'payments', 'history'
        ];
        
        for (const table of tablesToCheck) {
            try {
                const { data, error } = await this.supabase
                    .from(table)
                    .select('count')
                    .limit(1);
                    
                if (!error && data) {
                    console.log(`✅ Table found: ${table}`);
                }
            } catch (e) {
                // Continue checking other tables
            }
        }
    }

    showDatabaseInstructions() {
        const instructions = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); color: white; display: flex; justify-content: center; align-items: center; z-index: 10000; font-family: Arial, sans-serif;">
                <div style="background: #1f2937; padding: 30px; border-radius: 10px; max-width: 700px; max-height: 90vh; overflow-y: auto;">
                    <h2 style="color: #ef4444; margin-bottom: 20px;">🔧 Database Setup Required</h2>
                    
                    <div style="background: #dc2626; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                        <strong>Action Required:</strong> Please setup your database tables first.
                    </div>
                    
                    <h3 style="color: #10b981;">📋 Step 1: Create Tables</h3>
                    <p>Run these SQL commands in Supabase SQL Editor:</p>
                    
                    <div style="background: #000; padding: 15px; border-radius: 5px; margin-bottom: 20px; overflow-x: auto;">
                        <pre style="color: #fff; margin: 0;">
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE,
    wallet_address VARCHAR(255),
    balance DECIMAL(15, 6) DEFAULT 0.0,
    tub INTEGER DEFAULT 0,
    referrals INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    reward INTEGER DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 6) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
                        </pre>
                    </div>
                    
                    <h3 style="color: #10b981;">📋 Step 2: Test Connection</h3>
                    <p>After creating tables, refresh this page.</p>
                    
                    <div style="background: #374151; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                        <strong>Current Database:</strong> ${this.supabaseConfig.url}
                    </div>
                    
                    <button onclick="location.reload()" style="background: #10b981; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-right: 10px;">
                        🔄 Refresh Page
                    </button>
                    <button onclick="this.parentElement.parentElement.remove()" style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer;">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', instructions);
    }

    async loadAllData() {
        try {
            console.log('📥 Loading data from new database...');
            
            const [users, tasks, transactions] = await Promise.all([
                this.getAllUsers(),
                this.getAllTasks(),
                this.getAllTransactions()
            ]);

            this.users = users;
            this.tasks = tasks;
            this.transactions = transactions;
            this.statistics = this.calculateStatistics();

            this.renderUsersTable();
            this.renderTasksTable();
            this.renderTransactionsTable();
            this.updateStatisticsSection();
            
            console.log('✅ Data loaded successfully');
            console.log(`📊 Users: ${users.length}, Tasks: ${tasks.length}, Transactions: ${transactions.length}`);
            
        } catch (error) {
            console.error('❌ Error loading data:', error);
            throw error;
        }
    }

    async getAllUsers() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching users:', error);
                // Try alternative table names
                return await this.tryAlternativeTables('users', ['user', 'profiles', 'accounts']);
            }

            return data.map(user => ({
                id: user.id,
                firstName: user.first_name || user.firstName || 'Unknown',
                lastName: user.last_name || user.lastName || '',
                username: user.username || 'N/A',
                email: user.email || 'No email',
                balance: user.balance || 0,
                tub: user.tub || user.gold_balance || 0,
                referrals: user.referrals || user.referral_count || 0,
                walletAddress: user.wallet_address || user.wallet || 'No wallet',
                createdAt: user.created_at || user.createdAt || new Date()
            }));
        } catch (error) {
            console.error('Error in getAllUsers:', error);
            return [];
        }
    }

    async getAllTasks() {
        try {
            const { data, error } = await this.supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching tasks:', error);
                // Try alternative table names
                return await this.tryAlternativeTables('tasks', ['task', 'missions', 'activities']);
            }

            return data.map(task => ({
                id: task.id,
                name: task.name || task.title || 'Unnamed Task',
                type: task.type || task.category || 'general',
                description: task.description || 'No description',
                reward: task.reward || task.points_reward || 0,
                cost: task.cost || task.ton_cost || 0,
                status: task.status || 'active',
                completions: task.completions || task.completed_count || 0,
                targetCompletions: task.target_completions || task.required_completions || 1,
                createdAt: task.created_at || task.createdAt || new Date()
            }));
        } catch (error) {
            console.error('Error in getAllTasks:', error);
            return [];
        }
    }

    async getAllTransactions() {
        try {
            const { data, error } = await this.supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching transactions:', error);
                // Try alternative table names
                return await this.tryAlternativeTables('transactions', ['transaction', 'payments', 'history']);
            }

            return data.map(transaction => ({
                id: transaction.id,
                userId: transaction.user_id || transaction.userId,
                type: transaction.type || transaction.transaction_type || 'unknown',
                amount: parseFloat(transaction.amount) || 0,
                description: transaction.description || transaction.note || 'No description',
                status: transaction.status || 'completed',
                createdAt: transaction.created_at || transaction.createdAt || new Date()
            }));
        } catch (error) {
            console.error('Error in getAllTransactions:', error);
            return [];
        }
    }

    async tryAlternativeTables(mainTable, alternatives) {
        for (const table of [mainTable, ...alternatives]) {
            try {
                const { data, error } = await this.supabase
                    .from(table)
                    .select('*')
                    .limit(10);

                if (!error && data && data.length > 0) {
                    console.log(`✅ Found data in table: ${table}`);
                    return data;
                }
            } catch (e) {
                continue;
            }
        }
        return [];
    }

    calculateStatistics() {
        return {
            totalUsers: this.users.length,
            tasksCreated: this.tasks.length,
            tasksCompleted: this.transactions.filter(t => t.type?.includes('task')).length,
            totalEarned: this.transactions
                .filter(t => t.amount > 0)
                .reduce((sum, t) => sum + t.amount, 0)
        };
    }

    // ... باقي دوال الواجهة تبقى كما هي ...

    setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.showSection(section);
            });
        });

        const userSearch = document.getElementById('user-search');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                this.filterUsers(e.target.value);
            });
        }
    }

    showSection(sectionName) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNav = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }

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
                        <div>No users found in database</div>
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
                <td>${user.email}</td>
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
                        <div>No tasks found in database</div>
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
                        <div>No transactions found in database</div>
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
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
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
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize when DOM is ready
let admin;
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, starting Admin Panel...');
    admin = new AdminApp();
});

window.admin = admin;
