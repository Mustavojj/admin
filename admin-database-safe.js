// admin-database-safe.js - Fixed Version
class AdminDatabase {
    constructor() {
        this.supabase = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            console.log('🔄 Initializing Admin Database...');
            
            // Load Supabase SDK
            await this.loadSupabaseSDK();
            
            // Initialize client
            this.supabase = supabase.createClient(
                'https://ztjokngpzbsuykwpcscz.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0am9rbmdwemJzdXlrd3Bjc2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5OTU0MTcsImV4cCI6MjA0ODU3MTQxN30.8dRLfC-3kzCfIH9c6FCwzva5X4W5j2w1M75Q0q4Jc9A'
            );

            // Test connection
            await this.testConnection();
            
            this.isInitialized = true;
            console.log('✅ Admin Database ready');
            
        } catch (error) {
            console.error('❌ Failed to initialize database:', error);
        }
    }

    loadSupabaseSDK() {
        return new Promise((resolve, reject) => {
            if (window.supabase) {
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

    async testConnection() {
        const { data, error } = await this.supabase
            .from('users')
            .select('id')
            .limit(1);
            
        if (error) throw error;
        return data;
    }

    // Data retrieval methods
    async getAllUsers() {
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    async getAllTasks() {
        const { data, error } = await this.supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    async getAllTransactions() {
        const { data, error } = await this.supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    async getStatistics() {
        const [users, tasks, transactions] = await Promise.all([
            this.getAllUsers(),
            this.getAllTasks(),
            this.getAllTransactions()
        ]);

        const totalEarned = transactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        return {
            totalUsers: users.length,
            tasksCreated: tasks.length,
            tasksCompleted: transactions.filter(t => t.type?.includes('task')).length,
            totalEarned: totalEarned
        };
    }
}

// Make the object available globally
window.adminDB = new AdminDatabase();
