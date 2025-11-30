// Supabase Configuration for Admin
const SUPABASE_CONFIG = {
    url: 'https://ztjokngpzbsuykwpcscz.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0am9rbmdwemJzdXlrd3Bjc2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5OTU0MTcsImV4cCI6MjA0ODU3MTQxN30.8dRLfC-3kzCfIH9c6FCwzva5X4W5j2w1M75Q0q4Jc9A'
};

class AdminDatabase {
    constructor() {
        this.supabase = null;
        this.init();
    }

    async init() {
        try {
            const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
            this.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
            console.log('✅ Admin Database connected successfully');
        } catch (error) {
            console.error('❌ Admin Database connection failed:', error);
        }
    }

    // Users Management
    async getAllUsers() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data.map(user => this.convertToCamelCase(user));
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    }

    async createUser(userData) {
        try {
            const userRecord = {
                id: userData.id,
                first_name: userData.firstName,
                last_name: userData.lastName,
                username: userData.username,
                photo_url: userData.photoUrl,
                balance: userData.balance || 0,
                tub: userData.tub || 1000,
                referrals: userData.referrals || 0,
                referral_earnings: userData.referralEarnings || 0,
                total_earned: userData.totalEarned || 0
            };

            const { data, error } = await this.supabase
                .from('users')
                .insert([userRecord])
                .select()
                .single();

            if (error) throw error;
            return this.convertToCamelCase(data);
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async updateUser(userId, updates) {
        try {
            const updateData = {
                updated_at: new Date().toISOString()
            };

            // Convert camelCase to snake_case
            Object.keys(updates).forEach(key => {
                if (key === 'firstName') updateData.first_name = updates[key];
                else if (key === 'lastName') updateData.last_name = updates[key];
                else if (key === 'photoUrl') updateData.photo_url = updates[key];
                else if (key === 'referralEarnings') updateData.referral_earnings = updates[key];
                else if (key === 'totalEarned') updateData.total_earned = updates[key];
                else updateData[key] = updates[key];
            });

            const { data, error } = await this.supabase
                .from('users')
                .update(updateData)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return this.convertToCamelCase(data);
        } catch (error) {
            console.error('Error updating user:', error);
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
            return { success: true };
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    // Tasks Management
    async getAllTasks() {
        try {
            const { data, error } = await this.supabase
                .from('tasks')
                .select('*, users(first_name, last_name, username)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data.map(task => this.convertToCamelCase(task));
        } catch (error) {
            console.error('Error getting tasks:', error);
            return [];
        }
    }

    async createTask(taskData) {
        try {
            const taskRecord = {
                user_id: taskData.userId,
                name: taskData.name,
                link: taskData.link,
                type: taskData.type,
                check_subscription: taskData.checkSubscription || false,
                target_completions: taskData.targetCompletions,
                cost: taskData.cost,
                reward: taskData.reward || 10,
                status: 'active'
            };

            const { data, error } = await this.supabase
                .from('tasks')
                .insert([taskRecord])
                .select('*, users(first_name, last_name, username)')
                .single();

            if (error) throw error;
            return this.convertToCamelCase(data);
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    async updateTask(taskId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('tasks')
                .update(updates)
                .eq('id', taskId)
                .select('*, users(first_name, last_name, username)')
                .single();

            if (error) throw error;
            return this.convertToCamelCase(data);
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    async deleteTask(taskId) {
        try {
            const { error } = await this.supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    // Transactions
    async getAllTransactions() {
        try {
            const { data, error } = await this.supabase
                .from('transactions')
                .select('*, users(first_name, last_name, username)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data.map(transaction => this.convertToCamelCase(transaction));
        } catch (error) {
            console.error('Error getting transactions:', error);
            return [];
        }
    }

    // Statistics
    async getStatistics() {
        try {
            // Total Users
            const { count: totalUsers } = await this.supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            // Tasks Statistics
            const { data: tasksData } = await this.supabase
                .from('tasks')
                .select('completions, target_completions, status');

            // Total Earnings
            const { data: usersData } = await this.supabase
                .from('users')
                .select('total_earned');

            const tasksCompleted = tasksData?.reduce((sum, task) => sum + (task.completions || 0), 0) || 0;
            const tasksCreated = tasksData?.length || 0;
            const totalEarned = usersData?.reduce((sum, user) => sum + (user.total_earned || 0), 0) || 0;

            return {
                totalUsers: totalUsers || 0,
                tasksCompleted,
                tasksCreated,
                totalEarned
            };
        } catch (error) {
            console.error('Error getting statistics:', error);
            return {
                totalUsers: 0,
                tasksCompleted: 0,
                tasksCreated: 0,
                totalEarned: 0
            };
        }
    }

    // Helper function to convert snake_case to camelCase
    convertToCamelCase(data) {
        if (!data) return data;
        
        const converted = {};
        Object.keys(data).forEach(key => {
            let camelKey = key;
            if (key.includes('_')) {
                camelKey = key.replace(/_([a-z])/g, (match, char) => char.toUpperCase());
            }
            converted[camelKey] = data[key];
        });
        return converted;
    }
}

// Initialize admin database
const adminDB = new AdminDatabase();
