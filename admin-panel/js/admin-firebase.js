// Admin Panel - Firebase Service
class AdminFirebaseService {
    constructor() {
        this.config = {
            apiKey: "AIzaSyBgZVF60SotjtCvAjv52GfBZv4ppKdGYWk",
            authDomain: "new-you-6a04c.firebaseapp.com",
            databaseURL: "https://new-you-6a04c-default-rtdb.firebaseio.com",
            projectId: "new-you-6a04c",
            storageBucket: "new-you-6a04c.firebasestorage.app",
            messagingSenderId: "765835623631",
            appId: "1:765835623631:web:9c3e8425123239c26ccbba",
            measurementId: "G-TZGKT4GJ4L"
        };
        
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.rateLimiter = new AdminRateLimiter();
        this.cache = new AdminCache();
    }
    
    async initialize() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(this.config);
            }
            
            this.db = firebase.database();
            this.auth = firebase.auth();
            
            // Anonymous authentication for admin
            await this.auth.signInAnonymously();
            this.currentUser = this.auth.currentUser;
            
            console.log('✅ Admin Firebase initialized');
            return true;
        } catch (error) {
            console.error('❌ Admin Firebase initialization error:', error);
            throw error;
        }
    }
    
    async getUsers(limit = 50, lastKey = null) {
        try {
            let query = this.db.ref('users').orderByKey();
            
            if (lastKey) {
                query = query.startAfter(lastKey);
            }
            
            query = query.limitToFirst(limit);
            
            const snapshot = await query.once('value');
            const users = [];
            
            snapshot.forEach(child => {
                users.push({ id: child.key, ...child.val() });
            });
            
            return users;
        } catch (error) {
            console.error('Error getting users:', error);
            throw error;
        }
    }
    
    async getUserById(userId) {
        const cacheKey = `user_${userId}`;
        
        return await this.cache.get(cacheKey, async () => {
            const snapshot = await this.db.ref(`users/${userId}`).once('value');
            return snapshot.val();
        }, 30000);
    }
    
    async updateUser(userId, updates) {
        if (!await this.rateLimiter.checkLimit('update_user', 1000)) {
            throw new Error('Rate limit exceeded');
        }
        
        // Add admin metadata
        const updateData = {
            ...updates,
            lastUpdated: Date.now(),
            updatedBy: 'admin',
            adminAction: true
        };
        
        await this.db.ref(`users/${userId}`).update(updateData);
        
        // Invalidate cache
        this.cache.invalidate(`user_${userId}`);
        
        // Log admin action
        await this.logAdminAction('update_user', {
            userId,
            updates,
            adminId: this.currentUser?.uid || 'anonymous'
        });
        
        return true;
    }
    
    async addBalanceToUser(userId, amount, type = 'ton', reason = 'Admin addition') {
        if (!await this.rateLimiter.checkLimit('add_balance', 1000)) {
            throw new Error('Rate limit exceeded');
        }
        
        // Get current user data
        const userData = await this.getUserById(userId);
        if (!userData) {
            throw new Error('User not found');
        }
        
        // Prepare updates
        const updates = {};
        if (type === 'ton') {
            updates.balance = (userData.balance || 0) + amount;
        } else {
            updates.tub = (userData.tub || 0) + amount;
        }
        
        // Update user
        await this.updateUser(userId, updates);
        
        // Record transaction for user
        await this.recordTransaction(userId, {
            type: 'admin_addition',
            amount: amount,
            description: reason,
            adminAction: true,
            balanceType: type
        });
        
        // Log admin action
        await this.logAdminAction('add_balance', {
            userId,
            amount,
            type,
            reason,
            previousBalance: type === 'ton' ? userData.balance : userData.tub,
            newBalance: updates[type === 'ton' ? 'balance' : 'tub']
        });
        
        return true;
    }
    
    async getPendingWithdrawals() {
        const cacheKey = 'pending_withdrawals';
        
        return await this.cache.get(cacheKey, async () => {
            const snapshot = await this.db.ref('withdrawals/pending').once('value');
            const withdrawals = [];
            
            snapshot.forEach(child => {
                withdrawals.push({ id: child.key, ...child.val() });
            });
            
            return withdrawals;
        }, 30000);
    }
    
    async processWithdrawal(withdrawalId, action) {
        if (!await this.rateLimiter.checkLimit('process_withdrawal', 2000)) {
            throw new Error('Rate limit exceeded');
        }
        
        // Get withdrawal data
        const snapshot = await this.db.ref(`withdrawals/pending/${withdrawalId}`).once('value');
        const withdrawal = snapshot.val();
        
        if (!withdrawal) {
            throw new Error('Withdrawal not found');
        }
        
        const status = action === 'approve' ? 'completed' : 'rejected';
        
        // Move to appropriate status node
        await this.db.ref(`withdrawals/${status}/${withdrawalId}`).set({
            ...withdrawal,
            status,
            processedAt: Date.now(),
            processedBy: 'admin'
        });
        
        // Remove from pending
        await this.db.ref(`withdrawals/pending/${withdrawalId}`).remove();
        
        // If rejected, refund balance to user
        if (action === 'reject') {
            const userData = await this.getUserById(withdrawal.userId);
            if (userData) {
                await this.updateUser(withdrawal.userId, {
                    balance: (userData.balance || 0) + withdrawal.amount
                });
                
                // Record transaction
                await this.recordTransaction(withdrawal.userId, {
                    type: 'withdrawal_refund',
                    amount: withdrawal.amount,
                    description: 'Withdrawal rejected - refunded',
                    withdrawalId: withdrawalId
                });
            }
        }
        
        // Log admin action
        await this.logAdminAction('process_withdrawal', {
            withdrawalId,
            action,
            status,
            userId: withdrawal.userId,
            amount: withdrawal.amount
        });
        
        // Invalidate cache
        this.cache.invalidate('pending_withdrawals');
        
        return true;
    }
    
    async getTasks() {
        const cacheKey = 'tasks_all';
        
        return await this.cache.get(cacheKey, async () => {
            const snapshot = await this.db.ref('tasks').once('value');
            const tasks = [];
            
            snapshot.forEach(child => {
                tasks.push({ id: child.key, ...child.val() });
            });
            
            return tasks;
        }, 30000);
    }
    
    async addTask(taskData) {
        if (!await this.rateLimiter.checkLimit('add_task', 2000)) {
            throw new Error('Rate limit exceeded');
        }
        
        const taskId = this.db.ref('tasks').push().key;
        const task = {
            ...taskData,
            id: taskId,
            createdAt: Date.now(),
            status: 'active',
            createdBy: 'admin',
            progress: 0,
            currentUsers: 0
        };
        
        await this.db.ref(`tasks/${taskId}`).set(task);
        
        // Invalidate cache
        this.cache.invalidate('tasks_all');
        
        // Log admin action
        await this.logAdminAction('add_task', {
            taskId,
            taskName: taskData.name,
            targetUsers: taskData.targetUsers,
            reward: taskData.reward
        });
        
        return taskId;
    }
    
    async updateTask(taskId, updates) {
        if (!await this.rateLimiter.checkLimit('update_task', 1000)) {
            throw new Error('Rate limit exceeded');
        }
        
        await this.db.ref(`tasks/${taskId}`).update(updates);
        
        // Invalidate cache
        this.cache.invalidate('tasks_all');
        
        return true;
    }
    
    async deleteTask(taskId) {
        if (!await this.rateLimiter.checkLimit('delete_task', 1000)) {
            throw new Error('Rate limit exceeded');
        }
        
        await this.db.ref(`tasks/${taskId}`).remove();
        
        // Also delete from user tasks
        const snapshot = await this.db.ref('userTasks').once('value');
        const deletions = [];
        
        snapshot.forEach(userSnapshot => {
            userSnapshot.forEach(taskSnapshot => {
                if (taskSnapshot.key === taskId) {
                    deletions.push(
                        this.db.ref(`userTasks/${userSnapshot.key}/${taskId}`).remove()
                    );
                }
            });
        });
        
        await Promise.all(deletions);
        
        // Invalidate cache
        this.cache.invalidate('tasks_all');
        
        // Log admin action
        await this.logAdminAction('delete_task', { taskId });
        
        return true;
    }
    
    async getPromoCodes() {
        const cacheKey = 'promo_codes';
        
        return await this.cache.get(cacheKey, async () => {
            const snapshot = await this.db.ref('config/promoCodes').once('value');
            const promoCodes = [];
            
            snapshot.forEach(child => {
                promoCodes.push({ id: child.key, ...child.val() });
            });
            
            return promoCodes;
        }, 60000);
    }
    
    async addPromoCode(promoData) {
        if (!await this.rateLimiter.checkLimit('add_promo', 2000)) {
            throw new Error('Rate limit exceeded');
        }
        
        const promoId = this.db.ref('config/promoCodes').push().key;
        const promo = {
            ...promoData,
            id: promoId,
            createdAt: Date.now(),
            usedCount: 0,
            status: 'active',
            createdBy: 'admin'
        };
        
        await this.db.ref(`config/promoCodes/${promoId}`).set(promo);
        
        // Invalidate cache
        this.cache.invalidate('promo_codes');
        
        // Log admin action
        await this.logAdminAction('add_promo', {
            promoId,
            code: promoData.code,
            reward: promoData.reward,
            type: promoData.type
        });
        
        return promoId;
    }
    
    async deletePromoCode(promoId) {
        if (!await this.rateLimiter.checkLimit('delete_promo', 1000)) {
            throw new Error('Rate limit exceeded');
        }
        
        await this.db.ref(`config/promoCodes/${promoId}`).remove();
        
        // Invalidate cache
        this.cache.invalidate('promo_codes');
        
        // Log admin action
        await this.logAdminAction('delete_promo', { promoId });
        
        return true;
    }
    
    async getAppConfig() {
        const cacheKey = 'app_config';
        
        return await this.cache.get(cacheKey, async () => {
            const snapshot = await this.db.ref('config').once('value');
            return snapshot.val();
        }, 30000);
    }
    
    async updateAppConfig(updates) {
        if (!await this.rateLimiter.checkLimit('update_config', 5000)) {
            throw new Error('Rate limit exceeded');
        }
        
        await this.db.ref('config').update(updates);
        
        // Invalidate cache
        this.cache.invalidate('app_config');
        
        // Log admin action
        await this.logAdminAction('update_config', { updates });
        
        return true;
    }
    
    async getBalanceHistory(userId = null, limit = 50) {
        let query = this.db.ref('transactions');
        
        if (userId) {
            query = query.child(userId);
        }
        
        query = query.orderByChild('timestamp').limitToLast(limit);
        
        const snapshot = await query.once('value');
        const transactions = [];
        
        snapshot.forEach(child => {
            transactions.unshift({ id: child.key, ...child.val() });
        });
        
        return transactions;
    }
    
    async getAdminLogs(limit = 100) {
        const snapshot = await this.db.ref('adminLogs')
            .orderByChild('timestamp')
            .limitToLast(limit)
            .once('value');
        
        const logs = [];
        
        snapshot.forEach(child => {
            logs.unshift({ id: child.key, ...child.val() });
        });
        
        return logs;
    }
    
    async getSystemStats() {
        try {
            const [
                usersCount,
                pendingWithdrawals,
                activeTasks,
                activePromos,
                totalTransactions
            ] = await Promise.all([
                this.getUsersCount(),
                this.getPendingWithdrawalsCount(),
                this.getActiveTasksCount(),
                this.getActivePromosCount(),
                this.getTotalTransactionsCount()
            ]);
            
            return {
                users: usersCount,
                pendingWithdrawals: pendingWithdrawals,
                activeTasks: activeTasks,
                activePromos: activePromos,
                totalTransactions: totalTransactions,
                lastUpdated: Date.now()
            };
        } catch (error) {
            console.error('Error getting system stats:', error);
            throw error;
        }
    }
    
    async getUsersCount() {
        const snapshot = await this.db.ref('users').once('value');
        return snapshot.numChildren();
    }
    
    async getPendingWithdrawalsCount() {
        const snapshot = await this.db.ref('withdrawals/pending').once('value');
        return snapshot.numChildren();
    }
    
    async getActiveTasksCount() {
        const snapshot = await this.db.ref('tasks')
            .orderByChild('status')
            .equalTo('active')
            .once('value');
        
        return snapshot.numChildren();
    }
    
    async getActivePromosCount() {
        const snapshot = await this.db.ref('config/promoCodes')
            .orderByChild('status')
            .equalTo('active')
            .once('value');
        
        return snapshot.numChildren();
    }
    
    async getTotalTransactionsCount() {
        const snapshot = await this.db.ref('transactions').once('value');
        return snapshot.numChildren();
    }
    
    async recordTransaction(userId, transaction) {
        const txId = this.db.ref(`transactions/${userId}`).push().key;
        const txData = {
            ...transaction,
            id: txId,
            userId: userId,
            timestamp: Date.now(),
            recordedBy: 'admin'
        };
        
        await this.db.ref(`transactions/${userId}/${txId}`).set(txData);
        return txId;
    }
    
    async logAdminAction(action, details) {
        const logId = this.db.ref('adminLogs').push().key;
        const logData = {
            id: logId,
            action: action,
            details: details,
            adminId: this.currentUser?.uid || 'anonymous',
            timestamp: Date.now(),
            ip: 'admin_panel' // In real app, get from request
        };
        
        await this.db.ref(`adminLogs/${logId}`).set(logData);
        return logId;
    }
}

class AdminRateLimiter {
    constructor() {
        this.requests = new Map();
        this.limits = {
            update_user: { max: 100, window: 60000 },
            add_balance: { max: 50, window: 60000 },
            process_withdrawal: { max: 30, window: 60000 },
            add_task: { max: 20, window: 60000 },
            update_task: { max: 100, window: 60000 },
            delete_task: { max: 50, window: 60000 },
            add_promo: { max: 20, window: 60000 },
            delete_promo: { max: 50, window: 60000 },
            update_config: { max: 10, window: 60000 }
        };
    }
    
    async checkLimit(action, cooldown = 1000) {
        const key = `admin_${action}`;
        const now = Date.now();
        const limit = this.limits[action] || { max: 20, window: 60000 };
        
        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }
        
        const actionRequests = this.requests.get(key);
        const validRequests = actionRequests.filter(time => now - time < limit.window);
        
        if (validRequests.length >= limit.max) {
            console.warn(`Admin rate limit exceeded for ${action}`);
            return false;
        }
        
        // Check cooldown
        if (actionRequests.length > 0) {
            const lastRequest = actionRequests[actionRequests.length - 1];
            if (now - lastRequest < cooldown) {
                return false;
            }
        }
        
        validRequests.push(now);
        this.requests.set(key, validRequests);
        
        // Cleanup
        setTimeout(() => {
            if (this.requests.has(key)) {
                const currentRequests = this.requests.get(key);
                const updatedRequests = currentRequests.filter(time => now - time < limit.window);
                if (updatedRequests.length === 0) {
                    this.requests.delete(key);
                } else {
                    this.requests.set(key, updatedRequests);
                }
            }
        }, limit.window);
        
        return true;
    }
}

class AdminCache {
    constructor() {
        this.cache = new Map();
    }
    
    async get(key, fetchFunction, ttl = 30000) {
        const cached = this.cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < ttl) {
            return cached.data;
        }
        
        const data = await fetchFunction();
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        
        return data;
    }
    
    invalidate(key) {
        this.cache.delete(key);
    }
    
    clear() {
        this.cache.clear();
    }
}

// Export singleton instance
const adminFirebaseService = new AdminFirebaseService();
