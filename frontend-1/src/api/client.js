import axios from 'axios';

const api = axios.create({
  baseURL: 'https://expense-tracker-engine.onrender.com/',
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// Edit Transaction
export const editTransaction = (id, updatedData) => api.put(`/transactions/${id}`, updatedData);

// Log EMI Payment
export const logEmiPayment = (paymentData) => api.post(`/emi-payments`, paymentData);

// Fetch Bill Tracker Summary
export const fetchBillSummary = (cardId) => api.get(`/bill-summary/${cardId}`);

// Master Data Endpoints
export const fetchFriends = () => api.get("/friends");
export const addFriend = (data) => api.post(`/friends`, data);

export const fetchPaymentModes = () => api.get("/payment-modes");
export const addPaymentMode = (data) => api.post(`/payment-modes`, data);

// Add these below your existing master data exports
export const editFriend = (id, data) => api.put(`/friends/${id}`, data);
export const deleteFriend = (id) => api.delete(`/friends/${id}`);

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