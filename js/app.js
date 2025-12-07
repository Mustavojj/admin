// app.js - ملف التطبيق الرئيسي لـ X BOSS APP

// إعدادات التطبيق
const APP_CONFIG = {
  appName: "X BOSS APP",
  botUsername: "x_boss_bot",
  walletAddress: "UQDMj-aLehj4WZwvw0ZEcIVD14blpLWQxzdCmD7QjKOP6D-F",
  adZoneId: "10287609",
  adValue: 10,
  dailyAdLimit: 50,
  adsPerBreak: 10,
  breakDuration: 5,
  minimumWithdraw: 0.10,
  minimumDeposit: 0.50,
  exchangeRate: 10000,
  welcomeMessage: "Welcome to X BOSS APP! Earn GOLD and withdraw TON!",
  communityLink: "https://t.me/TON_HUB_NEWS",
  tonkeeperLink: "https://app.tonkeeper.com/transfer/UQDMj-aLehj4WZwvw0ZEcIVD14blpLWQxzdCmD7QjKOP6D-F?amount=&text="
};

const WITHDRAWAL_OPTIONS = [
  { gold: 10000, ton: 0.10, label: "10,000 GOLD ≈ 0.10 TON" },
  { gold: 50000, ton: 0.50, label: "50,000 GOLD ≈ 0.50 TON" },
  { gold: 100000, ton: 1.00, label: "100,000 GOLD ≈ 1 TON" },
  { gold: 500000, ton: 5.00, label: "500,000 GOLD ≈ 5 TON" }
];

const TASK_PRICES = {
  500: 0.5,
  1000: 1.0,
  3000: 3.0,
  5000: 5.0
};

const QUESTS = {
  daily: [
    { id: 'daily_checkin', title: 'Daily Check-in', reward: 10, type: 'gold', description: 'Claim your daily reward' },
    { id: 'join_community', title: 'Join Community', reward: 10, type: 'gold', description: 'Join our community channel' }
  ],
  tasks: [
    { target: 100, reward: 1000, type: 'gold', title: 'Complete 100 Tasks' },
    { target: 500, reward: 5000, type: 'gold', title: 'Complete 500 Tasks' },
    { target: 1000, reward: 10000, type: 'gold', title: 'Complete 1,000 Tasks' },
    { target: 5000, reward: 50000, type: 'gold', title: 'Complete 5,000 Tasks' },
    { target: 10000, reward: 100000, type: 'gold', title: 'Complete 10,000 Tasks' }
  ],
  friends: [
    { target: 3, reward: 50, type: 'gold', title: 'Invite 3 Friends' },
    { target: 5, reward: 100, type: 'gold', title: 'Invite 5 Friends' },
    { target: 10, reward: 200, type: 'gold', title: 'Invite 10 Friends' },
    { target: 25, reward: 500, type: 'gold', title: 'Invite 25 Friends' },
    { target: 50, reward: 1000, type: 'gold', title: 'Invite 50 Friends' },
    { target: 100, reward: 2000, type: 'gold', title: 'Invite 100 Friends' },
    { target: 500, reward: 10000, type: 'gold', title: 'Invite 500 Friends' },
    { target: 1000, reward: 20000, type: 'gold', title: 'Invite 1,000 Friends' },
    { target: 5000, reward: 100000, type: 'gold', title: 'Invite 5,000 Friends' },
    { target: 10000, reward: 200000, type: 'gold', title: 'Invite 10,000 Friends' }
  ]
};

// تكوين Firebase
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBgZVF60SotjtCvAjv52GfBZv4ppKdGYWk",
  authDomain: "new-you-6a04c.firebaseapp.com",
  databaseURL: "https://new-you-6a04c-default-rtdb.firebaseio.com",
  projectId: "new-you-6a04c",
  storageBucket: "new-you-6a04c.firebasestorage.app",
  messagingSenderId: "765835623631",
  appId: "1:765835623631:web:9c3e8425123239c26ccbba",
  measurementId: "G-TZGKT4GJ4L"
};

// فئة التطبيق الرئيسية
class XBossApp {
  constructor() {
    // Telegram WebApp
    this.tg = window.Telegram?.WebApp;
    
    // Firebase
    this.db = null;
    this.auth = null;
    this.firebaseInitialized = false;
    
    // بيانات المستخدم
    this.currentUser = null;
    this.userState = {};
    this.appConfig = APP_CONFIG;
    this.questsState = {};
    this.userTasks = [];
    this.userWithdrawals = [];
    this.userDeposits = [];
    this.userTasksData = {};
    
    // حالة التطبيق
    this.isInitialized = false;
    this.adInterval = null;
    this.adCounter = 0;
    
    // نظام Cooldown بسيط
    this.cooldowns = new Map();
    
    // خيار السحب المحدد
    this.selectedWithdrawal = null;
  }

  // تهيئة Firebase
  async initializeFirebase() {
    try {
      console.log("🔥 Initializing Firebase...");
      
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      
      this.db = firebase.database();
      this.auth = firebase.auth();
      this.firebaseInitialized = true;
      
      console.log("✅ Firebase initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Firebase initialization error:", error);
      return false;
    }
  }

  // تحقق من Cooldown بسيط
  checkCooldown(action, userId, duration = 3000) {
    const key = `${action}_${userId}`;
    const now = Date.now();
    
    if (this.cooldowns.has(key)) {
      const lastTime = this.cooldowns.get(key);
      if (now - lastTime < duration) {
        return {
          allowed: false,
          remaining: Math.ceil((duration - (now - lastTime)) / 1000)
        };
      }
    }
    
    this.cooldowns.set(key, now);
    return { allowed: true };
  }

  // التحقق من صحة المدخلات
  validateInput(input, type = 'text') {
    if (!input || typeof input !== 'string') return false;
    
    const trimmed = input.trim();
    if (trimmed.length === 0) return false;
    
    switch (type) {
      case 'number':
        return !isNaN(trimmed) && parseFloat(trimmed) > 0;
      case 'url':
        try {
          new URL(trimmed);
          return true;
        } catch {
          return false;
        }
      case 'wallet':
        // قبول أي عنوان محفظة (يمكن تعديل النمط لاحقاً)
        return trimmed.length > 10 && trimmed.length < 100;
      case 'promo':
        return /^[A-Z0-9]{4,12}$/.test(trimmed);
      default:
        return trimmed.length > 0 && trimmed.length < 1000;
    }
  }

  // تهيئة التطبيق الرئيسية
  async initialize() {
    try {
      console.log("🚀 Initializing X BOSS APP...");
      
      // التحقق من وجود Telegram WebApp
      if (!this.tg) {
        console.warn("⚠️ Telegram WebApp not found, running in browser mode");
        this.setupBrowserMode();
      } else {
        this.tg.ready();
        this.tg.expand();
        
        if (!this.tg.initDataUnsafe?.user) {
          throw new Error("User data not found. Please open from Telegram.");
        }
        
        this.tgUser = this.tg.initDataUnsafe.user;
        console.log("👤 Telegram user:", this.tgUser.id);
      }
      
      // تهيئة Firebase
      const firebaseSuccess = await this.initializeFirebase();
      if (!firebaseSuccess) {
        throw new Error("Failed to connect to database");
      }
      
      // تسجيل الدخول anonymously
      try {
        const userCredential = await this.auth.signInAnonymously();
        this.currentUser = userCredential.user;
        console.log("✅ Anonymous authentication successful");
      } catch (authError) {
        console.warn("⚠️ Anonymous auth failed, continuing anyway:", authError);
      }
      
      // تحميل تكوين التطبيق
      await this.loadAppConfig();
      
      // تحميل بيانات المستخدم
      await this.loadUserData();
      
      // تحميل المهام
      await this.loadUserTasks();
      
      // تحميل Quests
      await this.loadQuestsData();
      
      // تحميل التاريخ
      await this.loadHistoryData();
      
      // عرض الواجهة
      this.renderUI();
      this.setupEventListeners();
      this.setupNavigation();
      
      this.isInitialized = true;
      console.log("🎉 App initialized successfully");
      
      // إخفاء شاشة التحميل
      setTimeout(() => {
        document.getElementById('app-loader').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        
        // عرض رسالة ترحيبية
        if (!this.userState.welcomed) {
          this.showNotification("Welcome", "Welcome to X BOSS APP!", "success");
          if (this.userState.id) {
            this.db.ref(`users/${this.userState.id}/welcomed`).set(true);
          }
        }
      }, 1000);
      
      // بدء الإعلانات
      this.startAdIntervals();
      
    } catch (error) {
      console.error("💥 Initialization failed:", error);
      this.showError("Failed to initialize app: " + error.message);
    }
  }

  // وضع المتصفح (للاختبار)
  setupBrowserMode() {
    console.log("🌐 Running in browser mode");
    
    // بيانات وهمية للاختبار
    this.tgUser = {
      id: Math.floor(Math.random() * 1000000000),
      first_name: "Test",
      last_name: "User",
      username: "testuser",
      photo_url: ""
    };
    
    // إظهار رسالة في المتصفح
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.innerHTML += `
        <div style="margin-top: 20px; padding: 10px; background: rgba(255,165,2,0.1); border-radius: 8px;">
          <p style="color: #ffa502; font-size: 0.9rem;">
            <i class="fas fa-info-circle"></i> Running in Browser Mode
          </p>
        </div>
      `;
    }
  }

  // تحميل تكوين التطبيق
  async loadAppConfig() {
    try {
      if (!this.db) throw new Error("Database not initialized");
      
      const configSnapshot = await this.db.ref('config').once('value');
      if (configSnapshot.exists()) {
        const config = configSnapshot.val();
        this.appConfig = { ...this.appConfig, ...config };
        console.log("📋 App config loaded:", config);
      } else {
        console.log("📋 Using default app config");
      }
    } catch (error) {
      console.error("Error loading app config:", error);
    }
  }

  // تحميل بيانات المستخدم
  async loadUserData() {
    try {
      if (!this.db) throw new Error("Database not initialized");
      
      console.log("📥 Loading user data for:", this.tgUser.id);
      
      const userRef = this.db.ref(`users/${this.tgUser.id}`);
      const snapshot = await userRef.once('value');
      let userData = snapshot.val();
      
      if (!userData) {
        console.log("👤 Creating new user...");
        
        const startParam = this.tg?.initDataUnsafe?.start_param;
        const referralId = (startParam && !isNaN(startParam)) ? startParam : null;
        
        userData = {
          id: this.tgUser.id,
          firstName: this.tgUser.first_name || '',
          lastName: this.tgUser.last_name || '',
          username: this.tgUser.username || '',
          photoUrl: this.tgUser.photo_url || '',
          balance: 0,
          gold: 1000, // إعطاء بعض GOLD للمستخدم الجديد للاختبار
          referrals: 0,
          referredBy: referralId,
          totalEarned: 0,
          totalTasks: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          referralEarnings: 0,
          activeReferrals: 0,
          createdAt: Date.now(),
          lastActive: Date.now(),
          welcomed: false
        };
        
        await userRef.set(userData);
        console.log("✅ New user created");
        
        if (referralId && referralId != this.tgUser.id) {
          await this.handleReferralBonus(referralId);
        }
      } else {
        console.log("✅ Existing user found");
        
        // تحديث آخر نشاط
        await userRef.update({ lastActive: Date.now() });
      }
      
      this.userState = userData;
      console.log("📊 User state loaded:", userData);
      
    } catch (error) {
      console.error("❌ Error loading user data:", error);
      throw error;
    }
  }

  // معالجة مكافأة الإحالة
  async handleReferralBonus(referralId) {
    try {
      const bonusAmount = 10; // 10 GOLD للمُحيل
      const referrerRef = this.db.ref(`users/${referralId}`);
      
      await referrerRef.update({
        gold: firebase.database.ServerValue.increment(bonusAmount),
        referrals: firebase.database.ServerValue.increment(1),
        activeReferrals: firebase.database.ServerValue.increment(1),
        referralEarnings: firebase.database.ServerValue.increment(bonusAmount)
      });
      
      console.log("🎁 Referral bonus given to:", referralId);
    } catch (error) {
      console.error("Error giving referral bonus:", error);
    }
  }

  // تحميل المهام
  async loadUserTasks() {
    try {
      if (!this.db) return;
      
      const tasksSnapshot = await this.db.ref('config/tasks').once('value');
      this.userTasks = [];
      
      if (tasksSnapshot.exists()) {
        tasksSnapshot.forEach(child => {
          this.userTasks.push({ id: child.key, ...child.val() });
        });
      }
      
      console.log(`📋 Loaded ${this.userTasks.length} tasks`);
      
    } catch (error) {
      console.error("Error loading user tasks:", error);
    }
  }

  // تحميل بيانات Quests
  async loadQuestsData() {
    try {
      if (!this.db) {
        this.questsState = {
          daily: {},
          tasks: { completed: 0, claimed: [] },
          friends: { invited: 0, claimed: [] },
          lastReset: new Date().toISOString().slice(0, 10)
        };
        return;
      }
      
      const questsSnapshot = await this.db.ref(`userQuests/${this.tgUser.id}`).once('value');
      
      if (questsSnapshot.exists()) {
        this.questsState = questsSnapshot.val();
      } else {
        this.questsState = {
          daily: {},
          tasks: { completed: 0, claimed: [] },
          friends: { invited: 0, claimed: [] },
          lastReset: new Date().toISOString().slice(0, 10)
        };
      }
      
      this.resetDailyQuestsIfNeeded();
      
    } catch (error) {
      console.error("Error loading quests data:", error);
      this.questsState = {
        daily: {},
        tasks: { completed: 0, claimed: [] },
        friends: { invited: 0, claimed: [] },
        lastReset: new Date().toISOString().slice(0, 10)
      };
    }
  }

  // إعادة تعيين Quests اليومية إذا لزم الأمر
  resetDailyQuestsIfNeeded() {
    const today = new Date().toISOString().slice(0, 10);
    
    if (this.questsState.lastReset !== today) {
      this.questsState.daily = {};
      this.questsState.lastReset = today;
      this.saveQuestsData();
    }
  }

  // حفظ بيانات Quests
  async saveQuestsData() {
    try {
      if (!this.db || !this.tgUser.id) return;
      
      await this.db.ref(`userQuests/${this.tgUser.id}`).set(this.questsState);
    } catch (error) {
      console.error("Error saving quests data:", error);
    }
  }

  // تحميل بيانات التاريخ
  async loadHistoryData() {
    try {
      if (!this.db) return;
      
      // تحميل سحب الأموال
      const statuses = ['pending', 'completed', 'rejected'];
      const withdrawalPromises = statuses.map(status => 
        this.db.ref(`withdrawals/${status}`).orderByChild('userId').equalTo(this.tgUser.id).once('value')
      );
      
      const withdrawalSnapshots = await Promise.all(withdrawalPromises);
      this.userWithdrawals = [];
      
      withdrawalSnapshots.forEach(snap => {
        snap.forEach(child => {
          this.userWithdrawals.push({ id: child.key, ...child.val() });
        });
      });
      
      this.userWithdrawals.sort((a, b) => (b.createdAt || b.timestamp) - (a.createdAt || a.timestamp));
      
      // تحميل الإيداعات
      const depositsSnapshot = await this.db.ref(`deposits/${this.tgUser.id}`).once('value');
      this.userDeposits = [];
      
      if (depositsSnapshot.exists()) {
        depositsSnapshot.forEach(child => {
          this.userDeposits.push({ id: child.key, ...child.val() });
        });
        
        this.userDeposits.sort((a, b) => b.timestamp - a.timestamp);
      }
      
      console.log(`📜 Loaded ${this.userWithdrawals.length} withdrawals and ${this.userDeposits.length} deposits`);
      
    } catch (error) {
      console.error("Error loading history data:", error);
    }
  }

  // تحديث الهيدر
  updateHeader() {
    const userPhoto = document.getElementById('user-photo');
    const userName = document.getElementById('user-name');
    const telegramId = document.getElementById('telegram-id-text');
    const goldBalance = document.getElementById('header-gold-balance');
    const tonBalance = document.getElementById('header-ton-balance');
    
    if (userPhoto) {
      userPhoto.src = this.userState.photoUrl || 'https://via.placeholder.com/50';
    }
    
    if (userName) {
      userName.textContent = this.userState.firstName || 'User';
    }
    
    if (telegramId) {
      telegramId.textContent = `ID: ${this.tgUser.id || 'N/A'}`;
    }
    
    if (goldBalance) {
      goldBalance.textContent = (this.userState.gold || 0).toFixed(0);
    }
    
    if (tonBalance) {
      tonBalance.textContent = (this.userState.balance || 0).toFixed(3);
    }
    
    // تحديث الإحصائيات في الصفحة الرئيسية
    const referralCount = document.getElementById('referral-count');
    const totalEarned = document.getElementById('total-earned');
    
    if (referralCount) {
      referralCount.textContent = this.userState.referrals || 0;
    }
    
    if (totalEarned) {
      totalEarned.textContent = (this.userState.totalEarned || 0).toFixed(0);
    }
  }

  // عرض الصفحة الرئيسية
  renderHomePage() {
    const homePage = document.getElementById('home-page');
    if (!homePage) return;
    
    homePage.innerHTML = `
      <div class="glass-card promo-card">
        <div class="promo-header">
          <div class="section-icon">
            <i class="fas fa-gift"></i>
          </div>
          <h3>Promo Code</h3>
        </div>
        <div class="promo-body">
          <input type="text" id="promoInput" placeholder="Enter promo code" />
          <button id="promo-btn">Claim</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <h3>Gold Balance</h3>
          <p id="gold-balance">${(this.userState.gold || 0).toFixed(0)}</p>
        </div>
        <div class="stat-card">
          <h3>TON Balance</h3>
          <p id="ton-balance">${(this.userState.balance || 0).toFixed(3)}</p>
        </div>
        <div class="stat-card">
          <h3>Referrals</h3>
          <p id="referral-count-home">${this.userState.referrals || 0}</p>
        </div>
        <div class="stat-card">
          <h3>Total Earned</h3>
          <p id="total-earned-home">${(this.userState.totalEarned || 0).toFixed(0)}</p>
        </div>
      </div>

      <div class="section-header">
        <div class="section-icon">
          <i class="fas fa-rocket"></i>
        </div>
        <h3>Quick Actions</h3>
      </div>
      
      <div id="quick-actions-container">
        <div class="quick-link-item" onclick="app.showAddTaskModal()">
          <div class="quick-link-icon" style="background: var(--gradient-primary); display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-plus" style="color: white; font-size: 1.2rem;"></i>
          </div>
          <div class="quick-link-content">
            <div class="quick-link-title">Add Task</div>
            <div class="quick-link-description">Create and promote your task</div>
          </div>
          <div class="quick-link-action">
            <button class="action-btn">Add</button>
          </div>
        </div>
        
        <div class="quick-link-item" onclick="app.showPage('wallet-page')">
          <div class="quick-link-icon" style="background: var(--gradient-primary); display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-wallet" style="color: white; font-size: 1.2rem;"></i>
          </div>
          <div class="quick-link-content">
            <div class="quick-link-title">Wallet</div>
            <div class="quick-link-description">Deposit & Withdraw funds</div>
          </div>
          <div class="quick-link-action">
            <button class="action-btn">Go</button>
          </div>
        </div>
      </div>
    `;
  }

  // عرض صفحة Quests
  renderQuestsPage() {
    const questsPage = document.getElementById('quests-page');
    if (!questsPage) return;
    
    questsPage.innerHTML = `
      <div class="quests-container">
        <div class="quest-category">
          <h3>Daily Quests</h3>
          <div id="daily-quests-container"></div>
        </div>
        
        <div class="quest-category">
          <h3>Tasks Quests</h3>
          <div id="tasks-quests-container"></div>
        </div>
        
        <div class="quest-category">
          <h3>Friends Quests</h3>
          <div id="friends-quests-container"></div>
        </div>
      </div>
    `;
    
    this.renderDailyQuests();
    this.renderTasksQuests();
    this.renderFriendsQuests();
  }

  // عرض Daily Quests
  renderDailyQuests() {
    const container = document.getElementById('daily-quests-container');
    if (!container) return;
    
    const dailyCheckinCompleted = this.questsState.daily?.checkin || false;
    const joinCommunityCompleted = this.questsState.daily?.community || false;
    
    container.innerHTML = `
      <div class="task-card ${dailyCheckinCompleted ? 'task-completed' : ''}">
        <div class="task-header">
          <div class="task-icon ${dailyCheckinCompleted ? 'completed' : ''}">
            <i class="fas fa-calendar-check"></i>
          </div>
          <div class="task-content">
            <h3 class="task-title">
              Daily Check-in
              ${dailyCheckinCompleted ? '<i class="fas fa-check-circle" style="color: var(--success); font-size: 0.9rem;"></i>' : ''}
            </h3>
            <p class="task-description">Claim your daily reward</p>
            <div class="task-reward">
              <span>Reward: 10</span>
              <img src="https://cdn-icons-png.flaticon.com/512/12533/12533956.png" style="width: 18px; height: 18px;">
            </div>
          </div>
        </div>
        <div class="task-action">
          <div class="task-status">
            <span>${dailyCheckinCompleted ? 'Claimed' : 'Available'}</span>
          </div>
          <button class="join-btn ${dailyCheckinCompleted ? 'completed' : ''}" 
                  id="daily-checkin-btn" 
                  ${dailyCheckinCompleted ? 'disabled' : ''}>
            ${dailyCheckinCompleted ? '<i class="fas fa-check"></i> Claimed' : '<i class="fas fa-gift"></i> Claim'}
          </button>
        </div>
      </div>

      <div class="task-card ${joinCommunityCompleted ? 'task-completed' : ''}">
        <div class="task-header">
          <div class="task-icon ${joinCommunityCompleted ? 'completed' : ''}">
            <i class="fas fa-users"></i>
          </div>
          <div class="task-content">
            <h3 class="task-title">
              Join Community Channel
              ${joinCommunityCompleted ? '<i class="fas fa-check-circle" style="color: var(--success); font-size: 0.9rem;"></i>' : ''}
            </h3>
            <p class="task-description">Join our community channel</p>
            <div class="task-reward">
              <span>Reward: 10</span>
              <img src="https://cdn-icons-png.flaticon.com/512/12533/12533956.png" style="width: 18px; height: 18px;">
            </div>
          </div>
        </div>
        <div class="task-action">
          <div class="task-status">
            <span>${joinCommunityCompleted ? 'Claimed' : 'Available'}</span>
          </div>
          <button class="join-btn ${joinCommunityCompleted ? 'completed' : ''}" 
                  id="join-community-btn" 
                  ${joinCommunityCompleted ? 'disabled' : ''}>
            ${joinCommunityCompleted ? '<i class="fas fa-check"></i> Claimed' : '<i class="fas fa-external-link-alt"></i> Join'}
          </button>
        </div>
      </div>
    `;
  }

  // عرض Tasks Quests
  renderTasksQuests() {
    const container = document.getElementById('tasks-quests-container');
    if (!container) return;
    
    const completedTasks = this.userState.totalTasks || 0;
    const claimedTasks = this.questsState.tasks?.claimed || [];
    
    let currentQuest = null;
    for (const quest of QUESTS.tasks) {
      if (!claimedTasks.includes(quest.target)) {
        currentQuest = quest;
        break;
      }
    }
    
    if (!currentQuest) {
      container.innerHTML = `
        <div class="no-data-message">
          <i class="fas fa-trophy"></i>
          <h3>All Quests Completed!</h3>
          <p>You have completed all tasks quests</p>
        </div>
      `;
      return;
    }
    
    const progress = Math.min(completedTasks / currentQuest.target * 100, 100);
    const isCompleted = completedTasks >= currentQuest.target;
    
    container.innerHTML = `
      <div class="task-card ${isCompleted ? 'task-completed' : ''}">
        <div class="task-header">
          <div class="task-icon ${isCompleted ? 'completed' : ''}">
            <i class="fas fa-tasks"></i>
          </div>
          <div class="task-content">
            <h3 class="task-title">
              ${currentQuest.title}
              ${isCompleted ? '<i class="fas fa-check-circle" style="color: var(--success); font-size: 0.9rem;"></i>' : ''}
            </h3>
            <p class="task-description">Complete tasks to earn rewards</p>
            <div class="task-reward">
              <span>Reward: ${currentQuest.reward.toLocaleString()}</span>
              <img src="https://cdn-icons-png.flaticon.com/512/12533/12533956.png" style="width: 18px; height: 18px;">
            </div>
          </div>
        </div>
        <div class="task-progress">
          <div class="task-progress-info">
            <span>Progress: ${completedTasks}/${currentQuest.target}</span>
            <span>${progress.toFixed(0)}%</span>
          </div>
          <div class="task-progress-bar-container">
            <div class="task-progress-bar-fill" style="width: ${progress}%"></div>
          </div>
        </div>
        <div class="task-action">
          <div class="task-status">
            <span>${isCompleted ? 'Ready to Claim' : 'In Progress'}</span>
          </div>
          <button class="join-btn ${isCompleted ? 'success' : ''}" 
                  id="tasks-quest-btn" 
                  data-target="${currentQuest.target}"
                  data-reward="${currentQuest.reward}"
                  ${!isCompleted ? 'disabled' : ''}>
            ${isCompleted ? '<i class="fas fa-gift"></i> Claim Reward' : '<i class="fas fa-spinner"></i> In Progress'}
          </button>
        </div>
      </div>
    `;
  }

  // عرض Friends Quests
  renderFriendsQuests() {
    const container = document.getElementById('friends-quests-container');
    if (!container) return;
    
    const invitedFriends = this.userState.referrals || 0;
    const claimedFriends = this.questsState.friends?.claimed || [];
    
    let currentQuest = null;
    for (const quest of QUESTS.friends) {
      if (!claimedFriends.includes(quest.target)) {
        currentQuest = quest;
        break;
      }
    }
    
    if (!currentQuest) {
      container.innerHTML = `
        <div class="no-data-message">
          <i class="fas fa-trophy"></i>
          <h3>All Quests Completed!</h3>
          <p>You have completed all friends quests</p>
        </div>
      `;
      return;
    }
    
    const progress = Math.min(invitedFriends / currentQuest.target * 100, 100);
    const isCompleted = invitedFriends >= currentQuest.target;
    
    container.innerHTML = `
      <div class="task-card ${isCompleted ? 'task-completed' : ''}">
        <div class="task-header">
          <div class="task-icon ${isCompleted ? 'completed' : ''}">
            <i class="fas fa-users"></i>
          </div>
          <div class="task-content">
            <h3 class="task-title">
              ${currentQuest.title}
              ${isCompleted ? '<i class="fas fa-check-circle" style="color: var(--success); font-size: 0.9rem;"></i>' : ''}
            </h3>
            <p class="task-description">Invite friends to earn rewards</p>
            <div class="task-reward">
              <span>Reward: ${currentQuest.reward.toLocaleString()}</span>
              <img src="https://cdn-icons-png.flaticon.com/512/12533/12533956.png" style="width: 18px; height: 18px;">
            </div>
          </div>
        </div>
        <div class="task-progress">
          <div class="task-progress-info">
            <span>Progress: ${invitedFriends}/${currentQuest.target}</span>
            <span>${progress.toFixed(0)}%</span>
          </div>
          <div class="task-progress-bar-container">
            <div class="task-progress-bar-fill" style="width: ${progress}%"></div>
          </div>
        </div>
        <div class="task-action">
          <div class="task-status">
            <span>${isCompleted ? 'Ready to Claim' : 'In Progress'}</span>
          </div>
          <button class="join-btn ${isCompleted ? 'success' : ''}" 
                  id="friends-quest-btn" 
                  data-target="${currentQuest.target}"
                  data-reward="${currentQuest.reward}"
                  ${!isCompleted ? 'disabled' : ''}>
            ${isCompleted ? '<i class="fas fa-gift"></i> Claim Reward' : '<i class="fas fa-spinner"></i> In Progress'}
          </button>
        </div>
      </div>
    `;
  }

  // عرض صفحة المحفظة
  renderWalletPage() {
    const walletPage = document.getElementById('wallet-page');
    if (!walletPage) return;
    
    walletPage.innerHTML = `
      <div class="wallet-section">
        <div class="deposit-card">
          <div class="section-header">
            <div class="section-icon">
              <i class="fas fa-wallet"></i>
            </div>
            <h3>Deposit TON</h3>
          </div>
          
          <div class="deposit-address-container">
            <div class="address-label">Deposit Address:</div>
            <div class="address-display">
              <span class="address-value" id="wallet-address">${this.appConfig.walletAddress}</span>
              <button class="copy-btn" onclick="app.copyToClipboard('wallet-address')">
                <i class="far fa-copy"></i>
              </button>
            </div>
            
            <div class="address-label">Memo Code:</div>
            <div class="address-display">
              <span class="address-value" id="memo-code">${this.tgUser.id}</span>
              <button class="copy-btn" onclick="app.copyToClipboard('memo-code')">
                <i class="far fa-copy"></i>
              </button>
            </div>
          </div>
          
          <a href="${this.appConfig.tonkeeperLink}${this.tgUser.id}" target="_blank" class="action-btn success">
            <i class="fas fa-external-link-alt"></i> Deposit By Tonkeeper
          </a>
          
          <div class="warning-note">
            <strong>Important Notes:</strong>
            <ul>
              <li>The Deposit Process Takes 1 Minute ~ 24 Hours.</li>
              <li>You Must Add "Memo Code".</li>
              <li>Minimum Deposit: ${this.appConfig.minimumDeposit} TON.</li>
            </ul>
          </div>
        </div>
        
        <div class="withdraw-card">
          <div class="section-header">
            <div class="section-icon">
              <i class="fas fa-money-bill-wave"></i>
            </div>
            <h3>Withdraw TON</h3>
          </div>
          
          <div class="withdrawal-options">
            ${WITHDRAWAL_OPTIONS.map((option, index) => `
              <div class="withdrawal-option" data-index="${index}" onclick="app.selectWithdrawalOption(${index})">
                <div class="option-gold">${option.gold.toLocaleString()} GOLD</div>
                <div class="option-ton">≈ ${option.ton.toFixed(2)} TON</div>
                <div class="option-label">${option.label}</div>
              </div>
            `).join('')}
          </div>
          
          <form id="withdraw-form">
            <div class="form-group">
              <label for="wallet-address-input">TON Wallet Address</label>
              <input type="text" id="wallet-address-input" class="form-input" placeholder="Enter your TON wallet" required>
            </div>
            <button type="submit" id="withdraw-submit-btn" class="action-btn">
              Confirm Withdrawal
            </button>
          </form>
        </div>
        
        <div class="section-header">
          <div class="section-icon">
            <i class="fas fa-history"></i>
          </div>
          <h3>Transaction History</h3>
        </div>
        
        <div id="transaction-history-tabs">
          <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <button class="action-btn" onclick="app.showHistoryTab('deposit')">Deposits</button>
            <button class="action-btn" onclick="app.showHistoryTab('withdrawal')">Withdrawals</button>
          </div>
          <div id="transaction-history-list"></div>
        </div>
      </div>
    `;
    
    this.renderTransactionHistory('deposit');
  }

  // عرض تاريخ المعاملات
  renderTransactionHistory(type) {
    const container = document.getElementById('transaction-history-list');
    if (!container) return;
    
    const transactions = type === 'deposit' ? this.userDeposits : this.userWithdrawals;
    
    if (transactions.length === 0) {
      container.innerHTML = `
        <div class="no-data-message">
          <i class="fas fa-history"></i>
          <h3>No ${type} History</h3>
          <p>Your ${type} history will appear here</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = transactions.map(transaction => {
      const date = new Date(transaction.timestamp || transaction.createdAt);
      const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
      
      let amountDisplay = '';
      let statusClass = '';
      
      if (type === 'deposit') {
        amountDisplay = `+${transaction.amount} TON`;
        statusClass = 'status-deposit';
      } else {
        amountDisplay = `-${transaction.amount} TON`;
        statusClass = `status-${transaction.status}`;
      }
      
      return `
        <div class="history-item">
          <div class="history-info">
            <div class="history-amount">${amountDisplay}</div>
            <div class="history-details">
              <span>${formattedDate}</span>
              <span>${transaction.txid ? `TX: ${transaction.txid.substring(0, 8)}...` : ''}</span>
            </div>
          </div>
          <span class="history-status ${statusClass}">${transaction.status || 'pending'}</span>
        </div>
      `;
    }).join('');
  }

  // عرض صفحة الإحالات
  renderReferralsPage() {
    const referralsPage = document.getElementById('referrals-page');
    if (!referralsPage) return;
    
    const referralLink = `https://t.me/${this.appConfig.botUsername || 'x_boss_bot'}/?startapp=${this.tgUser.id}`;
    
    referralsPage.innerHTML = `
      <div class="referral-stats-grid">
        <div class="referral-stat-card">
          <h3>Total Referrals</h3>
          <p id="referrals-total-count">${this.userState.referrals || 0}</p>
        </div>
        <div class="referral-stat-card">
          <h3>Referral Earnings</h3>
          <p id="referrals-total-earnings">${(this.userState.referralEarnings || 0).toFixed(0)}</p>
        </div>
      </div>

      <div class="glass-card">
        <div class="section-header">
          <div class="section-icon">
            <i class="fas fa-share-alt"></i>
          </div>
          <h3>Your Referral Link</h3>
        </div>
        <div class="referral-link-container">
          <div class="referral-link-input">
            <input type="text" id="referral-link-input" value="${referralLink}" readonly>
            <button id="copy-referral-link-btn" class="action-btn">Copy</button>
          </div>
        </div>
      </div>

      <div class="section-header">
        <div class="section-icon">
          <i class="fas fa-users"></i>
        </div>
        <h3>Referral Benefits</h3>
      </div>
      
      <div class="glass-card">
        <div class="benefit-item" style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px; padding: 12px; background: rgba(0, 136, 204, 0.1); border-radius: 12px;">
          <i class="fas fa-gift" style="color: var(--primary-color); font-size: 1.2rem;"></i>
          <div>
            <strong style="color: var(--text-primary-dark);">UP TO 100% from referrals</strong>
            <p style="color: var(--text-secondary-dark); font-size: 0.85rem; margin: 0;">Get up to 100% commission from all your referrals earnings</p>
          </div>
        </div>
        
        <div class="benefit-item" style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px; padding: 12px; background: rgba(0, 136, 204, 0.1); border-radius: 12px;">
          <i class="fas fa-bolt" style="color: var(--primary-color); font-size: 1.2rem;"></i>
          <div>
            <strong style="color: var(--text-primary-dark);">Instant Bonuses</strong>
            <p style="color: var(--text-secondary-dark); font-size: 0.85rem; margin: 0;">Receive bonuses immediately when your referrals complete tasks</p>
          </div>
        </div>
        
        <div class="benefit-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(0, 136, 204, 0.1); border-radius: 12px;">
          <i class="fas fa-chart-line" style="color: var(--primary-color); font-size: 1.2rem;"></i>
          <div>
            <strong style="color: var(--text-primary-dark);">Unlimited Earnings</strong>
            <p style="color: var(--text-secondary-dark); font-size: 0.85rem; margin: 0;">No limits on how many referrals you can have or how much you can earn</p>
          </div>
        </div>
      </div>
    `;
  }

  // عرض الواجهة
  renderUI() {
    this.updateHeader();
    this.renderHomePage();
    this.renderQuestsPage();
    this.renderWalletPage();
    this.renderReferralsPage();
  }

  // التبديل بين الصفحات
  showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    const navButtons = document.querySelectorAll('.nav-btn');
    
    pages.forEach(page => page.classList.remove('active'));
    navButtons.forEach(btn => btn.classList.remove('active'));
    
    const targetPage = document.getElementById(pageId);
    const targetButton = document.querySelector(`[data-page="${pageId}"]`);
    
    if (targetPage) targetPage.classList.add('active');
    if (targetButton) targetButton.classList.add('active');
    
    if (pageId === 'wallet-page') {
      this.renderTransactionHistory('deposit');
    }
  }

  // عرض علامة تبويب التاريخ
  showHistoryTab(type) {
    this.renderTransactionHistory(type);
  }

  // اختيار خيار السحب
  selectWithdrawalOption(index) {
    const options = document.querySelectorAll('.withdrawal-option');
    options.forEach(option => option.classList.remove('selected'));
    
    if (options[index]) {
      options[index].classList.add('selected');
    }
    
    this.selectedWithdrawal = WITHDRAWAL_OPTIONS[index];
  }

  // تطبيق كود الترويج
  async applyPromoCode() {
    const input = document.getElementById('promoInput');
    if (!input) return;
    
    const code = input.value.trim().toUpperCase();
    
    if (!code) {
      this.showNotification("Promo Code", "Please enter a promo code", "warning");
      return;
    }
    
    const cooldown = this.checkCooldown('promo', this.tgUser.id);
    if (!cooldown.allowed) {
      this.showNotification("Cooldown", `Please wait ${cooldown.remaining} seconds`, "warning");
      return;
    }
    
    if (!this.validateInput(code, 'promo')) {
      this.showNotification("Promo Code", "Invalid promo code format", "error");
      return;
    }
    
    try {
      // البحث عن كود الترويج
      const promoCodesSnapshot = await this.db.ref('config/promoCodes').once('value');
      const promoCodes = promoCodesSnapshot.val() || {};
      
      let promoData = null;
      let promoId = null;
      
      for (const id in promoCodes) {
        if (promoCodes[id].code === code) {
          promoData = promoCodes[id];
          promoId = id;
          break;
        }
      }
      
      if (!promoData) {
        this.showNotification("Promo Code", "Invalid promo code", "error");
        return;
      }
      
      // التحقق إذا كان المستخدم قد استخدم الكود مسبقاً
      const usedRef = this.db.ref(`usedPromoCodes/${this.tgUser.id}/${promoId}`);
      const usedSnapshot = await usedRef.once('value');
      
      if (usedSnapshot.exists()) {
        this.showNotification("Promo Code", "You have already used this code", "error");
        return;
      }
      
      // عرض إعلان
      await this.runPromoAd();
      
      // تطبيق المكافأة
      const reward = promoData.reward;
      const type = promoData.type || 'gold';
      
      const updates = {};
      if (type === 'ton') {
        updates.balance = firebase.database.ServerValue.increment(reward);
      } else {
        updates.gold = firebase.database.ServerValue.increment(reward);
      }
      
      await this.db.ref(`users/${this.tgUser.id}`).update(updates);
      
      // تحديث حالة المستخدم
      if (type === 'ton') {
        this.userState.balance += reward;
      } else {
        this.userState.gold += reward;
      }
      
      // تسجيل استخدام الكود
      await usedRef.set({
        usedAt: Date.now(),
        reward: reward,
        type: type,
        code: code
      });
      
      // تحديث عدد مرات الاستخدام
      await this.db.ref(`config/promoCodes/${promoId}/usedCount`).transaction(current => (current || 0) + 1);
      
      // تحديث الواجهة
      this.updateHeader();
      input.value = '';
      
      this.showNotification("Success", `Promo code applied! +${reward} ${type.toUpperCase()}`, "success");
      
    } catch (error) {
      console.error("Error applying promo code:", error);
      this.showNotification("Error", "Failed to apply promo code", "error");
    }
  }

  // معالجة Daily Check-in
  async handleDailyCheckin() {
    const cooldown = this.checkCooldown('daily_checkin', this.tgUser.id);
    if (!cooldown.allowed) {
      this.showNotification("Cooldown", `Please wait ${cooldown.remaining} seconds`, "warning");
      return;
    }
    
    try {
      // عرض إعلان
      await this.runPromoAd();
      
      // تحديث حالة Quest
      this.questsState.daily.checkin = true;
      await this.saveQuestsData();
      
      // تحديث رصيد المستخدم
      await this.db.ref(`users/${this.tgUser.id}`).update({
        gold: firebase.database.ServerValue.increment(10),
        totalEarned: firebase.database.ServerValue.increment(10)
      });
      
      this.userState.gold += 10;
      this.userState.totalEarned += 10;
      
      // تحديث الواجهة
      this.updateHeader();
      this.renderDailyQuests();
      
      this.showNotification("Success", "Daily check-in completed! +10 GOLD", "success");
      
    } catch (error) {
      console.error("Error in daily checkin:", error);
      this.showNotification("Error", "Failed to complete check-in", "error");
    }
  }

  // معالجة Join Community
  async handleJoinCommunity() {
    const cooldown = this.checkCooldown('join_community', this.tgUser.id);
    if (!cooldown.allowed) {
      this.showNotification("Cooldown", `Please wait ${cooldown.remaining} seconds`, "warning");
      return;
    }
    
    // فتح رابط المجتمع
    if (this.tg && this.tg.openLink) {
      this.tg.openLink(this.appConfig.communityLink);
    } else {
      window.open(this.appConfig.communityLink, '_blank');
    }
    
    this.showLoadingPopup("Checking...", "Please wait 10 seconds to verify");
    
    setTimeout(async () => {
      try {
        this.closePopup();
        
        // تحديث حالة Quest
        this.questsState.daily.community = true;
        await this.saveQuestsData();
        
        // تحديث رصيد المستخدم
        await this.db.ref(`users/${this.tgUser.id}`).update({
          gold: firebase.database.ServerValue.increment(10),
          totalEarned: firebase.database.ServerValue.increment(10)
        });
        
        this.userState.gold += 10;
        this.userState.totalEarned += 10;
        
        // تحديث الواجهة
        this.updateHeader();
        this.renderDailyQuests();
        
        this.showNotification("Success", "Community joined! +10 GOLD", "success");
        
      } catch (error) {
        console.error("Error in join community:", error);
        this.showNotification("Error", "Failed to claim reward", "error");
      }
    }, 10000);
  }

  // معالجة Tasks Quest
  async handleTasksQuest() {
    const btn = document.getElementById('tasks-quest-btn');
    if (!btn) return;
    
    const target = parseInt(btn.dataset.target);
    const reward = parseInt(btn.dataset.reward);
    
    const cooldown = this.checkCooldown('tasks_quest', this.tgUser.id);
    if (!cooldown.allowed) {
      this.showNotification("Cooldown", `Please wait ${cooldown.remaining} seconds`, "warning");
      return;
    }
    
    try {
      if (!this.questsState.tasks.claimed) this.questsState.tasks.claimed = [];
      this.questsState.tasks.claimed.push(target);
      await this.saveQuestsData();
      
      await this.db.ref(`users/${this.tgUser.id}`).update({
        gold: firebase.database.ServerValue.increment(reward),
        totalEarned: firebase.database.ServerValue.increment(reward)
      });
      
      this.userState.gold += reward;
      this.userState.totalEarned += reward;
      
      this.updateHeader();
      this.renderTasksQuests();
      
      this.showNotification("Success", `Quest completed! +${reward.toLocaleString()} GOLD`, "success");
      
    } catch (error) {
      console.error("Error in tasks quest:", error);
      this.showNotification("Error", "Failed to claim reward", "error");
    }
  }

  // معالجة Friends Quest
  async handleFriendsQuest() {
    const btn = document.getElementById('friends-quest-btn');
    if (!btn) return;
    
    const target = parseInt(btn.dataset.target);
    const reward = parseInt(btn.dataset.reward);
    
    const cooldown = this.checkCooldown('friends_quest', this.tgUser.id);
    if (!cooldown.allowed) {
      this.showNotification("Cooldown", `Please wait ${cooldown.remaining} seconds`, "warning");
      return;
    }
    
    try {
      if (!this.questsState.friends.claimed) this.questsState.friends.claimed = [];
      this.questsState.friends.claimed.push(target);
      await this.saveQuestsData();
      
      await this.db.ref(`users/${this.tgUser.id}`).update({
        gold: firebase.database.ServerValue.increment(reward),
        totalEarned: firebase.database.ServerValue.increment(reward)
      });
      
      this.userState.gold += reward;
      this.userState.totalEarned += reward;
      
      this.updateHeader();
      this.renderFriendsQuests();
      
      this.showNotification("Success", `Quest completed! +${reward.toLocaleString()} GOLD`, "success");
      
    } catch (error) {
      console.error("Error in friends quest:", error);
      this.showNotification("Error", "Failed to claim reward", "error");
    }
  }

  // معالجة السحب
  async handleWithdrawal(e) {
    e.preventDefault();
    
    if (!this.selectedWithdrawal) {
      this.showNotification("Withdrawal", "Please select an amount", "warning");
      return;
    }
    
    const walletInput = document.getElementById('wallet-address-input');
    if (!walletInput) return;
    
    const walletAddress = walletInput.value.trim();
    
    if (!this.validateInput(walletAddress, 'wallet')) {
      this.showNotification("Withdrawal", "Invalid wallet address", "error");
      return;
    }
    
    const cooldown = this.checkCooldown('withdrawal', this.tgUser.id);
    if (!cooldown.allowed) {
      this.showNotification("Cooldown", `Please wait ${cooldown.remaining} seconds`, "warning");
      return;
    }
    
    if ((this.userState.gold || 0) < this.selectedWithdrawal.gold) {
      this.showNotification("Withdrawal", "Insufficient GOLD balance", "error");
      return;
    }
    
    const btn = document.getElementById('withdraw-submit-btn');
    if (!btn) return;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
      // خصم GOLD من رصيد المستخدم
      await this.db.ref(`users/${this.tgUser.id}`).update({
        gold: firebase.database.ServerValue.increment(-this.selectedWithdrawal.gold)
      });
      
      // إنشاء طلب السحب
      const requestData = {
        userId: this.tgUser.id,
        userName: this.userState.firstName,
        walletAddress: walletAddress,
        goldAmount: this.selectedWithdrawal.gold,
        tonAmount: this.selectedWithdrawal.ton,
        status: 'pending',
        createdAt: Date.now()
      };
      
      await this.db.ref('withdrawals/pending').push(requestData);
      
      // تحديث حالة المستخدم
      this.userState.gold -= this.selectedWithdrawal.gold;
      this.updateHeader();
      
      this.showNotification("Success", "Withdrawal request submitted!", "success");
      
      // إعادة تعيين النموذج
      const form = document.getElementById('withdraw-form');
      if (form) form.reset();
      
      document.querySelectorAll('.withdrawal-option').forEach(opt => opt.classList.remove('selected'));
      this.selectedWithdrawal = null;
      
      // تحديث التاريخ
      await this.loadHistoryData();
      this.renderTransactionHistory('withdrawal');
      
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      this.showNotification("Error", "Failed to process withdrawal", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Confirm Withdrawal';
    }
  }

  // نسخ إلى الحافظة
  copyToClipboard(textOrElementId) {
    let text;
    
    if (typeof textOrElementId === 'string') {
      const element = document.getElementById(textOrElementId);
      text = element ? element.textContent || element.value : textOrElementId;
    } else {
      text = textOrElementId;
    }
    
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
      this.showNotification("Copied", "Text copied to clipboard", "success");
    }).catch(() => {
      // الطريقة القديمة كاحتياطي
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showNotification("Copied", "Text copied to clipboard", "success");
    });
  }

  // عرض نافذة Add Task
  showAddTaskModal() {
    const modalHTML = `
      <div class="modal-overlay" id="add-task-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Add New Task</h2>
            <button class="close-modal" onclick="app.closeModal()">&times;</button>
          </div>
          
          <form id="add-task-form">
            <div class="form-group">
              <label for="task-name">Task Name</label>
              <input type="text" id="task-name" class="form-input" placeholder="Enter Your Task Name" required>
            </div>
            
            <div class="form-group">
              <label for="task-type">Task Type</label>
              <select id="task-type" class="select-input" required>
                <option value="">Choose</option>
                <option value="group">Group/Channel</option>
                <option value="bot">Bot</option>
                <option value="other">Other Links</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="task-link">Task Link</label>
              <input type="text" id="task-link" class="form-input" placeholder="Enter Your Task Link" required>
            </div>
            
            <div class="form-group">
              <label for="task-users">Total Users</label>
              <select id="task-users" class="select-input" required>
                <option value="">Choose</option>
                <option value="500">500 users - 0.50 TON</option>
                <option value="1000">1000 users - 1.00 TON</option>
                <option value="3000">3000 users - 3.00 TON</option>
                <option value="5000">5000 users - 5.00 TON</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Total Cost</label>
              <div style="background: var(--surface-dark); padding: 15px; border-radius: 12px; text-align: center; font-size: 1.5rem; font-weight: 700; color: var(--primary-color);">
                <span id="total-cost">0.00</span> TON
              </div>
            </div>
            
            <button type="submit" id="add-task-btn" class="action-btn success" disabled>
              <i class="fas fa-plus"></i> Add Task
            </button>
            
            <div id="add-task-message" style="margin-top: 15px;"></div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // إعداد حدث تغيير عدد المستخدمين
    const taskUsers = document.getElementById('task-users');
    const totalCost = document.getElementById('total-cost');
    const addTaskBtn = document.getElementById('add-task-btn');
    
    if (taskUsers && totalCost && addTaskBtn) {
      taskUsers.addEventListener('change', (e) => {
        const users = parseInt(e.target.value);
        if (users && TASK_PRICES[users]) {
          totalCost.textContent = TASK_PRICES[users].toFixed(2);
          
          const cost = TASK_PRICES[users];
          const balance = this.userState.balance || 0;
          
          if (balance >= cost) {
            addTaskBtn.disabled = false;
            const messageDiv = document.getElementById('add-task-message');
            if (messageDiv) messageDiv.innerHTML = '';
          } else {
            addTaskBtn.disabled = true;
            const messageDiv = document.getElementById('add-task-message');
            if (messageDiv) {
              messageDiv.innerHTML = `
                <div class="warning-note">
                  <i class="fas fa-exclamation-triangle"></i>
                  Insufficient Balance. You need ${cost.toFixed(2)} TON
                </div>
              `;
            }
          }
        }
      });
    }
    
    // إعداد حدث إرسال النموذج
    const form = document.getElementById('add-task-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddTask();
      });
    }
  }

  // معالجة إضافة المهمة
  async handleAddTask() {
    try {
      const name = document.getElementById('task-name').value;
      const type = document.getElementById('task-type').value;
      const link = document.getElementById('task-link').value;
      const users = parseInt(document.getElementById('task-users').value);
      
      if (!name || !type || !link || !users) {
        this.showNotification("Error", "Please fill all fields", "error");
        return;
      }
      
      if (!this.validateInput(link, 'url')) {
        this.showNotification("Error", "Invalid task link", "error");
        return;
      }
      
      const cost = TASK_PRICES[users];
      if ((this.userState.balance || 0) < cost) {
        this.showNotification("Error", "Insufficient balance", "error");
        return;
      }
      
      const taskData = {
        name: name,
        type: type,
        url: link,
        maxCompletions: users,
        reward: Math.floor(users * 0.5), // 0.5 GOLD لكل مستخدم
        createdBy: this.tgUser.id,
        createdByName: this.userState.firstName,
        status: 'active',
        currentCompletions: 0,
        createdAt: Date.now()
      };
      
      await this.db.ref('config/tasks').push(taskData);
      
      // خصم التكلفة من رصيد المستخدم
      await this.db.ref(`users/${this.tgUser.id}`).update({
        balance: firebase.database.ServerValue.increment(-cost),
        totalTasks: firebase.database.ServerValue.increment(1)
      });
      
      this.userState.balance -= cost;
      this.userState.totalTasks = (this.userState.totalTasks || 0) + 1;
      
      this.updateHeader();
      
      this.showNotification("Success", "Task added successfully!", "success");
      
      // إغلاق النافذة
      this.closeModal();
      
    } catch (error) {
      console.error("Error adding task:", error);
      this.showNotification("Error", "Failed to add task", "error");
    }
  }

  // إغلاق النافذة المنبثقة
  closeModal() {
    const modal = document.getElementById('add-task-modal');
    if (modal) modal.remove();
  }

  // عرض نافذة التحميل
  showLoadingPopup(title, message) {
    const popup = document.getElementById('popup');
    const popupBody = document.getElementById('popup-body');
    
    if (!popup || !popupBody) return;
    
    popupBody.innerHTML = `
      <div style="text-align: center;">
        <div class="spinner" style="margin: 0 auto 20px;"></div>
        <h2>${title}</h2>
        <p>${message}</p>
      </div>
    `;
    
    popup.style.display = 'flex';
  }

  // إغلاق النافذة المنبثقة
  closePopup() {
    const popup = document.getElementById('popup');
    if (popup) popup.style.display = 'none';
  }

  // عرض الإشعار
  showNotification(title, message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notificationId = `notification-${Date.now()}`;
    
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.className = `notification ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    
    notification.innerHTML = `
      <div class="notification-icon">
        <i class="fas ${icon}"></i>
      </div>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
      </div>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
      const notif = document.getElementById(notificationId);
      if (notif) {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(-20px)';
        setTimeout(() => notif.remove(), 300);
      }
    }, 5000);
  }

  // عرض رسالة خطأ
  showError(message) {
    console.error("Showing error:", message);
    
    document.body.innerHTML = `
      <div style="
        background: var(--background-dark);
        color: var(--text-primary-dark);
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: 'Poppins', sans-serif;
        padding: 20px;
        text-align: center;
      ">
        <div style="
          background: rgba(17, 43, 66, 0.9);
          border-radius: 20px;
          padding: 40px 30px;
          width: 85%;
          max-width: 330px;
          border: 1px solid rgba(0, 136, 204, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        ">
          <div style="margin-bottom: 24px;">
            <div style="
              width: 80px;
              height: 80px;
              margin: 0 auto;
              background: linear-gradient(135deg, #0088cc 0%, #00a8e8 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 2rem;
              color: white;
            ">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
          </div>
          <h2 style="
            font-size: 1.3rem;
            font-weight: 700;
            color: #FFFFFF;
            margin-bottom: 15px;
          ">Initialization Error</h2>
          <p style="
            color: #89b4d6;
            font-size: 0.9rem;
            line-height: 1.5;
            margin-bottom: 20px;
          ">${message}</p>
          <div style="margin-top: 20px;">
            <button onclick="location.reload()" style="
              background: linear-gradient(135deg, #0088cc 0%, #00a8e8 100%);
              color: white;
              border: none;
              border-radius: 12px;
              padding: 12px 24px;
              font-size: 0.9rem;
              font-weight: 600;
              cursor: pointer;
              width: 100%;
            ">
              <i class="fas fa-redo"></i> Reload Application
            </button>
          </div>
          <p style="color: #666; font-size: 0.8rem; margin-top: 15px;">
            If error persists, please contact support
          </p>
        </div>
      </div>
    `;
  }

  // إعداد المستمعين للأحداث
  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.id === 'promo-btn' || e.target.closest('#promo-btn')) {
        this.applyPromoCode();
      }
      
      if (e.target.id === 'daily-checkin-btn' || e.target.closest('#daily-checkin-btn')) {
        this.handleDailyCheckin();
      }
      
      if (e.target.id === 'join-community-btn' || e.target.closest('#join-community-btn')) {
        this.handleJoinCommunity();
      }
      
      if (e.target.id === 'tasks-quest-btn' || e.target.closest('#tasks-quest-btn')) {
        this.handleTasksQuest();
      }
      
      if (e.target.id === 'friends-quest-btn' || e.target.closest('#friends-quest-btn')) {
        this.handleFriendsQuest();
      }
      
      if (e.target.id === 'copy-referral-link-btn' || e.target.closest('#copy-referral-link-btn')) {
        const linkInput = document.getElementById('referral-link-input');
        if (linkInput) {
          this.copyToClipboard(linkInput.value);
        }
      }
    });
    
    const withdrawForm = document.getElementById('withdraw-form');
    if (withdrawForm) {
      withdrawForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleWithdrawal(e);
      });
    }
  }

  // إعداد التنقل
  setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const pageId = e.currentTarget.dataset.page;
        this.showPage(pageId);
      });
    });
  }

  // بدء فترات الإعلانات
  startAdIntervals() {
    // تأخير عرض أول إعلان
    setTimeout(() => {
      this.runPromoAd().catch(() => {
        console.log("Ad not shown (first interval)");
      });
    }, 30000);
    
    // عرض إعلان كل 100 ثانية
    this.adInterval = setInterval(() => {
      this.adCounter++;
      if (this.adCounter % 3 === 0) {
        this.runPromoAd().catch(() => {
          console.log("Ad not shown (interval)");
        });
      }
    }, 100000);
  }

  // تشغيل إعلان الترويج
  async runPromoAd() {
    return new Promise((resolve, reject) => {
      if (!this.appConfig.adZoneId) {
        resolve(true);
        return;
      }
      
      const adFunction = window[`show_${this.appConfig.adZoneId}`];
      if (typeof adFunction !== 'function') {
        resolve(true);
        return;
      }
      
      try {
        // عرض نافذة التحميل
        this.showLoadingPopup("Advertisement", "Please watch the ad...");
        
        // تشغيل الإعلان
        adFunction();
        
        // إغلاق النافذة بعد 3 ثواني
        setTimeout(() => {
          this.closePopup();
          resolve(true);
        }, 3000);
        
      } catch (error) {
        console.error("Ad error:", error);
        this.closePopup();
        resolve(true);
      }
    });
  }
}

// إنشاء وتشغيل التطبيق
let app;

document.addEventListener('DOMContentLoaded', () => {
  console.log("📱 DOM loaded, initializing app...");
  
  app = new XBossApp();
  window.app = app;
  
  setTimeout(() => {
    app.initialize();
  }, 500);
});
