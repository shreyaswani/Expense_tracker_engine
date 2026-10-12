import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isAskingForPasscode = false;

// 1. REQUEST INTERCEPTOR: Attach passcode from localStorage
api.interceptors.request.use((config) => {
  let passcode = localStorage.getItem('vault_passcode');
  
  if (!passcode && !isAskingForPasscode) {
    isAskingForPasscode = true;
    const input = window.prompt('🔒 Enter your Finance Vault Passcode:');
    if (input && input.trim()) {
      passcode = input.trim();
      localStorage.setItem('vault_passcode', passcode);
    }
    isAskingForPasscode = false;
  }
  
  if (passcode) {
    config.headers['x-access-key'] = passcode;
  }
  return config;
});

// 2. RESPONSE INTERCEPTOR: Auto-cache GET data for offline mode & handle 401s cleanly
let hasAlerted401 = false;

api.interceptors.response.use(
  (response) => {
    hasAlerted401 = false; // Reset on successful connection
    
    // Save a backup of every GET request in localStorage for Offline Mode
    if (response.config.method === 'get' && response.config.url) {
      try {
        localStorage.setItem(`offline_cache_${response.config.url}`, JSON.stringify(response.data));
      } catch (e) {
        console.warn('Cache storage full', e);
      }
    }
    return response;
  },
  (error) => {
    // IF OFFLINE (No internet / Network Error): Serve the cached data from localStorage!
    if (!error.response && error.config && error.config.method === 'get') {
      const cachedData = localStorage.getItem(`offline_cache_${error.config.url}`);
      if (cachedData) {
        return Promise.resolve({
          data: JSON.parse(cachedData),
          status: 200,
          statusText: 'OK (Offline Cache)',
          headers: {},
          config: error.config,
        });
      }
    }

    // IF 401 UNAUTHORIZED: Ask once to update the passcode instead of looping
    if (error.response && error.response.status === 401 && !hasAlerted401) {
      hasAlerted401 = true;
      const retry = window.prompt('❌ Passcode rejected by server! Re-enter your APP_SECRET_KEY:');
      if (retry && retry.trim()) {
        localStorage.setItem('vault_passcode', retry.trim());
        window.location.reload();
      }
    }
    
    return Promise.reject(error);
  }
);

export const fetchCards = () => api.get('/cards');
export const fetchTransactions = (cardId) => api.get(`/transactions/${cardId}`);
export const addTransaction = (data) => api.post('/transactions', data);

export const fetchEmis = () => api.get('/emis');
export const fetchEmiPayments = () => api.get('/emi-payments');
export const addEmi = (emiData) => api.post('/emis', emiData);

// --- SHARED EXPENSES (TAKE MONEY) ---
export const fetchSharedExpenses = () => api.get('/shared-expenses');
export const addSharedExpense = (data) => api.post('/shared-expenses', data);
export const settleSharedExpense = (id, amount) => api.put(`/shared-expenses/${id}/settle`, { amount });

// --- NEW ENGINE ROUTES ---
export const editTransaction = (id, updatedData) => api.put(`/transactions/${id}`, updatedData);
export const logEmiPayment = (paymentData) => api.post(`/emi-payments`, paymentData);
export const fetchBillSummary = (cardId) => api.get(`/bill-summary/${cardId}`);

// Master Data Endpoints
export const fetchFriends = () => api.get("/friends");
export const addFriend = (data) => api.post(`/friends`, data);
export const editFriend = (id, data) => api.put(`/friends/${id}`, data);
export const deleteFriend = (id) => api.delete(`/friends/${id}`);

export const fetchPaymentModes = () => api.get("/payment-modes");
export const addPaymentMode = (data) => api.post(`/payment-modes`, data);
export const editPaymentMode = (id, data) => api.put(`/payment-modes/${id}`, data);
export const deletePaymentMode = (id) => api.delete(`/payment-modes/${id}`);

// Wealth & Income Endpoints
export const fetchSavings = () => api.get(`/savings`);
export const addSaving = (data) => api.post(`/savings`, data);

export const fetchSavingsLedger = () => api.get(`/savings-ledger`);
export const addSavingsDeposit = (data) => api.post(`/savings-ledger`, data);

export const fetchIncome = () => api.get(`/income`);
export const addIncome = (data) => api.post(`/income`, data);

// Bank Ledger & Transfer Endpoints
export const addBankTransfer = (data) => api.post(`/bank-transfers`, data);
export const fetchBankLedger = (bankName) => api.get(`/bank-ledger/${bankName}`);

// --- GIVE MONEY ---
export const fetchGiveMoney = () => api.get(`/give-money`);
export const addGiveMoney = (data) => api.post(`/give-money`, data);
export const settleGiveMoney = (id, amount) => api.post(`/give-money/settle/${id}`, { amount });

export default api;
