const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBzD_BXXDGhBDrZOo3bT-JGPS_Wy2ZDJn8",
  authDomain: "ton-hub-test.firebaseapp.com",
  databaseURL: "https://ton-hub-test-default-rtdb.firebaseio.com",
  projectId: "ton-hub-test",
  storageBucket: "ton-hub-test.firebasestorage.app",
  messagingSenderId: "385199729501",
  appId: "1:385199729501:web:5025e8b979fc2b984f56b4",
  measurementId: "G-2FVGQDMJ12"
};

const ADMIN_PASSWORDS = ["Mostafa$500"];

const APP_DEFAULT_CONFIG = {
  appName: "Ninja TON Admin",
  botUsername: "NinjaTONS_Bot",
  botToken: "8315477063:AAFztM82m2p0Md03SYNWUB9SJ6cN_EMGcI4",
  walletAddress: "UQCMATcdykmpWDSLdI5ob-NScl55FSna3OOVy1l3i_2ICcPZ",
  minimumWithdraw: 0.10,
  minimumDeposit: 0.10,
  exchangeRate: 10000,
  welcomeMessage: "Welcome to Ninja TON!",
  communityLink: "https://t.me/tonhubnews",
  
  taskPrices: {
    100: 0.001,
    250: 0.002,
    500: 0.005,
    1000: 0.010,
    2500: 0.025,
    5000: 0.050
  },
  
  withdrawalOptions: [
    { amount: 0.10, label: "0.10 TON" },
    { amount: 0.50, label: "0.50 TON" },
    { amount: 1.00, label: "1.00 TON" },
    { amount: 5.00, label: "5.00 TON" }
  ],
  
  diceQuests: [
    { target: 1000, reward: 0.01 },
    { target: 2000, reward: 0.02 },
    { target: 4000, reward: 0.04 },
    { target: 8000, reward: 0.08 },
    { target: 16000, reward: 0.16 },
    { target: 32000, reward: 0.32 },
    { target: 64000, reward: 0.64 }
  ],
  
  tasksQuests: [
    { target: 10, reward: 0.01 },
    { target: 20, reward: 0.02 },
    { target: 40, reward: 0.04 },
    { target: 80, reward: 0.08 },
    { target: 160, reward: 0.16 },
    { target: 320, reward: 0.32 },
    { target: 640, reward: 0.64 },
    { target: 1280, reward: 1.28 },
    { target: 2560, reward: 2.56 }
  ],
  
  referralQuests: [
    { target: 1, reward: 0.01 },
    { target: 5, reward: 0.02 },
    { target: 10, reward: 0.04 },
    { target: 20, reward: 0.08 },
    { target: 40, reward: 0.16 },
    { target: 80, reward: 0.32 },
    { target: 160, reward: 0.64 },
    { target: 320, reward: 1.28 },
    { target: 640, reward: 2.56 },
    { target: 1000, reward: 5 }
  ]
};
