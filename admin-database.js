class AdminDatabase {
    // ... باقي الكود

    async getAllUsers() {
        try {
            // نظراً لأنه لا يوجد جدول users، سنحاول الحصول على المستخدمين من الجداول الأخرى
            console.log('📋 Fetching users from existing tables...');
            
            // جلب المستخدمين الفريدين من جدول user_tasks
            const { data: tasksData, error: tasksError } = await this.supabase
                .from('user_tasks')
                .select('user_id')
                .order('user_id');

            if (tasksError) {
                console.error('❌ Error getting users from tasks:', tasksError);
                return [];
            }

            // جلب المستخدمين الفريدين من جدول withdrawals
            const { data: withdrawalsData, error: withdrawalsError } = await this.supabase
                .from('withdrawals')
                .select('user_id')
                .order('user_id');

            if (withdrawalsError) {
                console.error('❌ Error getting users from withdrawals:', withdrawalsError);
                return [];
            }

            // دمج وترتيب المستخدمين
            const userSet = new Set();
            
            tasksData?.forEach(task => userSet.add(task.user_id));
            withdrawalsData?.forEach(withdrawal => userSet.add(withdrawal.user_id));
            
            const userIds = Array.from(userSet).sort((a, b) => a - b);
            
            console.log(`✅ Found ${userIds.length} unique users`);
            
            // إنشاء بيانات مستخدمين افتراضية
            return userIds.map(userId => ({
                id: userId,
                firstName: 'User',
                lastName: `#${userId}`,
                username: `user_${userId}`,
                balance: 0,
                tub: 0,
                referrals: 0,
                referralEarnings: 0,
                totalEarned: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));
            
        } catch (error) {
            console.error('❌ Exception getting users:', error);
            return [];
        }
    }

    async getAllTasks() {
        try {
            console.log('📋 Fetching tasks from existing tables...');
            
            // الجمع بين public_tasks و user_tasks
            const [publicTasks, userTasks] = await Promise.all([
                this.getPublicTasks(),
                this.getUserTasks()
            ]);

            const allTasks = [...publicTasks, ...userTasks];
            console.log(`✅ Found ${allTasks.length} total tasks`);
            
            return allTasks;
            
        } catch (error) {
            console.error('❌ Exception getting tasks:', error);
            return [];
        }
    }

    async getPublicTasks() {
        try {
            const { data, error } = await this.supabase
                .from('public_tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error getting public tasks:', error);
                return [];
            }

            return data.map(task => ({
                id: task.id,
                name: task.name || task.title || 'Public Task',
                link: task.link || task.url,
                type: task.type || 'other',
                userId: null, // مهام عامة بدون مستخدم محدد
                targetCompletions: task.target_completions || 1000,
                cost: task.cost || 0,
                reward: task.reward || 10,
                completions: task.completions || 0,
                status: task.status || 'active',
                createdAt: task.created_at,
                user: { firstName: 'Public', lastName: 'Task', username: 'public' }
            }));
            
        } catch (error) {
            console.error('❌ Exception getting public tasks:', error);
            return [];
        }
    }

    async getUserTasks() {
        try {
            const { data, error } = await this.supabase
                .from('user_tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error getting user tasks:', error);
                return [];
            }

            return await Promise.all(
                data.map(async (task) => {
                    return {
                        id: task.id,
                        name: task.name || task.title || 'User Task',
                        link: task.link || task.url,
                        type: task.type || 'other',
                        userId: task.user_id,
                        targetCompletions: task.target_completions || 1000,
                        cost: task.cost || 0,
                        reward: task.reward || 10,
                        completions: task.completions || 0,
                        status: task.status || 'active',
                        createdAt: task.created_at,
                        user: { 
                            firstName: 'User', 
                            lastName: `#${task.user_id}`, 
                            username: `user_${task.user_id}` 
                        }
                    };
                })
            );
            
        } catch (error) {
            console.error('❌ Exception getting user tasks:', error);
            return [];
        }
    }

    async getAllTransactions() {
        try {
            console.log('📋 Fetching transactions from withdrawals...');
            
            const { data, error } = await this.supabase
                .from('withdrawals')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error getting withdrawals:', error);
                return [];
            }

            console.log(`✅ Found ${data.length} withdrawal transactions`);
            
            return data.map(withdrawal => ({
                id: withdrawal.id,
                userId: withdrawal.user_id,
                type: 'withdrawal',
                amount: -Math.abs(withdrawal.amount || 0), // السحب يكون سالب
                description: `Withdrawal request: ${withdrawal.amount} TON`,
                status: withdrawal.status || 'pending',
                createdAt: withdrawal.created_at,
                user: { 
                    firstName: 'User', 
                    lastName: `#${withdrawal.user_id}`, 
                    username: `user_${withdrawal.user_id}` 
                }
            }));
            
        } catch (error) {
            console.error('❌ Exception getting transactions:', error);
            return [];
        }
    }

    async getStatistics() {
        try {
            console.log('📊 Calculating statistics from existing tables...');
            
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

            console.log('📊 Statistics from existing data:', stats);
            return stats;

        } catch (error) {
            console.error('❌ Exception getting statistics:', error);
            return {
                totalUsers: 0,
                tasksCompleted: 0,
                tasksCreated: 0,
                totalEarned: 0
            };
        }
    }
}
