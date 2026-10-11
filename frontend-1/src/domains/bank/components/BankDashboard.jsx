import { useState, useEffect, useMemo } from 'react';
import { Landmark, Loader2, Filter, CalendarDays, PlusCircle, ArrowDownRight, ArrowUpRight, X, ChevronDown, Wallet, Search, RefreshCw, HandCoins } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { fetchPaymentModes, fetchBankLedger, fetchFriends, addIncome, addBankTransfer, addTransaction } from '../../../api/client';

const CustomSelect = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative w-full min-w-[160px]">
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text focus:outline-none focus:border-indigo-500 transition-colors text-sm font-medium shadow-sm">
        <span className="truncate pr-2">{value || 'Select...'}</span>
        <ChevronDown size={16} className={`text-dark-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <ul className="absolute top-full left-0 mt-1 w-full z-50 bg-dark-card border border-dark-border rounded-lg shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto custom-scrollbar">
          {options.map((opt) => (
            <li key={opt} onClick={() => { onChange(opt); setIsOpen(false); }} className={`px-4 py-2 text-sm cursor-pointer transition-colors ${value === opt ? 'bg-indigo-500/20 text-indigo-400' : 'text-dark-text hover:bg-dark-border/50'}`}>
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ModalSelect = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative w-full">
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-indigo-500 transition-colors text-sm">
        <span>{value || 'Select...'}</span>
        <ChevronDown size={16} className={`text-dark-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <ul className="absolute top-full left-0 mt-1 w-full z-50 bg-dark-card border border-dark-border rounded-lg shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto custom-scrollbar">
          {options.map((opt) => (
            <li key={opt} onClick={() => { onChange(opt); setIsOpen(false); }} className={`px-3 py-2 text-sm cursor-pointer transition-colors ${value === opt ? 'bg-indigo-500/20 text-indigo-400' : 'text-dark-text hover:bg-dark-border/50'}`}>
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f97316'];
const EXPENSE_CATEGORIES = ['Food', 'Groceries', 'Shopping', 'Tax', 'Travel', 'Entertainment', 'Personal Care', 'Appliance', 'Bill Pay', 'Rewards', 'Refund', 'Other', 'Gifts & Stuff'];

const getCycleValue = (cycleStr) => {
  if (!cycleStr) return 0;
  const [mName, yStr] = cycleStr.split(' ');
  const mIndex = new Date(`${mName} 1, 2000`).getMonth();
  return parseInt(yStr) * 100 + mIndex;
};

export default function BankDashboard() {
  const [banks, setBanks] = useState([]);
  const [friendList, setFriendList] = useState([]);
  const [activeBank, setActiveBank] = useState('');
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeMonthState, setActiveMonthState] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [tableCategory, setTableCategory] = useState('All');

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryType, setEntryType] = useState('Expense');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [expenseForm, setExpenseForm] = useState({ Date: today, Category: 'Food', Amount: '', Description: '' });
  const [incomeForm, setIncomeForm] = useState({ date: today, source: '', amount: '' });
  const [transferForm, setTransferForm] = useState({ date: today, toBank: '', amount: '', description: '' });

  // SPLIT ENGINE
  const [isSplitEnabled, setIsSplitEnabled] = useState(false);
  const [splitEntries, setSplitEntries] = useState([{ friend: '', amount: '' }]);

  useEffect(() => {
    const init = async () => {
      try {
        const [modesRes, friendsRes] = await Promise.all([fetchPaymentModes(), fetchFriends()]);
        const bankList = modesRes.data.filter(m => m.type === 'Bank Account').map(m => m.name);
        setBanks(bankList);
        setFriendList(friendsRes.data || []);
        if (bankList.length > 0) setActiveBank(bankList.includes('ICICI') ? 'ICICI' : bankList[0]);
      } catch (err) { console.error("Failed to fetch data", err); }
    };
    init();
  }, []);

  const loadLedger = async (bankToLoad) => {
    if (!bankToLoad) return;
    setLoading(true);
    try {
      const res = await fetchBankLedger(bankToLoad);
      setLedger(res.data || []);
    } catch (err) { console.error(err); setLedger([]); } 
    finally { setLoading(false); }
  };

  useEffect(() => { loadLedger(activeBank); }, [activeBank]);
  const handleRefresh = () => { loadLedger(activeBank); };

  useEffect(() => { setTableSearch(''); setTableCategory('All'); }, [activeBank, activeMonthState]);

  const safeActiveBank = activeBank || '';
  const isICICI = safeActiveBank.toUpperCase().includes('ICICI');
  const isSBI = safeActiveBank.toUpperCase().includes('SBI');
  const isBOM = safeActiveBank.toUpperCase().includes('BOM') || safeActiveBank.toUpperCase().includes('MAHA');

  // ==========================================
  // LEDGER CYCLES & STRICT BOM CUTOFF
  // ==========================================
  const ledgerWithCycles = useMemo(() => {
    if (!ledger.length) return [];
    
    const sorted = [...ledger].sort((a, b) => new Date(a.date) - new Date(b.date));
    let activeCycle = '';
    let lastSeenPhysicalMonth = '';
    const mapped = [];

    sorted.forEach(txn => {
      if (!txn.date) return;
      const d = new Date(txn.date);
      
      // IMPENETRABLE BOM CUTOFF WALL: Vaporize everything before March 1, 2026
      if (isBOM) {
         const y = d.getFullYear();
         const m = d.getMonth(); // 0 = Jan, 1 = Feb, 2 = Mar
         if (y < 2026 || (y === 2026 && m < 2)) {
             return; // Skip and destroy
         }
      }

      const currentPhysicalMonth = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (currentPhysicalMonth !== lastSeenPhysicalMonth) {
         activeCycle = currentPhysicalMonth;
         lastSeenPhysicalMonth = currentPhysicalMonth;
      }
      if (txn.category === 'Income' && txn.description?.toLowerCase().includes('salary') && d.getDate() >= 25) {
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        activeCycle = nextMonth.toLocaleString('default', { month: 'short', year: 'numeric' });
      }
      mapped.push({ ...txn, cycle: activeCycle });
    });
    return mapped.reverse();
  }, [ledger, isBOM]);

  const availableMonths = useMemo(() => {
    if (ledgerWithCycles.length === 0) return [new Date().toLocaleString('default', { month: 'short', year: 'numeric' })];
    const monthsMap = new Map();
    ledgerWithCycles.forEach(txn => { if (txn.cycle) monthsMap.set(txn.cycle, getCycleValue(txn.cycle)); });
    return Array.from(monthsMap.entries()).sort((a, b) => b[1] - a[1]).map(entry => entry[0]);
  }, [ledgerWithCycles]);

  const activeMonth = activeMonthState || (availableMonths.length > 0 ? availableMonths[0] : '');

  const monthlyLedger = useMemo(() => {
    if (!activeMonth) return [];
    return ledgerWithCycles.filter(txn => txn.cycle === activeMonth);
  }, [ledgerWithCycles, activeMonth]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(monthlyLedger.map(t => t.category));
    return ['All', ...Array.from(cats).sort()];
  }, [monthlyLedger]);

  const filteredLedger = useMemo(() => {
    return monthlyLedger.filter(txn => {
      const matchSearch = txn.description?.toLowerCase().includes(tableSearch.toLowerCase()) || txn.category?.toLowerCase().includes(tableSearch.toLowerCase());
      const matchCategory = tableCategory === 'All' || txn.category === tableCategory;
      return matchSearch && matchCategory;
    });
  }, [monthlyLedger, tableSearch, tableCategory]);

  // --- ICICI METRICS ---
  const iciciMetrics = useMemo(() => {
    let allTimeCredit = 0; let allTimeDebit = 0;
    let trueAllTimeIncome = 0;

    ledger.forEach(txn => {
      const amt = parseFloat(txn.amount) || 0;
      if (txn.type === 'Credit') {
        allTimeCredit += amt;
        if (txn.category === 'Income') trueAllTimeIncome += amt;
      }
      if (txn.type === 'Debit') allTimeDebit += amt;
    });
    
    const currentBalance = allTimeCredit - allTimeDebit;

    let monthlyIncomeOnly = 0; let monthlySentToBom = 0; let monthlyOthers = 0;
    monthlyLedger.forEach(txn => {
      const amt = parseFloat(txn.amount) || 0;
      if (txn.type === 'Credit' && txn.category === 'Income') monthlyIncomeOnly += amt;
      if (txn.type === 'Debit') {
        if (txn.category === 'Self Transfer' && txn.description?.toLowerCase().includes('bom')) monthlySentToBom += amt;
        else monthlyOthers += amt;
      }
    });
    
    return { currentBalance, trueAllTimeIncome, monthlyIncomeOnly, monthlySentToBom, monthlyOthers };
  }, [ledger, monthlyLedger]);

  // --- SBI COLLECTION METRICS & NLP PARSER ---
  const sbiMetrics = useMemo(() => {
    const BASE_BALANCE = 0.00; 
    const activeCycleVal = getCycleValue(activeMonth);
    
    let historicalNet = 0; let peerCredit = 0; let selfCreditIn = 0;
    let sentToBom = 0; let directSpends = 0;

    ledgerWithCycles.forEach(txn => {
      const amt = parseFloat(txn.amount) || 0;
      const txnCycleVal = getCycleValue(txn.cycle);
      const descLower = (txn.description || '').toLowerCase();
      
      const isTransfer = txn.category === 'Self Transfer' || txn.isSelf || descLower.includes('bom') || descLower.includes('self') || descLower.includes('icici');

      if (txnCycleVal < activeCycleVal) {
        if (txn.type === 'Credit') historicalNet += amt;
        if (txn.type === 'Debit') historicalNet -= amt;
      } else if (txnCycleVal === activeCycleVal) {
        if (txn.type === 'Credit') { 
          if (isTransfer) selfCreditIn += amt;
          else peerCredit += amt;
        } 
        else if (txn.type === 'Debit') {
          if (isTransfer) sentToBom += amt;
          else directSpends += amt;
        }
      }
    });

    const friendMap = {};
    monthlyLedger.filter(t => t.type === 'Credit').forEach(txn => {
      const descLower = (txn.description || '').toLowerCase();
      const isTransfer = txn.category === 'Self Transfer' || txn.isSelf || descLower.includes('bom') || descLower.includes('self') || descLower.includes('icici');
      
      if (!isTransfer) {
        const match = friendList.find(f => descLower.includes(f.name.toLowerCase()));
        if (match) {
          const name = match.name;
          let reason = descLower.replace(name.toLowerCase(), '').replace(/\b(from|sent|paid|for)\b/gi, '').trim();
          reason = reason ? reason.charAt(0).toUpperCase() + reason.slice(1) : 'General Settle';
          
          if (!friendMap[name]) friendMap[name] = { total: 0, items: [] };
          friendMap[name].total += parseFloat(txn.amount);
          friendMap[name].items.push({ amount: parseFloat(txn.amount), reason, date: txn.date });
        }
      }
    });

    const parsedCollections = Object.entries(friendMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total);
    const openingBalance = BASE_BALANCE + historicalNet;
    const closingBalance = openingBalance + peerCredit + selfCreditIn - sentToBom - directSpends;
    
    return { openingBalance, peerCredit, selfCreditIn, sentToBom, directSpends, closingBalance, parsedCollections };
  }, [ledgerWithCycles, activeMonth, monthlyLedger, friendList]);

  // --- BOM METRICS (WITH 1234.00 BASELINE AND ROUNDING DIFF) ---
  const metrics = useMemo(() => {
    // Hardcoded Opening Balance strictly applied to BOM
    const BASE_BALANCE = isBOM ? 1234.00 : 0.00; 
    
    const activeCycleVal = getCycleValue(activeMonth);
    let historicalNet = 0; let totalDebit = 0; let totalCredit = 0; let selfCredit = 0;
    let debitCount = 0; let creditCount = 0; let selfCount = 0;
    
    let roundedDebit = 0; let roundedCredit = 0;

    ledgerWithCycles.forEach(txn => {
      const amt = parseFloat(txn.amount) || 0;
      const txnCycleVal = getCycleValue(txn.cycle);
      
      if (txnCycleVal < activeCycleVal) {
        if (txn.type === 'Credit') historicalNet += amt;
        if (txn.type === 'Debit') historicalNet -= amt;
      } else if (txnCycleVal === activeCycleVal) {
        if (txn.type === 'Debit') { 
            totalDebit += amt; 
            roundedDebit += Math.round(amt);
            debitCount++; 
        } 
        else if (txn.type === 'Credit') { 
            totalCredit += amt; 
            roundedCredit += Math.round(amt);
            creditCount++; 
            if (txn.isSelf) selfCredit += amt; 
        }
        if (txn.isSelf) selfCount++;
      }
    });

    const totalTransactions = debitCount + creditCount;
    const actualSum = totalDebit + totalCredit;
    const roundedAmountInvolved = roundedDebit + roundedCredit;
    const difference = roundedAmountInvolved - actualSum;
    
    const openingBalance = BASE_BALANCE + historicalNet;
    const closingBalance = openingBalance + totalCredit - totalDebit;

    return {
      openingBalance, totalDebit, totalCredit, closingBalance, selfCredit,
      totalTransactions, debitCount, creditCount, selfCount, 
      totalAmountInvolved: roundedAmountInvolved,
      actualCount: totalTransactions, 
      actualSum: actualSum, 
      difference: difference
    };
  }, [ledgerWithCycles, activeMonth, isBOM]);

  const chartData = useMemo(() => {
    const standardDebits = monthlyLedger.filter(txn => {
      const descLower = (txn.description || '').toLowerCase();
      const isTransfer = txn.category === 'Self Transfer' || txn.isSelf || descLower.includes('bom') || descLower.includes('icici') || descLower.includes('self');
      return txn.type === 'Debit' && !isTransfer;
    });

    const categoryTotals = {};
    standardDebits.forEach(txn => { categoryTotals[txn.category || 'Other'] = (categoryTotals[txn.category || 'Other'] || 0) + parseFloat(txn.amount); });
    const pieData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const dailyTotals = {};
    standardDebits.forEach(txn => {
      const d = new Date(txn.date).getDate();
      dailyTotals[`Day ${d}`] = (dailyTotals[`Day ${d}`] || 0) + parseFloat(txn.amount);
    });
    const barData = Object.entries(dailyTotals).map(([name, amount]) => ({ name, day: parseInt(name.replace('Day ', '')), amount })).sort((a, b) => a.day - b.day);
    return { pieData, barData };
  }, [monthlyLedger]);

  const handleAddEntry = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (entryType === 'Expense') {
        const d = new Date(expenseForm.Date);
        const formattedDate = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
        
        const activeSplits = isSplitEnabled 
          ? splitEntries.filter(s => s.friend && parseFloat(s.amount) > 0).map(s => ({ Friend_Name: s.friend, Amount_Owed: parseFloat(s.amount) }))
          : [];

        await addTransaction({ 
          Date: formattedDate, 
          Type: 'Expense', 
          Category: expenseForm.Category, 
          Amount: expenseForm.Amount, 
          Description: expenseForm.Description, 
          Card_ID: activeBank, 
          splits: activeSplits 
        });
      } else if (entryType === 'Income') {
        const d = new Date(incomeForm.date);
        await addIncome({ date: incomeForm.date, source: incomeForm.source, amount: incomeForm.amount, cycle: d.toLocaleString('default', { month: 'short', year: 'numeric' }), Bank_Source: activeBank });
      } else if (entryType === 'Transfer') {
        await addBankTransfer({ date: transferForm.date, fromBank: activeBank, toBank: transferForm.toBank, amount: transferForm.amount, description: transferForm.description });
      }
      
      await loadLedger(activeBank);
      setIsEntryModalOpen(false);
      setExpenseForm({ Date: today, Category: 'Food', Amount: '', Description: '' });
      setIncomeForm({ date: today, source: '', amount: '' });
      setTransferForm({ date: today, toBank: '', amount: '', description: '' });
      setIsSplitEnabled(false);
      setSplitEntries([{ friend: '', amount: '' }]);
    } catch (err) { console.error("Failed to add entry", err); } 
    finally { setIsSubmitting(false); }
  };

  const handleAddSplitRow = () => setSplitEntries([...splitEntries, { friend: '', amount: '' }]);
  const handleRemoveSplitRow = (index) => setSplitEntries(splitEntries.filter((_, i) => i !== index));
  const updateSplit = (index, field, value) => {
    const newSplits = [...splitEntries];
    newSplits[index][field] = value;
    setSplitEntries(newSplits);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 fade-in animate-in duration-200">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-dark-card border border-dark-border rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-dark-text flex items-center">
            <Landmark className="mr-3 text-indigo-400" />
            Bank Ledger
          </h2>
          <p className="text-sm text-dark-muted mt-1">
            {isICICI ? 'Primary routing and salary hub.' : isSBI ? 'Collection and clearing hub for peers.' : 'Automated double-entry reconciliation across all accounts.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div>
            <label className="block text-xs text-dark-muted font-medium mb-1">Account</label>
            <CustomSelect value={activeBank} options={banks} onChange={setActiveBank} />
          </div>
          <div>
            <label className="block text-xs text-dark-muted font-medium mb-1">Month Cycle</label>
            <CustomSelect value={activeMonth} options={availableMonths} onChange={setActiveMonthState} />
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={handleRefresh} disabled={loading} className="flex items-center justify-center bg-dark-bg hover:bg-dark-border border border-dark-border text-dark-muted hover:text-dark-text p-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50" title="Refresh Data">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setIsEntryModalOpen(true)} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-indigo-900/20 font-medium text-sm">
              <PlusCircle size={18} />
              <span className="hidden sm:inline">Add Entry</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-indigo-400"><Loader2 className="animate-spin mr-2" size={24} /><span className="font-medium">Syncing Master Ledgers...</span></div>
      ) : (
        <>
          {isICICI ? (
            // --- ICICI VIEW ---
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-dark-card border border-indigo-500/40 rounded-xl p-4 shadow-sm relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div><p className="text-xs text-indigo-400/80 font-medium uppercase mb-1 flex items-center"><Wallet size={14} className="mr-1"/> Current Balance</p><p className={`text-2xl font-bold ${iciciMetrics.currentBalance < 0 ? 'text-rose-400' : 'text-indigo-400'}`}>₹{iciciMetrics.currentBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p><p className="text-[10px] text-dark-muted mt-1 uppercase tracking-wider">All Time</p></div>
              <div className="bg-dark-card border border-dark-border rounded-xl p-4 shadow-sm"><p className="text-xs text-dark-muted font-medium uppercase mb-1 flex items-center"><ArrowDownRight size={14} className="mr-1"/> Total Income</p><p className="text-xl font-bold text-dark-text">₹{iciciMetrics.trueAllTimeIncome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p><p className="text-[10px] text-dark-muted mt-1 uppercase tracking-wider">All Time</p></div>
              <div className="bg-dark-card border border-emerald-500/20 rounded-xl p-4 shadow-sm hover:border-emerald-500/40 transition-colors"><p className="text-xs text-emerald-400/80 font-medium uppercase mb-1 flex items-center"><ArrowDownRight size={14} className="mr-1"/> Income</p><p className="text-xl font-bold text-emerald-400">₹{iciciMetrics.monthlyIncomeOnly.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p><p className="text-[10px] text-dark-muted mt-1 uppercase tracking-wider">This Month</p></div>
              <div className="bg-dark-card border border-amber-500/20 rounded-xl p-4 shadow-sm hover:border-amber-500/40 transition-colors"><p className="text-xs text-amber-400/80 font-medium uppercase mb-1 flex items-center"><ArrowUpRight size={14} className="mr-1"/> Sent to BOM</p><p className="text-xl font-bold text-amber-400">₹{iciciMetrics.monthlySentToBom.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p><p className="text-[10px] text-dark-muted mt-1 uppercase tracking-wider">This Month</p></div>
              <div className="bg-dark-card border border-rose-500/20 rounded-xl p-4 shadow-sm hover:border-rose-500/40 transition-colors"><p className="text-xs text-rose-400/80 font-medium uppercase mb-1 flex items-center"><ArrowUpRight size={14} className="mr-1"/> Others</p><p className="text-xl font-bold text-rose-400">₹{iciciMetrics.monthlyOthers.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p><p className="text-[10px] text-dark-muted mt-1 uppercase tracking-wider">This Month</p></div>
            </div>
          ) : isSBI ? (
            // --- SBI COLLECTION VIEW ---
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-dark-card border border-dark-border rounded-xl p-4 shadow-sm"><p className="text-xs text-dark-muted font-medium uppercase mb-1">Opening Balance</p><p className="text-xl font-bold text-dark-text">₹{sbiMetrics.openingBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p></div>
                <div className="bg-dark-card border border-emerald-500/20 rounded-xl p-4 shadow-sm hover:border-emerald-500/40 transition-colors"><p className="text-xs text-emerald-400/80 font-medium uppercase mb-1 flex items-center"><ArrowDownRight size={14} className="mr-1"/> Peer Received</p><p className="text-xl font-bold text-emerald-400">₹{sbiMetrics.peerCredit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p><p className="text-[10px] text-dark-muted mt-1 uppercase tracking-wider">From Friends/Others</p></div>
                <div className="bg-dark-card border border-teal-500/20 rounded-xl p-4 shadow-sm hover:border-teal-500/40 transition-colors"><p className="text-xs text-teal-400/80 font-medium uppercase mb-1 flex items-center"><ArrowDownRight size={14} className="mr-1"/> Self Received</p><p className="text-xl font-bold text-teal-400">₹{sbiMetrics.selfCreditIn.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p><p className="text-[10px] text-dark-muted mt-1 uppercase tracking-wider">From BOM/ICICI</p></div>
                <div className="bg-dark-card border border-amber-500/20 rounded-xl p-4 shadow-sm hover:border-amber-500/40 transition-colors"><p className="text-xs text-amber-400/80 font-medium uppercase mb-1 flex items-center"><ArrowUpRight size={14} className="mr-1"/> Sent to BOM</p><p className="text-xl font-bold text-amber-400">₹{sbiMetrics.sentToBom.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p><p className="text-[10px] text-dark-muted mt-1 uppercase tracking-wider">Self Transfers Out</p></div>
                <div className="bg-dark-card border border-rose-500/20 rounded-xl p-4 shadow-sm hover:border-rose-500/40 transition-colors"><p className="text-xs text-rose-400/80 font-medium uppercase mb-1 flex items-center"><ArrowUpRight size={14} className="mr-1"/> Direct Spends</p><p className="text-xl font-bold text-rose-400">₹{sbiMetrics.directSpends.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p><p className="text-[10px] text-dark-muted mt-1 uppercase tracking-wider">Actual Expenses</p></div>
                <div className="bg-dark-card border border-indigo-500/40 rounded-xl p-4 shadow-sm relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div><p className="text-xs text-indigo-400/80 font-medium uppercase mb-1">Current / Closing Bal.</p><p className={`text-xl font-bold ${sbiMetrics.closingBalance < 0 ? 'text-rose-400' : 'text-indigo-400'}`}>₹{sbiMetrics.closingBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p></div>
              </div>

              <div className="bg-dark-card border border-dark-border rounded-xl shadow-sm overflow-hidden flex flex-col mt-6">
                <div className="p-5 border-b border-dark-border bg-dark-bg/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <h3 className="font-semibold text-dark-text flex items-center"><HandCoins size={18} className="mr-2 text-emerald-400" /> Friend Collections Breakdown ({activeMonth})</h3>
                </div>
                <div className="p-5">
                  {sbiMetrics.parsedCollections.length === 0 ? (
                    <div className="p-6 text-center text-dark-muted italic border border-dashed border-dark-border rounded-lg">No incoming peer transfers detected this month.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sbiMetrics.parsedCollections.map(friend => (
                        <div key={friend.name} className="bg-dark-bg border border-dark-border rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-colors shadow-sm">
                          <div className="flex justify-between items-center mb-3 border-b border-dark-border pb-2">
                            <span className="font-bold text-dark-text">{friend.name}</span>
                            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">₹{friend.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-24 custom-scrollbar">
                            {friend.items.map((item, i) => (
                              <div key={i} className="flex justify-between items-center text-xs">
                                <span className="text-dark-muted truncate pr-2" title={item.reason}>{item.reason}</span>
                                <span className="text-dark-text font-medium shrink-0">₹{item.amount.toLocaleString(undefined, {minimumFractionDigits: 0})}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // --- BOM ANALYTICAL VIEW (13 WIDGETS) ---
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div className="bg-dark-card border border-dark-border rounded-xl p-4 shadow-sm hover:border-indigo-500/30 transition-colors"><p className="text-xs text-dark-muted font-medium uppercase mb-1">Opening Balance</p><p className="text-lg font-bold text-dark-text">₹{metrics.openingBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p></div>
                <div className="bg-dark-card border border-rose-500/20 rounded-xl p-4 shadow-sm hover:border-rose-500/40 transition-colors"><p className="text-xs text-rose-400/80 font-medium uppercase mb-1 flex items-center"><ArrowUpRight size={14} className="mr-1"/> Total Debit Amount</p><p className="text-lg font-bold text-rose-400">₹{metrics.totalDebit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p></div>
                <div className="bg-dark-card border border-emerald-500/20 rounded-xl p-4 shadow-sm hover:border-emerald-500/40 transition-colors"><p className="text-xs text-emerald-400/80 font-medium uppercase mb-1 flex items-center"><ArrowDownRight size={14} className="mr-1"/> Total Credit Amount</p><p className="text-lg font-bold text-emerald-400">₹{metrics.totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p></div>
                <div className="bg-dark-card border border-indigo-500/40 rounded-xl p-4 shadow-sm relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div><p className="text-xs text-indigo-400/80 font-medium uppercase mb-1">Closing Balance</p><p className={`text-xl font-bold ${metrics.closingBalance < 0 ? 'text-rose-400' : 'text-indigo-400'}`}>₹{metrics.closingBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p></div>
                <div className="bg-dark-bg border border-dark-border border-dashed rounded-xl p-4 shadow-sm"><p className="text-xs text-dark-muted font-medium uppercase mb-1">Self Credit Amount</p><p className="text-lg font-bold text-dark-text">₹{metrics.selfCredit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p></div>
                
                <div className="col-span-2 md:col-span-4 lg:col-span-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  <div className="bg-dark-bg border border-dark-border rounded-lg p-3"><p className="text-[10px] text-dark-muted font-medium uppercase mb-0.5">Total Transactions</p><p className="text-sm font-bold text-dark-text">{metrics.totalTransactions}</p></div>
                  <div className="bg-dark-bg border border-dark-border rounded-lg p-3"><p className="text-[10px] text-dark-muted font-medium uppercase mb-0.5">Total Debit Count</p><p className="text-sm font-bold text-dark-text">{metrics.debitCount}</p></div>
                  <div className="bg-dark-bg border border-dark-border rounded-lg p-3"><p className="text-[10px] text-dark-muted font-medium uppercase mb-0.5">Total Credit Count</p><p className="text-sm font-bold text-dark-text">{metrics.creditCount}</p></div>
                  <div className="bg-dark-bg border border-dark-border rounded-lg p-3"><p className="text-[10px] text-dark-muted font-medium uppercase mb-0.5">Total Self Transactions</p><p className="text-sm font-bold text-dark-text">{metrics.selfCount}</p></div>
                  <div className="bg-dark-bg border border-dark-border rounded-lg p-3"><p className="text-[10px] text-dark-muted font-medium uppercase mb-0.5">Total Amount Involved</p><p className="text-sm font-bold text-dark-text">₹{metrics.totalAmountInvolved.toLocaleString(undefined, {maximumFractionDigits: 2})}</p></div>
                  <div className="bg-dark-bg border border-dark-border rounded-lg p-3"><p className="text-[10px] text-dark-muted font-medium uppercase mb-0.5">Actual Count</p><p className="text-sm font-bold text-dark-text">{metrics.actualCount}</p></div>
                  <div className="bg-dark-bg border border-dark-border rounded-lg p-3"><p className="text-[10px] text-dark-muted font-medium uppercase mb-0.5">Actual Sum</p><p className="text-sm font-bold text-dark-text">₹{metrics.actualSum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p></div>
                  <div className="bg-dark-bg border border-dark-border rounded-lg p-3"><p className="text-[10px] text-dark-muted font-medium uppercase mb-0.5">Diff in Actual Values</p><p className={`text-sm font-bold ${metrics.difference === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>₹{metrics.difference.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p></div>
                </div>
              </div>
            </>
          )}

          {/* CHARTS */}
          {!isICICI && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-sm flex flex-col h-80">
                <h3 className="text-sm font-bold text-dark-muted uppercase tracking-wider mb-4">Cashflow Breakdown</h3>
                {chartData.pieData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-dark-muted text-sm border border-dashed border-dark-border rounded-lg">No outgoing transactions</div>
                ) : (
                  <div className="flex-1 flex items-center">
                    <div className="w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData.pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                            {chartData.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value) => `₹${value}`} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 pl-4 flex flex-col justify-center space-y-2 overflow-y-auto max-h-full custom-scrollbar">
                      {chartData.pieData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center"><div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div><span className="text-dark-text truncate w-20">{entry.name}</span></div>
                          <span className="font-semibold text-dark-muted">₹{entry.value.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-sm flex flex-col h-80">
                <h3 className="text-sm font-bold text-dark-muted uppercase tracking-wider mb-4">Spending Trend</h3>
                {chartData.barData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-dark-muted text-sm border border-dashed border-dark-border rounded-lg">No spending data</div>
                ) : (
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.barData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                        <Tooltip cursor={{fill: '#334155', opacity: 0.4}} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }} formatter={(value) => [`₹${value}`, 'Spent']} />
                        <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MAIN TRANSACTION TABLE */}
          <div className="bg-dark-card border border-dark-border rounded-xl shadow-sm overflow-hidden flex flex-col mt-6">
            <div className="p-5 border-b border-dark-border bg-dark-bg/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
               <h3 className="font-semibold text-dark-text flex items-center">
                 <Filter size={16} className="mr-2 text-indigo-400" /> 
                 Ledger Entries ({activeMonth})
                 <span className="ml-3 text-xs font-bold tracking-wider bg-indigo-500/20 text-indigo-400 py-1 px-2.5 rounded-md border border-indigo-500/20 shadow-sm">
                   {filteredLedger.length} {filteredLedger.length === 1 ? 'Record' : 'Records'}
                 </span>
               </h3>
               <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                 <div className="relative w-full sm:w-64">
                   <input type="text" placeholder="Search description..." value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-lg pl-9 pr-3 py-2 text-sm text-dark-text focus:outline-none focus:border-indigo-500" />
                   <Search size={16} className="absolute left-3 top-2.5 text-dark-muted" />
                 </div>
                 <div className="w-full sm:w-40">
                   <CustomSelect value={tableCategory} options={uniqueCategories} onChange={setTableCategory} />
                 </div>
               </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
              <table className="w-full text-left text-sm text-dark-muted">
                <thead className="bg-dark-bg text-xs uppercase border-b border-dark-border text-dark-text sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Category</th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {filteredLedger.length > 0 ? (
                    filteredLedger.map((txn, idx) => {
                      const isDebit = txn.type === 'Debit';
                      return (
                        <tr key={`${txn.id}-${idx}`} className="hover:bg-dark-border/20 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-dark-text flex items-center font-medium">
                            <CalendarDays size={14} className="mr-2 text-dark-muted" />
                            {new Date(txn.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold border bg-dark-bg border-dark-border text-dark-text">{txn.category}</span>
                          </td>
                          <td className="px-6 py-4 text-dark-text font-medium">{txn.description}</td>
                          <td className={`px-6 py-4 text-right font-bold whitespace-nowrap ${isDebit ? 'text-rose-400' : 'text-emerald-400'}`}>
                            ₹{Math.abs(parseFloat(txn.amount)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="4" className="px-6 py-10 text-center text-dark-muted">No records match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* --- UNIFIED ENTRY MODAL WITH SPLIT --- */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-dark-text">Log Activity • {activeBank}</h2>
              <button onClick={() => setIsEntryModalOpen(false)} className="text-dark-muted hover:text-dark-text"><X size={18}/></button>
            </div>
            <div className="flex bg-dark-bg rounded-lg p-1 border border-dark-border mb-6">
              {['Expense', 'Income', 'Transfer'].map(mode => (
                <button key={mode} type="button" onClick={() => setEntryType(mode)} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${entryType === mode ? 'bg-dark-card text-indigo-400 shadow-sm border border-dark-border' : 'text-dark-muted hover:text-dark-text'}`}>{mode}</button>
              ))}
            </div>

            <form onSubmit={handleAddEntry} className="space-y-4">
              {entryType === 'Expense' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-muted mb-1">Date</label>
                      <input type="date" required style={{ colorScheme: 'dark' }} value={expenseForm.Date} onChange={(e) => setExpenseForm({...expenseForm, Date: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-indigo-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-muted mb-1">Category</label>
                      <CustomSelect value={expenseForm.Category} options={EXPENSE_CATEGORIES} onChange={(val) => setExpenseForm({...expenseForm, Category: val})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-muted mb-1">Description (Spent On)</label>
                    <input type="text" required placeholder="e.g. Zepto Groceries" value={expenseForm.Description} onChange={(e) => setExpenseForm({...expenseForm, Description: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-indigo-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-muted mb-1">Amount (₹)</label>
                    <input type="number" required min="1" step="any" placeholder="0" value={expenseForm.Amount} onChange={(e) => setExpenseForm({...expenseForm, Amount: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-indigo-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  </div>

                  {/* SPLIT ENGINE IN BANK DASHBOARD */}
                  <div className="mt-4 pt-4 border-t border-dark-border">
                    <label className="flex items-center space-x-2 text-sm text-dark-text cursor-pointer">
                      <input type="checkbox" checked={isSplitEnabled} onChange={() => setIsSplitEnabled(!isSplitEnabled)} className="w-4 h-4 rounded border-dark-border text-indigo-500 focus:ring-indigo-500 bg-dark-bg" />
                      <span>Split this expense with friends</span>
                    </label>
                    
                    {isSplitEnabled && (
                      <div className="mt-4 space-y-3">
                        {splitEntries.map((split, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-dark-bg p-2 rounded-lg border border-dark-border">
                            <div className="w-1/2">
                              <ModalSelect value={split.friend} options={friendList.map(f => f.name)} onChange={(val) => updateSplit(idx, 'friend', val)} />
                            </div>
                            <div className="flex-1 relative">
                              <span className="absolute left-2.5 top-2 text-dark-muted text-sm">₹</span>
                              <input type="number" min="1" step="any" placeholder="Amount" value={split.amount} onChange={(e) => updateSplit(idx, 'amount', e.target.value)} className="w-full bg-transparent border-none text-dark-text pl-6 pr-2 py-1.5 focus:outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <button type="button" onClick={() => handleRemoveSplitRow(idx)} className="p-1.5 text-dark-muted hover:text-rose-400 transition-colors"><X size={16} /></button>
                          </div>
                        ))}
                        <button type="button" onClick={handleAddSplitRow} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center transition-colors"><PlusCircle size={12} className="mr-1" /> Add another person</button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {entryType === 'Income' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-dark-muted mb-1">Date</label>
                    <input type="date" required style={{ colorScheme: 'dark' }} value={incomeForm.date} onChange={(e) => setIncomeForm({...incomeForm, date: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-indigo-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-muted mb-1">Source (Received From)</label>
                    <input type="text" required placeholder="e.g. Salary, Friend Settle" value={incomeForm.source} onChange={(e) => setIncomeForm({...incomeForm, source: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-indigo-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-muted mb-1">Amount (₹)</label>
                    <input type="number" required min="1" step="any" placeholder="0" value={incomeForm.amount} onChange={(e) => setIncomeForm({...incomeForm, amount: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-indigo-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  </div>
                </>
              )}

              {entryType === 'Transfer' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-muted mb-1">Date</label>
                      <input type="date" required style={{ colorScheme: 'dark' }} value={transferForm.date} onChange={(e) => setTransferForm({...transferForm, date: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-indigo-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-muted mb-1">Transfer To</label>
                      <ModalSelect value={transferForm.toBank} options={banks.filter(b => b !== activeBank)} onChange={(val) => setTransferForm({...transferForm, toBank: val})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-muted mb-1">Description (Optional)</label>
                    <input type="text" placeholder="e.g. Moving funds" value={transferForm.description} onChange={(e) => setTransferForm({...transferForm, description: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-indigo-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-muted mb-1">Amount (₹)</label>
                    <input type="number" required min="1" step="any" placeholder="0" value={transferForm.amount} onChange={(e) => setTransferForm({...transferForm, amount: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-indigo-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  </div>
                </>
              )}

              <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white py-2.5 rounded-lg transition-colors font-medium flex justify-center items-center shadow-lg shadow-indigo-900/20 text-sm">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : `Save ${entryType}`}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}