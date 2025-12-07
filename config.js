// config.js
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

const ADMIN_PASSWORDS = ["Admin@123", "Xboss2024", "Mostafa$500"];

const APP_DEFAULT_CONFIG = {
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
  tonkeeperLink: "https://app.tonkeeper.com/transfer/UQDMj-aLehj4WZwvw0ZEcIVD14blpLWQxzdCmD7QjKOP6D-F?amount=&text=",
  taskPrices: {
    500: 0.5,
    1000: 1.0,
    3000: 3.0,
    5000: 5.0
  },
  withdrawalOptions: [
    { gold: 10000, ton: 0.10, label: "10,000 GOLD ≈ 0.10 TON" },
    { gold: 50000, ton: 0.50, label: "50,000 GOLD ≈ 0.50 TON" },
    { gold: 100000, ton: 1.00, label: "100,000 GOLD ≈ 1 TON" },
    { gold: 500000, ton: 5.00, label: "500,000 GOLD ≈ 5 TON" }
  ]
};

export { FIREBASE_CONFIG, ADMIN_PASSWORDS, APP_DEFAULT_CONFIG };
