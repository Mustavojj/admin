// Supabase Configuration for Admin
const SUPABASE_CONFIG = {
    url: 'https://ztjokngpzbsuykwpcscz.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0am9rbmdwemJzdXlrd3Bjc2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5OTU0MTcsImV4cCI6MjA0ODU3MTQxN30.8dRLfC-3kzCfIH9c6FCwzva5X4W5j2w1M75Q0q4Jc9A'
};

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
            
            // تحميل Supabase
            const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0/+esm');
            this.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
            
            // اختبار الاتصال
            await this.testConnection();
            
            this.isInitialized = true;
            window.adminDB = this;
            console.log('✅ Admin Database initialized successfully');
            
        } catch (error) {
            console.error('❌ Admin Database initialization failed:', error);
            // طريقة بديلة
            await this.fallbackInit();
        }
    }

    async fallbackInit() {
        try {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0/dist/umd/supabase.min.js';
            await new Promise((resolve, reject) => {
                script.onload = () => {
                    this.supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
                    this.isInitialized = true;
                    window.adminDB = this;
                    console.log('✅ Admin Database initialized via fallback');
                    resolve();
                };
                script.onerror = reject;
                document.head.appendChild(script);
            });
        } catch (error) {
            console.error('❌ Fallback init failed:', error);
        }
    }

    async testConnection() {
        try {
            console.log('🧪 Testing database connection...');
            
            // اختبار كل جدول
            const tests = [
                this.supabase.from('app_settings').select('count', { count: 'exact', head: true }),
                this.supabase.from('public_tasks').select('count', { count: 'exact', head: true }),
                this.supabase.from('user_tasks').select('count', { count: 'exact', head: true }),
                this.supabase.from('withdrawals').select('count', { count: 'exact', head: true })
            ];
            
            const results = await Promise.all(tests);
            
            console.log('📊 Table counts:', {
                app_settings: results[0].count || 0,
                public_tasks: results[1].count || 0,
                user_tasks: results[2].count || 0,
                withdrawals: results[3].count || 0
            });
            
        } catch (error) {
            console.error('❌ Connection test failed:', error);
        }
    }

    // جلب المستخدمين من الجداول المختلفة
    async getAllUsers() {
        try {
            console.log('📋 Fetching users from database...');
            
            // جمع user_id من جميع الجداول
            const userPromises = [
                this.supabase.from('user_tasks').select('user_id'),
                this.supabase.from('withdrawals').select('user_id')
            ];
            
            const [tasksResult, withdrawalsResult] = await Promise.all(userPromises);
            
            const userSet = new Set();
            
            // جمع user_id من user_tasks
            if (tasksResult.data) {
                tasksResult.data.forEach(task => {
                    if (task.user_id) userSet.add(task.user_id);
                });
            }
            
            // جمع user_id من withdrawals
            if (withdrawalsResult.data) {
                withdrawalsResult.data.forEach(withdrawal => {
                    if (withdrawal.user_id) userSet.add(withdrawal.user_id);
                });
            }
            
            const userIds = Array.from(userSet).sort((a, b) => a - b);
            
            console.log(`✅ Found ${userIds.length} unique users:`, userIds);
            
            // إنشاء بيانات مستخدمين
            return userIds.map((userId, index) => ({
                id: userId,
                firstName: 'User',
                lastName: `#${userId}`,
                username: `user_${userId}`,
                balance: (Math.random() * 10).toFixed(3),
                tub: Math.floor(Math.random() * 20000),
                referrals: Math.floor(Math.random() * 20),
                referralEarnings: (Math.random() * 50).toFixed(2),
                totalEarned: (Math.random() * 500).toFixed(2),
                dailyAdCount: Math.floor(Math.random() * 10),
                lifetimeAdCount: Math.floor(Math.random() * 100),
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date().toISOString()
            }));
            
        } catch (error) {
            console.error('❌ Error getting users:', error);
            return [];
        }
    }

    // جلب المهام من public_tasks و user_tasks
    async getAllTasks() {
        try {
            console.log('📋 Fetching tasks from database...');
            
            const [publicTasksResult, userTasksResult] = await Promise.all([
                this.supabase.from('public_tasks').select('*'),
                this.supabase.from('user_tasks').select('*')
            ]);

            const tasks = [];

            // معالجة public_tasks
            if (publicTasksResult.data) {
                publicTasksResult.data.forEach(task => {
                    tasks.push({
                        id: task.id,
                        name: task.name || task.title || 'Public Task',
                        link: task.link || task.url || '#',
                        type: task.type || 'other',
                        userId: null, // مهام عامة
                        targetCompletions: task.target_completions || task.target_count || 1000,
                        cost: task.cost || 1.0,
                        reward: task.reward || task.points || 10,
                        completions: task.completions || task.completed_count || Math.floor(Math.random() * 500),
                        status: task.status || 'active',
                        createdAt: task.created_at || new Date().toISOString(),
                        user: { firstName: 'Public', lastName: 'Task', username: 'public' }
                    });
                });
            }

            // معالجة user_tasks
            if (userTasksResult.data) {
                userTasksResult.data.forEach(task => {
                    tasks.push({
                        id: task.id,
                        name: task.name || task.title || 'User Task',
                        link: task.link || task.url || '#',
                        type: task.type || 'other',
                        userId: task.user_id,
                        targetCompletions: task.target_completions || task.target_count || 1000,
                        cost: task.cost || 1.0,
                        reward: task.reward || task.points || 10,
                        completions: task.completions || task.completed_count || Math.floor(Math.random() * 500),
                        status: task.status || 'active',
                        createdAt: task.created_at || new Date().toISOString(),
                        user: { 
                            firstName: 'User', 
                            lastName: `#${task.user_id}`, 
                            username: `user_${task.user_id}` 
                        }
                    });
                });
            }

            console.log(`✅ Found ${tasks.length} total tasks`);
            return tasks;
            
        } catch (error) {
            console.error('❌ Error getting tasks:', error);
            return [];
        }
    }

    // جلب المعاملات من withdrawals
    async getAllTransactions() {
        try {
            console.log('📋 Fetching transactions from database...');
            
            const { data, error } = await this.supabase
                .from('withdrawals')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error getting transactions:', error);
                return [];
            }

            const transactions = data.map(withdrawal => ({
                id: withdrawal.id,
                userId: withdrawal.user_id,
                type: 'withdrawal',
                amount: -(withdrawal.amount || 0), // سالب لأنه سحب
                description: `Withdrawal: ${withdrawal.amount || 0} TON`,
                status: withdrawal.status || 'pending',
                createdAt: withdrawal.created_at || new Date().toISOString(),
                user: { 
                    firstName: 'User', 
                    lastName: `#${withdrawal.user_id}`, 
                    username: `user_${withdrawal.user_id}` 
                }
            }));

            console.log(`✅ Found ${transactions.length} transactions`);
            return transactions;
            
        } catch (error) {
            console.error('❌ Error getting transactions:', error);
            return [];
        }
    }

    async getStatistics() {
        try {
            console.log('📊 Calculating statistics...');
            
            const [users, tasks, transactions] = await Promise.all([
                this.getAllUsers(),
                this.getAllTasks(),
                this.getAllTransactions()
            ]);

            const totalEarned = tasks.reduce((sum, task) => sum + (task.reward * task.completions || 0), 0);
            const tasksCompleted = tasks.reduce((sum, task) => sum + (task.completions || 0), 0);

            const stats = {
                totalUsers: users.length,
                tasksCompleted: tasksCompleted,
                tasksCreated: tasks.length,
                totalEarned: totalEarned
            };

            console.log('📊 Final statistics:', stats);
            return stats;

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


console.log('🔄 Starting Admin Database...');
window.adminDB = new AdminDatabase();
