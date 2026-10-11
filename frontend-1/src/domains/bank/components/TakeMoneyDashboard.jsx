import { useState, useEffect, useMemo } from 'react';
import { User, Receipt, CheckCircle2, Loader2, Calendar, Search, Filter, ChevronDown, ArrowRightLeft, HandCoins, PlusCircle, X } from 'lucide-react';
import { fetchSharedExpenses, settleSharedExpense, fetchGiveMoney, addGiveMoney, settleGiveMoney, fetchFriends, addSharedExpense } from '../../../../src/api/client.js';

const CustomSelect = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative w-full">
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-indigo-500 transition-colors text-sm">
        <span className="truncate pr-2">{value}</span>
        <ChevronDown size={14} className={`text-dark-muted shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <ul className="absolute top-full right-0 mt-1 w-full z-50 bg-dark-card border border-dark-border rounded-lg shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto custom-scrollbar">
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

export default function TakeMoneyDashboard() {
  const [mode, setMode] = useState('take');

  const [takeSplits, setTakeSplits] = useState([]);
  const [giveSplits, setGiveSplits] = useState([]);
  const [friendList, setFriendList] = useState([]);
  
  const [activeFriend, setActiveFriend] = useState(null);
  const [loading, setLoading] = useState(true);

  const [tableFilter, setTableFilter] = useState('All'); 
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reusable form state for both Add Take and Add Give
  const [addForm, setAddForm] = useState({ friend: '', date: new Date().toISOString().split('T')[0], description: '', amount: '' });

  // Partial Payment Modal State
  const [settleModal, setSettleModal] = useState({ isOpen: false, split: null, amount: '' });

  const loadData = async () => {
    try {
      const [takeRes, giveRes, friendsRes] = await Promise.all([
        fetchSharedExpenses(),
        fetchGiveMoney(),
        fetchFriends()
      ]);
      setTakeSplits(takeRes.data || []);
      setGiveSplits(giveRes.data || []);
      
      const fNames = (friendsRes.data || []).map(f => f.name);
      setFriendList(fNames);
      if (fNames.length > 0) setAddForm(prev => ({ ...prev, friend: fNames[0] }));
      
    } catch (error) { console.error("Failed to load splits", error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  // FIXED REACT WARNING: Removed the useEffect that was listening to [mode]
  // The state resets are now handled directly inside the handleModeSwitch function below.

  const handleModeSwitch = () => {
    setMode(prev => prev === 'take' ? 'give' : 'take');
    setActiveFriend(null);
    setSearchQuery('');
    setTableFilter('All');
  };

  const activeSplits = mode === 'take' ? takeSplits : giveSplits;

  // Handles Full and Partial Settlements
  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    const split = settleModal.split;
    const paidAmount = parseFloat(settleModal.amount);
    const currentOwed = parseFloat(split.Amount_Owed);
    const newOwed = currentOwed - paidAmount;
    
    const isFullySettled = newOwed <= 0;
    const newStatus = isFullySettled ? 'Settled' : 'Partially Paid';

    // Optimistically update the UI
    if (mode === 'take') {
      setTakeSplits(takeSplits.map(s => s.Split_ID === split.Split_ID ? { ...s, Amount_Owed: newOwed > 0 ? newOwed : 0, Status: newStatus } : s));
      try { await settleSharedExpense(split.Split_ID, paidAmount); } catch (err) { console.error(err); }
    } else {
      setGiveSplits(giveSplits.map(s => s.Give_ID === split.Give_ID ? { ...s, Amount_Owed: newOwed > 0 ? newOwed : 0, Status: newStatus } : s));
      try { await settleGiveMoney(split.Give_ID, paidAmount); } catch (err) { console.error(err); }
    }

    setSettleModal({ isOpen: false, split: null, amount: '' });
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const d = new Date(addForm.date);
      const formattedDate = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      
      if (mode === 'give') {
         await addGiveMoney({ friend: addForm.friend, date: formattedDate, description: addForm.description, amount: addForm.amount });
      } else if (mode === 'take') {
         await addSharedExpense({
            Date: formattedDate,
            Description: addForm.description,
            Amount_Owed: addForm.amount,
            Friend_Name: addForm.friend,
            Status: 'Pending',
            Original_Txn_ID: 'Manual Entry'
         });
      }
      
      await loadData();
      setIsAddModalOpen(false);
      setAddForm({ friend: friendList[0] || '', date: new Date().toISOString().split('T')[0], description: '', amount: '' });
    } catch (error) { console.error(error); } 
    finally { setIsSubmitting(false); }
  };

  const pendingSplits = activeSplits.filter(s => s.Status === 'Pending' || s.Status === 'Partially Paid');
  const totalAmount = pendingSplits.reduce((sum, split) => sum + parseFloat(split.Amount_Owed || 0), 0);

  const friendsMap = pendingSplits.reduce((acc, split) => {
    if (!acc[split.Friend_Name]) acc[split.Friend_Name] = 0;
    acc[split.Friend_Name] += parseFloat(split.Amount_Owed || 0);
    return acc;
  }, {});

  const tableData = useMemo(() => {
    let data = [...activeSplits].sort((a, b) => new Date(b.Date) - new Date(a.Date));
    if (tableFilter !== 'All') {
      if (tableFilter === 'Pending') {
        data = data.filter(s => s.Status === 'Pending' || s.Status === 'Partially Paid');
      } else {
        data = data.filter(s => s.Status === tableFilter);
      }
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      data = data.filter(s => s.Friend_Name?.toLowerCase().includes(q) || s.Description?.toLowerCase().includes(q));
    }
    return data;
  }, [activeSplits, tableFilter, searchQuery]);

  const theme = {
    primary: mode === 'take' ? 'indigo' : 'rose',
    text: mode === 'take' ? 'text-indigo-400' : 'text-rose-400',
    border: mode === 'take' ? 'border-indigo-500' : 'border-rose-500',
    bgLight: mode === 'take' ? 'bg-indigo-500/10' : 'bg-rose-500/10',
    borderLight: mode === 'take' ? 'border-indigo-500/30' : 'border-rose-500/30',
    hoverText: mode === 'take' ? 'hover:text-indigo-400' : 'hover:text-rose-400',
    buttonBg: mode === 'take' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-rose-600 hover:bg-rose-500',
    iconHover: mode === 'take' ? 'group-hover:text-indigo-400' : 'group-hover:text-rose-400',
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in animate-in duration-200 pb-10">
      
      {/* --- MAIN 2-COLUMN LAYOUT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 flex flex-col space-y-4">
          <div className="flex gap-4">
            <div className={`flex-1 bg-dark-card border ${theme.borderLight} rounded-xl p-4 flex flex-col justify-center shadow-sm`}>
              <p className="text-dark-muted text-xs font-medium mb-1 uppercase tracking-wider">{mode === 'take' ? 'Total Outstanding' : 'Total To Pay'}</p>
              <h3 className={`text-xl sm:text-2xl font-bold ${theme.text}`}>₹{totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
            </div>
            <button onClick={handleModeSwitch} className="flex-1 bg-dark-card border border-dark-border hover:border-emerald-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all hover:bg-dark-bg shadow-sm group">
              <ArrowRightLeft className="text-dark-muted group-hover:text-emerald-400 transition-colors" size={20} />
              <span className="text-xs font-semibold text-dark-text uppercase tracking-wider text-center">Switch to {mode === 'take' ? 'Give' : 'Take'}</span>
            </button>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-xl flex flex-col shadow-sm flex-1 max-h-[500px]">
            <div className="p-4 border-b border-dark-border bg-dark-bg/50 shrink-0">
              <h3 className="font-semibold text-dark-text flex items-center gap-2">
                {mode === 'take' ? <User size={18} className="text-emerald-400"/> : <HandCoins size={18} className="text-rose-400"/>}
                {mode === 'take' ? 'Who Owes You' : 'Who I Owe'}
              </h3>
            </div>
            <div className="divide-y divide-dark-border overflow-y-auto flex-1 custom-scrollbar">
              {Object.keys(friendsMap).length === 0 ? (
                <div className="p-6 text-center text-dark-muted text-sm italic">No pending balances.</div>
              ) : (
                Object.entries(friendsMap).map(([friend, amount]) => (
                  <button
                    key={friend}
                    onClick={() => setActiveFriend(activeFriend === friend ? null : friend)}
                    className={`w-full flex items-center justify-between p-4 transition-colors ${activeFriend === friend ? `${theme.bgLight} border-l-4${theme.border}` : 'hover:bg-dark-bg border-l-4 border-l-transparent'}`}
                  >
                    <span className={`font-medium ${activeFriend === friend ? theme.text : 'text-dark-text'}`}>{friend}</span>
                    <span className={`font-bold ${theme.text}`}>₹{amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
            <h3 className="font-semibold text-dark-text flex items-center gap-2">
              <Receipt size={18} className={mode === 'take' ? 'text-emerald-400' : 'text-rose-400'}/>
              {mode === 'take' ? 'All Pending Bills' : 'Bills I Need To Pay'}
            </h3>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-48 shrink-0">
                <CustomSelect value={activeFriend || 'All Friends'} options={['All Friends', ...Object.keys(friendsMap)]} onChange={(val) => setActiveFriend(val === 'All Friends' ? null : val)} />
              </div>
              
              <button onClick={() => setIsAddModalOpen(true)} className={`flex items-center justify-center text-white px-3 py-2.5 rounded-lg transition-colors shadow-lg font-medium text-sm shrink-0 ${theme.buttonBg} ${mode === 'take' ? 'shadow-indigo-900/20' : 'shadow-rose-900/20'}`}>
                <PlusCircle size={16} className="sm:mr-1.5" />
                <span className="hidden sm:inline">{mode === 'take' ? 'Add Take' : 'Add Owed'}</span>
              </button>
              
            </div>
          </div>
          
          <div className="overflow-y-auto max-h-[550px] custom-scrollbar pr-2 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingSplits
                .filter(s => activeFriend ? s.Friend_Name === activeFriend : true)
                .map((split) => (
                <div key={split.Split_ID || split.Give_ID} className={`bg-dark-card border border-dark-border rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-${theme.primary}-500/30 transition-colors`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="pr-2">
                      <h4 className="font-medium text-dark-text leading-tight flex items-center gap-2">{split.Description}</h4>
                      <p className="text-xs text-dark-muted mt-1.5 flex items-center">
                        <Calendar size={12} className="mr-1 opacity-70" /> 
                        {split.Date} <span className="mx-1.5">•</span> <span className={`font-medium ${theme.text} opacity-80`}>{split.Friend_Name}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 pl-3">
                      <span className={`font-bold ${theme.text}`}>₹{parseFloat(split.Amount_Owed).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      {split.Status === 'Partially Paid' && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded uppercase mt-1">Partial</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSettleModal({ isOpen: true, split: split, amount: split.Amount_Owed })}
                    className="mt-2 w-full py-2 bg-dark-bg border border-dark-border hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 text-dark-muted rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 group"
                  >
                    <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" />
                    Settle Bill
                  </button>
                </div>
              ))}
              
              {pendingSplits.filter(s => activeFriend ? s.Friend_Name === activeFriend : true).length === 0 && (
                <div className="col-span-full p-8 text-center text-dark-muted bg-dark-card border border-dark-border border-dashed rounded-xl">
                  {mode === 'take' ? 'All caught up! Nobody owes you money right now.' : 'You are debt-free! You owe nobody money.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- HISTORICAL SPLITS TABLE --- */}
      <div className="bg-dark-card border border-dark-border rounded-xl shadow-sm overflow-hidden flex flex-col mt-10">
        <div className="p-6 border-b border-dark-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-dark-bg/40">
          <h3 className="text-lg font-semibold text-dark-text flex items-center">
            <Filter size={18} className={`mr-2 ${theme.text}`} />
            {mode === 'take' ? 'Split Ledger History' : 'Give Money History'}
          </h3>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input type="text" placeholder="Search friend or bill..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full bg-dark-bg border border-dark-border rounded-lg pl-9 pr-3 py-2 text-sm text-dark-text focus:outline-none focus:${theme.border}`} />
              <Search size={16} className="absolute left-3 top-2.5 text-dark-muted" />
            </div>
            
            <div className="flex bg-dark-bg rounded-lg p-1 border border-dark-border w-full sm:w-auto shrink-0">
              {['All', 'Pending', 'Settled'].map(status => (
                <button
                  key={status} 
                  onClick={() => setTableFilter(status)}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${tableFilter === status ? `bg-dark-card ${theme.text} shadow-sm border border-dark-border` : 'text-dark-muted hover:text-dark-text'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96 custom-scrollbar">
          <table className="w-full text-left text-sm text-dark-muted">
            <thead className="bg-dark-bg text-xs uppercase border-b border-dark-border text-dark-text sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium">Friend</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {tableData.length > 0 ? (
                tableData.map((txn) => (
                  <tr key={txn.Split_ID || txn.Give_ID} className="hover:bg-dark-border/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-dark-text flex items-center">
                      <Calendar size={14} className="mr-2 text-dark-muted" /> {txn.Date}
                    </td>
                    <td className="px-6 py-4 font-medium text-dark-text">{txn.Description}</td>
                    <td className={`px-6 py-4 font-medium ${theme.text} opacity-80`}>{txn.Friend_Name}</td>
                    <td className="px-6 py-4 flex justify-center">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border flex items-center gap-1 ${
                        txn.Status === 'Settled' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        txn.Status === 'Partially Paid' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {txn.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-dark-text whitespace-nowrap">
                      ₹{parseFloat(txn.Amount_Owed).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-dark-muted">No records match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD ENTRY MODAL (DYNAMIC FOR TAKE/GIVE) --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-dark-text">
                {mode === 'take' ? 'Log Money Owed to You' : 'Log Money You Owe'}
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-dark-muted hover:text-dark-text"><X size={18}/></button>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">Date</label>
                  <input type="date" required style={{ colorScheme: 'dark' }} value={addForm.date} onChange={(e) => setAddForm({...addForm, date: e.target.value})} className={`w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:${theme.border} text-sm`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">Select Friend</label>
                  <CustomSelect value={addForm.friend} options={friendList} onChange={(val) => setAddForm({...addForm, friend: val})} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-dark-muted mb-1">Description (What was it for?)</label>
                <input type="text" required placeholder="e.g. Dinner at XYZ" value={addForm.description} onChange={(e) => setAddForm({...addForm, description: e.target.value})} className={`w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:${theme.border} text-sm`} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-dark-muted mb-1">Amount (₹)</label>
                <input type="number" required min="1" step="any" placeholder="0" value={addForm.amount} onChange={(e) => setAddForm({...addForm, amount: e.target.value})} className={`w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:${theme.border} text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} />
              </div>
              
              <button type="submit" disabled={isSubmitting} className={`w-full mt-4 text-white py-2.5 rounded-lg transition-colors font-medium flex justify-center items-center shadow-lg text-sm ${theme.buttonBg} ${mode === 'take' ? 'shadow-indigo-900/20 disabled:bg-indigo-800' : 'shadow-rose-900/20 disabled:bg-rose-800'}`}>
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : `Save ${mode === 'take' ? 'Take' : 'Owed'} Amount`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- PARTIAL SETTLEMENT MODAL --- */}
      {settleModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-dark-text">Settle Balance</h2>
              <button onClick={() => setSettleModal({ isOpen: false, split: null, amount: '' })} className="text-dark-muted hover:text-dark-text"><X size={18}/></button>
            </div>

            <form onSubmit={handleSettleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark-muted mb-2">How much is being paid? (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-dark-muted font-medium">₹</span>
                  <input 
                    type="number" 
                    required min="1" step="any" max={settleModal.split.Amount_Owed}
                    value={settleModal.amount} 
                    onChange={(e) => setSettleModal({...settleModal, amount: e.target.value})} 
                    className={`w-full bg-dark-bg border border-dark-border rounded-lg pl-8 pr-3 py-2.5 text-dark-text focus:outline-none focus:${theme.border} text-lg font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} 
                  />
                </div>
                <div className="flex justify-between items-center mt-2 px-1">
                  <p className="text-xs text-dark-muted">Total remaining: <span className="font-semibold text-dark-text">₹{parseFloat(settleModal.split.Amount_Owed).toLocaleString()}</span></p>
                  <button type="button" onClick={() => setSettleModal({...settleModal, amount: settleModal.split.Amount_Owed})} className={`text-xs font-bold ${theme.text}`}>Pay Full</button>
                </div>
              </div>
              
              <button type="submit" className={`w-full py-2.5 rounded-lg transition-colors font-medium flex justify-center items-center shadow-lg text-sm text-white ${theme.buttonBg}`}>
                Confirm Payment
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}