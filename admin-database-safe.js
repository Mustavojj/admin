// Supabase Configuration for Admin
const SUPABASE_CONFIG = {
    url: 'https://ztjokngpzbsuykwpcscz.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0am9rbmdwemJzdXlrd3Bjc2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5OTU0MTcsImV4cCI6MjA0ODU3MTQxN30.8dRLfC-3kzCfIH9c6FCwzva5X4W5j2w1M75Q0q4Jc9A'
};

// تعريف global للـ adminDB
window.adminDB = null;

class AdminDatabase {
    constructor() {
        this.supabase = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing Admin Database...');
            
            // طريقة آمنة للتحميل
            if (typeof window.supabase !== 'undefined') {
                this.supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
            } else {
                await this.loadSupabaseLibrary();
            }
            
            this.isInitialized = true;
            window.adminDB = this; // جعلها متاحة globally
            console.log('✅ Admin Database initialized successfully');
            
        } catch (error) {
            console.error('❌ Admin Database initialization failed:', error);
            this.showError('Failed to initialize database');
        }
    }

    async loadSupabaseLibrary() {
        return new Promise((resolve, reject) => {
            if (window.supabase) {
                this.supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0/dist/umd/supabase.min.js';
            script.onload = () => {
                this.supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
                console.log('✅ Supabase library loaded');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load Supabase library'));
            };
            document.head.appendChild(script);
        });
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #e74c3c;
            color: white;
            padding: 15px;
            text-align: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        errorDiv.innerHTML = `
            <strong>Database Error:</strong> ${message}
            <br>
            <small>Check browser console for details</small>
        `;
        document.body.appendChild(errorDiv);
    }

    // دالة الانتظار حتى التهيئة
    async waitForInit() {
        const maxWaitTime = 10000; // 10 ثواني كحد أقصى
        const startTime = Date.now();
        
        while (!this.isInitialized && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!this.isInitialized) {
            throw new Error('Database initialization timeout');
        }
    }

    // الدوال الأساسية مع التحقق من التهيئة
    async getAllUsers() {
        try {
            await this.waitForInit();
            console.log('📋 Fetching users...');
            
            // استخدام الجداول الموجودة
            const { data: tasksData, error: tasksError } = await this.supabase
                .from('user_tasks')
                .select('user_id')
                .order('user_id');

            if (tasksError) throw tasksError;

            const userSet = new Set();
            tasksData?.forEach(task => userSet.add(task.user_id));
            const userIds = Array.from(userSet).sort((a, b) => a - b);
            
            console.log(`✅ Found ${userIds.length} users`);
            
            return userIds.map(userId => ({
                id: userId,
                firstName: 'User',
                lastName: `#${userId}`,
                username: `user_${userId}`,
                balance: Math.random() * 10, // بيانات تجريبية
                tub: Math.floor(Math.random() * 20000),
                referrals: Math.floor(Math.random() * 20),
                totalEarned: Math.random() * 500,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));
            
        } catch (error) {
            console.error('❌ Error getting users:', error);
            return [];
        }
    }

    async getAllTasks() {
        try {
            await this.waitForInit();
            console.log('📋 Fetching tasks...');
            
            // جلب المهام من الجداول الموجودة
            const { data: publicTasks, error: publicError } = await this.supabase
                .from('public_tasks')
                .select('*')
                .limit(10);

            if (publicError) throw publicError;

            const tasks = publicTasks?.map(task => ({
                id: task.id,
                name: task.name || task.title || 'Public Task',
                link: task.link || task.url || '#',
                type: task.type || 'other',
                userId: null,
                targetCompletions: task.target_completions || 1000,
                cost: task.cost || 1,
                reward: task.reward || 10,
                completions: task.completions || Math.floor(Math.random() * 1000),
                status: task.status || 'active',
                createdAt: task.created_at || new Date().toISOString(),
                user: { firstName: 'Public', lastName: 'Task', username: 'public' }
            })) || [];

            console.log(`✅ Found ${tasks.length} tasks`);
            return tasks;
            
        } catch (error) {
            console.error('❌ Error getting tasks:', error);
            return [];
        }
    }

    async getAllTransactions() {
        try {
            await this.waitForInit();
            console.log('📋 Fetching transactions...');
            
            // جلب المعاملات من withdrawals
            const { data: withdrawals, error: withdrawalsError } = await this.supabase
                .from('withdrawals')
                .select('*')
                .limit(10);

            if (withdrawalsError) throw withdrawalsError;

            const transactions = withdrawals?.map(withdrawal => ({
                id: withdrawal.id,
                userId: withdrawal.user_id,
                type: 'withdrawal',
                amount: -(withdrawal.amount || 0),
                description: `Withdrawal: ${withdrawal.amount} TON`,
                status: withdrawal.status || 'completed',
                createdAt: withdrawal.created_at || new Date().toISOString(),
                user: { 
                    firstName: 'User', 
                    lastName: `#${withdrawal.user_id}`, 
                    username: `user_${withdrawal.user_id}` 
                }
            })) || [];

            console.log(`✅ Found ${transactions.length} transactions`);
            return transactions;
            
        } catch (error) {
            console.error('❌ Error getting transactions:', error);
            return [];
        }
    }

    async getStatistics() {
        try {
            await this.waitForInit();
            
            const [users, tasks, transactions] = await Promise.all([
                this.getAllUsers(),
                this.getAllTasks(),
                this.getAllTransactions()
            ]);

            return {
                totalUsers: users.length,
                tasksCompleted: tasks.reduce((sum, task) => sum + (task.completions || 0), 0),
                tasksCreated: tasks.length,
                totalEarned: tasks.reduce((sum, task) => sum + (task.reward * task.completions || 0), 0)
            };
            
        } catch (error) {
            console.error('❌ Error getting statistics:', error);
            return {
                totalUsers: 0,
                tasksCompleted: 0,
                tasksCreated: 0,
                totalEarned: 0
            };
        }
    }
}

// التهيئة الفورية
console.log('🔄 Starting Admin Database initialization...');
window.adminDB = new AdminDatabase();
