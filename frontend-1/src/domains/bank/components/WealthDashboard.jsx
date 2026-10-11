import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Target, ShieldAlert, PlusCircle, Loader2, X, Wallet, ChevronDown, Filter, Calendar } from 'lucide-react';
import { fetchSavings, fetchSavingsLedger, addSaving, addSavingsDeposit, fetchPaymentModes } from '../../../api/client';

// --- CUSTOM SELECT COMPONENT ---
const CustomSelect = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative w-full">
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500 transition-colors text-sm"
      >
        <span>{value || 'Select...'}</span>
        <ChevronDown size={16} className={`text-dark-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul className="absolute top-full left-0 mt-1 w-full z-50 bg-dark-card border border-dark-border rounded-lg shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <li
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                value === opt 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'text-dark-text hover:bg-dark-border/50'
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function WealthDashboard() {
  const [savings, setSavings] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Table Filters State
  const [selectedNameFilter, setSelectedNameFilter] = useState('All');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [selectedBankFilter, setSelectedBankFilter] = useState('All');

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [activeSavingId, setActiveSavingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [addFormData, setAddFormData] = useState({ name: '', category: 'Investment', targetAmount: '' });
  const [depositFormData, setDepositFormData] = useState({ date: new Date().toISOString().split('T')[0], amount: '', bank: '' });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [savingsRes, ledgerRes, modesRes] = await Promise.all([
          fetchSavings(),
          fetchSavingsLedger(),
          fetchPaymentModes()
        ]);
        setSavings(savingsRes.data);
        setDeposits(ledgerRes.data);
        
        const banks = modesRes.data.map(m => m.name);
        setPaymentModes(banks);
        if (banks.length > 0) setDepositFormData(prev => ({ ...prev, bank: banks[0] }));
      } catch (err) {
        console.error("Failed to load wealth data", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...addFormData, targetAmount: addFormData.targetAmount || 0, currentValue: 0 };
      const res = await addSaving(payload);
      setSavings([...savings, { id: res.data.id, ...payload }]);
      setIsAddModalOpen(false);
      setAddFormData({ name: '', category: 'Investment', targetAmount: '' });
    } catch (err) { console.error(err); } 
    finally { setIsSubmitting(false); }
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { savingId: activeSavingId, ...depositFormData };
      const res = await addSavingsDeposit(payload);
      setDeposits([...deposits, { id: res.data.id, ...payload }]);
      setIsDepositModalOpen(false);
      setDepositFormData({ date: new Date().toISOString().split('T')[0], amount: '', bank: paymentModes[0] || '' });
    } catch (err) { console.error(err); } 
    finally { setIsSubmitting(false); }
  };

  const openDepositModal = (saving) => {
    setActiveSavingId(saving.id);
    let defaultBank = paymentModes[0] || '';
    if (saving.category === 'Emergency Fund') {
      const sbiMode = paymentModes.find(m => m.toUpperCase().includes('SBI'));
      if (sbiMode) defaultBank = sbiMode;
    }
    setDepositFormData(prev => ({ ...prev, bank: defaultBank }));
    setIsDepositModalOpen(true);
  };

  // Build combined ledger records with Item Name & Category
  const enrichedLedger = useMemo(() => {
    const savingsMap = new Map(savings.map(s => [s.id, s]));
    return deposits.map(dep => {
      const item = savingsMap.get(dep.savingId);
      return {
        ...dep,
        name: item?.name || 'Unknown',
        category: item?.category || 'Investment'
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [deposits, savings]);

  // Unique Filter Options
  const filterOptions = useMemo(() => {
    const names = Array.from(new Set(savings.map(s => s.name)));
    const categories = Array.from(new Set(savings.map(s => s.category)));
    const banks = Array.from(new Set(deposits.map(d => d.bank).filter(Boolean)));
    return {
      names: ['All', ...names],
      categories: ['All', ...categories],
      banks: ['All', ...banks]
    };
  }, [savings, deposits]);

  // Filtered Ledger List
  const filteredLedger = useMemo(() => {
    return enrichedLedger.filter(row => {
      const matchName = selectedNameFilter === 'All' || row.name === selectedNameFilter;
      const matchCategory = selectedCategoryFilter === 'All' || row.category === selectedCategoryFilter;
      const matchBank = selectedBankFilter === 'All' || row.bank === selectedBankFilter;
      return matchName && matchCategory && matchBank;
    });
  }, [enrichedLedger, selectedNameFilter, selectedCategoryFilter, selectedBankFilter]);

  const filteredTotal = useMemo(() => {
    return filteredLedger.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [filteredLedger]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-emerald-400">
        <Loader2 className="animate-spin mr-2" size={24} />
        <span>Loading Savings Data...</span>
      </div>
    );
  }

  // Calculate totals per saving item for summary cards
  const savingsWithTotals = savings.map(s => {
    const totalDeposited = deposits.filter(d => d.savingId === s.id).reduce((sum, d) => sum + parseFloat(d.amount), 0);
    return { ...s, totalValue: s.currentValue + totalDeposited };
  });

  const investments = savingsWithTotals.filter(s => s.category === 'Investment');
  const goals = savingsWithTotals.filter(s => s.category === 'Goal');
  const emergencies = savingsWithTotals.filter(s => s.category === 'Emergency Fund');

  const totalInvestments = investments.reduce((sum, s) => sum + s.totalValue, 0);
  const totalGoals = goals.reduce((sum, s) => sum + s.totalValue, 0);
  const totalEmergencies = emergencies.reduce((sum, s) => sum + s.totalValue, 0);
  const totalWealth = totalInvestments + totalGoals + totalEmergencies;

  const getCategoryBadgeColor = (cat) => {
    if (cat === 'Investment') return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    if (cat === 'Goal') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10 fade-in animate-in duration-200">
      
      {/* HEADER: Title & Button */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-2xl font-bold text-dark-text flex items-center">
            <Wallet className="mr-3 text-emerald-400" />
            Savings & Goals
          </h2>
          <p className="text-sm text-dark-muted mt-1">Track your net worth, SIPs, and financial goals.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-900/20"
        >
          <PlusCircle size={18} />
          <span className="font-medium hidden sm:inline">New Tracker</span>
        </button>
      </div>

      {/* SUMMARY WIDGETS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-card border border-emerald-500/30 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-dark-muted font-medium uppercase tracking-wider mb-1">Total Wealth</p>
          <p className="text-xl md:text-2xl font-bold text-emerald-400">₹{totalWealth.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-dark-card border border-indigo-500/30 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-dark-muted font-medium uppercase tracking-wider mb-1">Investments</p>
          <p className="text-xl md:text-2xl font-bold text-indigo-400">₹{totalInvestments.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-dark-card border border-amber-500/30 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-dark-muted font-medium uppercase tracking-wider mb-1">Goals Saved</p>
          <p className="text-xl md:text-2xl font-bold text-amber-400">₹{totalGoals.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-dark-card border border-rose-500/30 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-dark-muted font-medium uppercase tracking-wider mb-1">Emergency Fund</p>
          <p className="text-xl md:text-2xl font-bold text-rose-400">₹{totalEmergencies.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
        </div>
      </div>

      {/* 1. INVESTMENTS SECTION */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-dark-text flex items-center border-b border-dark-border pb-2">
          <TrendingUp className="mr-2 text-indigo-400" size={20}/> Investments (MFs / ETFs)
        </h3>
        {investments.length === 0 ? (
          <p className="text-dark-muted text-sm italic">No investments tracked yet. Click 'New Tracker' to add MFs or ETFs.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {investments.map(inv => (
              <div key={inv.id} className="bg-dark-card border border-dark-border rounded-xl p-5 shadow-sm hover:border-indigo-500/50 transition-colors">
                <p className="text-sm font-medium text-dark-muted mb-1 uppercase tracking-wider">Current Value</p>
                <h4 className="text-2xl font-bold text-dark-text mb-4">₹{inv.totalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</h4>
                <div className="flex justify-between items-center pt-4 border-t border-dark-border">
                  <span className="font-medium text-dark-text">{inv.name}</span>
                  <button onClick={() => openDepositModal(inv)} className="text-xs font-medium bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors">
                    + Add SIP
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. GOALS SECTION */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-dark-text flex items-center border-b border-dark-border pb-2 mt-8">
          <Target className="mr-2 text-amber-400" size={20}/> Things to Buy & Trips
        </h3>
        {goals.length === 0 ? (
          <p className="text-dark-muted text-sm italic">No goals set yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map(goal => {
              const progress = goal.targetAmount > 0 ? Math.min(100, (goal.totalValue / goal.targetAmount) * 100) : 0;
              return (
                <div key={goal.id} className="bg-dark-card border border-dark-border rounded-xl p-5 shadow-sm hover:border-amber-500/50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-dark-text text-lg">{goal.name}</h4>
                      <p className="text-sm text-dark-muted mt-0.5">Target: ₹{goal.targetAmount?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <button onClick={() => openDepositModal(goal)} className="text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors">
                      + Save Money
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-text font-bold">₹{goal.totalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                      <span className="font-medium text-amber-400">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2 bg-dark-bg rounded-full overflow-hidden border border-dark-border">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. EMERGENCY FUND SECTION */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-dark-text flex items-center border-b border-dark-border pb-2 mt-8">
          <ShieldAlert className="mr-2 text-rose-400" size={20}/> Emergency Funds
        </h3>
        {emergencies.length === 0 ? (
          <p className="text-dark-muted text-sm italic">No emergency fund setup. Build a safety net for peace of mind.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            {emergencies.map(ef => (
              <div key={ef.id} className="bg-dark-card border border-dark-border rounded-xl p-5 shadow-sm hover:border-rose-500/50 transition-colors">
                <p className="text-sm font-medium text-dark-muted mb-1 uppercase tracking-wider">Safety Net</p>
                <h4 className="text-2xl font-bold text-dark-text mb-4">₹{ef.totalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</h4>
                <div className="flex justify-between items-center pt-4 border-t border-dark-border">
                  <span className="font-medium text-dark-text">{ef.name}</span>
                  <button onClick={() => openDepositModal(ef)} className="text-xs font-medium bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg transition-colors">
                    + Add Funds
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- 4. INVESTMENT & SAVINGS TRANSACTION LEDGER TABLE --- */}
      <div className="bg-dark-card border border-dark-border rounded-xl shadow-sm overflow-hidden flex flex-col mt-10">
        
        {/* Table Header & Multi-Filter Bar */}
        <div className="p-6 border-b border-dark-border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-dark-bg/40">
          <div>
            <h3 className="text-lg font-semibold text-dark-text flex items-center">
              <Filter size={18} className="mr-2 text-emerald-400" />
              Savings & Investment Transactions
            </h3>
            <p className="text-sm text-dark-muted mt-1">
              Filtered Total: <span className="text-emerald-400 font-bold ml-1">₹{filteredTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Filter by Name */}
            <div className="w-full sm:w-48">
              <label className="block text-xs text-dark-muted mb-1 font-medium">Investment / Goal</label>
              <CustomSelect 
                value={selectedNameFilter} 
                options={filterOptions.names} 
                onChange={setSelectedNameFilter} 
              />
            </div>

            {/* Filter by Category */}
            <div className="w-full sm:w-40">
              <label className="block text-xs text-dark-muted mb-1 font-medium">Category</label>
              <CustomSelect 
                value={selectedCategoryFilter} 
                options={filterOptions.categories} 
                onChange={setSelectedCategoryFilter} 
              />
            </div>

            {/* Filter by Bank Source */}
            <div className="w-full sm:w-40">
              <label className="block text-xs text-dark-muted mb-1 font-medium">Bank Source</label>
              <CustomSelect 
                value={selectedBankFilter} 
                options={filterOptions.banks} 
                onChange={setSelectedBankFilter} 
              />
            </div>
          </div>
        </div>

        {/* Transactions Table View */}
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-sm text-dark-muted">
            <thead className="bg-dark-bg text-xs uppercase border-b border-dark-border text-dark-text sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Bank Source</th>
                <th className="px-6 py-4 font-medium text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {filteredLedger.length > 0 ? (
                filteredLedger.map((txn) => (
                  <tr key={txn.id} className="hover:bg-dark-border/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-dark-text font-medium flex items-center">
                      <Calendar size={14} className="mr-2 text-dark-muted" />
                      {txn.date}
                    </td>
                    <td className="px-6 py-4 font-medium text-dark-text">
                      {txn.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getCategoryBadgeColor(txn.category)}`}>
                        {txn.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">{txn.bank || '-'}</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-400 whitespace-nowrap">
                      +₹{parseFloat(txn.amount).toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-dark-muted">
                    No transactions match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Counter */}
        <div className="p-4 bg-dark-bg/40 border-t border-dark-border text-xs text-dark-muted text-right">
          Showing {filteredLedger.length} transaction(s)
        </div>

      </div>

      {/* --- ADD NEW SAVING TRACKER MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-dark-text">Create New Tracker</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-dark-muted hover:text-dark-text"><X size={18}/></button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-muted mb-1">Tracker Name</label>
                <input 
                  type="text" required placeholder="e.g. Nippon Gold BeES ETF, Parag Parikh Flexi Cap Fund Direct"
                  value={addFormData.name} onChange={(e) => setAddFormData({...addFormData, name: e.target.value})}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-muted mb-1">Category</label>
                <CustomSelect 
                  value={addFormData.category} 
                  options={['Investment', 'Goal', 'Emergency Fund']} 
                  onChange={(val) => setAddFormData({...addFormData, category: val})} 
                />
              </div>
              {addFormData.category === 'Goal' && (
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">Target Amount (₹)</label>
                  <input 
                    type="number" required min="1" placeholder="e.g. 50000"
                    value={addFormData.targetAmount} onChange={(e) => setAddFormData({...addFormData, targetAmount: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              )}
              <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white py-2.5 rounded-lg transition-colors font-medium flex justify-center items-center shadow-lg shadow-emerald-900/20">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Create Tracker'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD FUNDS / SIP MODAL --- */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-dark-text">Add Funds / SIP</h2>
              <button onClick={() => setIsDepositModalOpen(false)} className="text-dark-muted hover:text-dark-text"><X size={18}/></button>
            </div>
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-muted mb-1">Date</label>
                <input 
                  type="date" required style={{ colorScheme: 'dark' }}
                  value={depositFormData.date} onChange={(e) => setDepositFormData({...depositFormData, date: e.target.value})}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-muted mb-1">Amount (₹)</label>
                <input 
                  type="number" required min="1" placeholder="e.g. 5000"
                  value={depositFormData.amount} onChange={(e) => setDepositFormData({...depositFormData, amount: e.target.value})}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-muted mb-1">Bank Source</label>
                <CustomSelect 
                  value={depositFormData.bank} 
                  options={paymentModes.length ? paymentModes : ['Bank Account']} 
                  onChange={(val) => setDepositFormData({...depositFormData, bank: val})} 
                />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white py-2.5 rounded-lg transition-colors font-medium flex justify-center items-center shadow-lg shadow-indigo-900/20">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Deposit'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}