import { useState, useEffect } from 'react';
import { X, Loader2, PlusCircle, SplitSquareHorizontal, Trash2, ChevronDown, RefreshCw } from 'lucide-react';
import { fetchPaymentModes, fetchFriends, addTransaction } from '../../../api/client';

// --- CUSTOM SELECT COMPONENT ---
const CustomSelect = ({ value, options, onChange, placeholder = "Select..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative w-full">
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[#151923] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
      >
        <span>{value || placeholder}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul className="absolute top-full left-0 mt-1 w-full z-50 bg-[#1c212e] border border-gray-700 rounded-lg shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <li
              key={opt.value || opt}
              onClick={() => {
                onChange(opt.value || opt);
                setIsOpen(false);
              }}
              className={`px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                value === (opt.value || opt) 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              {opt.label || opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// --- CUSTOM FRIEND SELECT DROPDOWN ---
const FriendSelectDropdown = ({ onAddFriend, friendsList }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customName, setCustomName] = useState('');

  const handleSelect = (name) => {
    onAddFriend(name);
    setIsOpen(false);
  };

  const handleCustomAdd = () => {
    if (customName.trim()) {
      onAddFriend(customName.trim());
      setCustomName('');
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full">
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[#151923] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-400 hover:text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
      >
        <span>Add friend from list or custom...</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full z-50 bg-[#1c212e] border border-gray-700 rounded-lg shadow-xl overflow-hidden py-1 max-h-56 overflow-y-auto">
          <div className="p-2 border-b border-gray-700 flex gap-2 bg-[#151923]">
            <input
              type="text"
              placeholder="Type new friend name..."
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCustomAdd();
                }
              }}
              className="flex-1 bg-transparent border border-gray-600 rounded-md px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleCustomAdd}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
            >
              Add
            </button>
          </div>

          <div className="py-1">
            {friendsList.map((name) => (
              <div
                key={name}
                onClick={() => handleSelect(name)}
                className="px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer flex items-center justify-between transition-colors"
              >
                <span>{name}</span>
                <span className="text-xs text-emerald-400 font-medium">+ Add</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function GlobalQuickAdd() {
  const [isOpen, setIsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Master Data
  const [paymentModes, setPaymentModes] = useState({ banks: [], cards: [] });
  const [friends, setFriends] = useState([]);

  // Form State
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    paymentType: 'Bank Account',
    accountId: '',
    date: today,
    type: 'Expense',
    category: 'Food',
    description: '',
    amount: ''
  });

  const CATEGORIES = ['Food', 'Groceries', 'Shopping', 'Tax', 'Travel', 'Entertainment', 'Personal Care', 'Appliance', 'Fee', 'Bill Pay', 'Rewards', 'Refund', 'Other', 'Gifts & Stuff'];
  const TYPES = ['Expense', 'Payment', 'Refund', 'Cashback'];

  // --- SPLIT BILL STATE ---
  const [isSplitEnabled, setIsSplitEnabled] = useState(false);
  const [splitMode, setSplitMode] = useState('Equal'); 
  const [participants, setParticipants] = useState([
    { id: 'me', name: 'Shreyas (Me)', included: true, exactValue: '', percentage: '', locked: false }
  ]);

  const totalAmount = parseFloat(form.amount) || 0;
  const includedParticipants = participants.filter(p => p.included);
  const includedCount = includedParticipants.length;

  const totalPercentage = splitMode === 'Percentage' 
    ? includedParticipants.reduce((sum, p) => sum + (parseFloat(p.percentage) || 0), 0) 
    : 0;

  const totalAssigned = splitMode === 'Custom'
    ? includedParticipants.reduce((sum, p) => sum + (parseFloat(p.exactValue) || 0), 0)
    : splitMode === 'Percentage'
      ? (totalPercentage / 100) * totalAmount
      : totalAmount;

  const isSplitValid = 
    !isSplitEnabled || 
    (splitMode === 'Equal' && includedCount > 0) ||
    (splitMode === 'Custom' && Math.abs(totalAssigned - totalAmount) < 0.01) ||
    (splitMode === 'Percentage' && Math.abs(totalPercentage - 100) < 0.01);

  // --- OFFLINE / ONLINE ENGINE ---
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncOfflineQueue(); };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) syncOfflineQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('offlineTxnQueue') || '[]');
    if (queue.length === 0) return;

    setIsSyncing(true);
    try {
      for (const txn of queue) {
        await addTransaction(txn);
      }
      localStorage.removeItem('offlineTxnQueue');
    } catch (err) {
      console.error("Background sync failed.", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- SMART INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      try {
        const [modesRes, friendsRes] = await Promise.all([
          fetchPaymentModes().catch(() => ({ data: JSON.parse(localStorage.getItem('cachedModes') || '[]') })),
          fetchFriends().catch(() => ({ data: JSON.parse(localStorage.getItem('cachedFriends') || '[]') }))
        ]);

        const modes = modesRes.data || [];
        const fList = (friendsRes.data || []).map(f => f.name);

        if (navigator.onLine) {
          localStorage.setItem('cachedModes', JSON.stringify(modes));
          localStorage.setItem('cachedFriends', JSON.stringify(fList));
        }

        const banks = modes.filter(m => m.type === 'Bank Account').map(m => m.name);
        const cards = modes.filter(m => m.type === 'Credit Card').map(m => m.name);
        setPaymentModes({ banks, cards });
        setFriends(fList);

        const defaultBank = banks.find(b => b.includes('BOM')) || banks[0] || '';
        setForm(prev => ({ ...prev, accountId: defaultBank }));

      } catch (err) { console.error("Failed to load config", err); } 
      finally { setLoadingConfig(false); }
    };

    init();

    const lastEntryDate = localStorage.getItem('lastEntryDate');
    if (lastEntryDate !== new Date().toDateString()) setIsOpen(true);
  }, []);

  const handleTypeChange = (type) => {
    const options = type === 'Bank Account' ? paymentModes.banks : paymentModes.cards;
    const defaultAcc = type === 'Bank Account' 
      ? (options.find(o => o.includes('BOM')) || options[0] || '')
      : (options.find(o => o.includes('Super Money')) || options[0] || '');
    setForm({ ...form, paymentType: type, accountId: defaultAcc });
  };

  // --- SPLIT ENGINE LOGIC ---
  const addFriend = (friendName) => {
    if (!friendName || participants.some(p => p.name.toLowerCase() === friendName.toLowerCase())) return;
    const newParticipant = { id: `friend-${Date.now()}`, name: friendName, included: true, exactValue: '', percentage: '', locked: false };
    setParticipants([...participants, newParticipant]);
  };

  const removeFriend = (id) => setParticipants(participants.filter(p => p.id !== id));
  const toggleParticipant = (id) => setParticipants(participants.map(p => p.id === id ? { ...p, included: !p.included, locked: false } : p));

  const handleCustomSplitChange = (id, field, value) => {
    const updated = participants.map(p => p.id === id ? { ...p, [field]: value, locked: true } : p);
    const otherIncluded = updated.filter(p => p.included && p.id !== id);
    const unlockedOthers = otherIncluded.filter(p => !p.locked);

    const targetGroup = unlockedOthers.length > 0 ? unlockedOthers : (otherIncluded.length > 0 ? [otherIncluded[otherIncluded.length - 1]] : []);

    if (targetGroup.length > 0) {
      const lockedSum = updated.filter(p => p.included && !targetGroup.some(t => t.id === p.id)).reduce((sum, p) => sum + (parseFloat(p[field]) || 0), 0);
      const totalPool = field === 'exactValue' ? totalAmount : 100;
      const remainder = Math.max(0, totalPool - lockedSum);
      const splitVal = (remainder / targetGroup.length);

      const finalParticipants = updated.map(p => {
        if (targetGroup.some(t => t.id === p.id)) {
          const formattedVal = field === 'exactValue' ? (splitVal % 1 === 0 ? splitVal.toString() : splitVal.toFixed(2)) : (splitVal % 1 === 0 ? splitVal.toString() : splitVal.toFixed(1));
          return { ...p, [field]: formattedVal };
        }
        return p;
      });
      setParticipants(finalParticipants);
      return;
    }
    setParticipants(updated);
  };

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSplitValid) return; 
    
    setIsSubmitting(true);

    const splitData = isSplitEnabled ? participants.filter(p => p.included && p.id !== 'me').map(p => {
      let owedAmount = 0;
      if (splitMode === 'Equal') owedAmount = totalAmount / includedCount;
      if (splitMode === 'Custom') owedAmount = parseFloat(p.exactValue) || 0;
      if (splitMode === 'Percentage') owedAmount = (totalAmount * (parseFloat(p.percentage) || 0)) / 100;
      return { Friend_Name: p.name, Amount_Owed: owedAmount };
    }) : [];

    const payload = {
      Date: new Date(form.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      Type: form.type,
      Category: form.category,
      Description: form.description,
      Amount: parseFloat(form.amount),
      Card_ID: form.accountId,
      splits: splitData
    };

    if (isOnline) {
      try {
        await addTransaction(payload);
        localStorage.setItem('lastEntryDate', new Date().toDateString());
      } catch (err) { queueTransaction(payload); }
    } else { queueTransaction(payload); }

    // Reset Form
    setIsSubmitting(false);
    setForm(prev => ({ ...prev, description: '', amount: '' }));
    setIsSplitEnabled(false);
    setParticipants([{ id: 'me', name: 'Shreyas (Me)', included: true, exactValue: '', percentage: '', locked: false }]);
    setIsOpen(false);
  };

  const queueTransaction = (payload) => {
    const queue = JSON.parse(localStorage.getItem('offlineTxnQueue') || '[]');
    queue.push(payload);
    localStorage.setItem('offlineTxnQueue', JSON.stringify(queue));
    localStorage.setItem('lastEntryDate', new Date().toDateString());
    alert("Saved Offline! Will sync automatically when internet is restored.");
  };

  // --- RENDER ---
  if (!isOpen && !isSyncing) return (
    <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 bg-emerald-500 text-[#151923] p-4 rounded-full shadow-xl shadow-emerald-500/20 hover:scale-110 transition-all z-50">
      <PlusCircle size={24} />
    </button>
  );

  return (
    <>
      {isSyncing && (
        <div className="fixed top-4 right-4 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center z-50 animate-pulse">
          <RefreshCw size={12} className="mr-2 animate-spin" /> Syncing Offline Data...
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f111a]/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`bg-[#1c212e] border border-gray-700 rounded-xl shadow-2xl w-full transition-all duration-300 ${isSplitEnabled ? 'max-w-3xl' : 'max-w-md'} relative flex flex-col md:flex-row overflow-hidden my-8`}>
            
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white transition-colors bg-gray-800 p-1.5 rounded-full border border-gray-700 shadow-md">
              <X size={18} />
            </button>

            {loadingConfig ? (
              <div className="flex justify-center items-center w-full py-20"><Loader2 className="animate-spin text-emerald-500" /></div>
            ) : (
              <>
                {/* LEFT: MAIN FORM */}
                <div className={`p-6 flex-1 overflow-y-auto ${isSplitEnabled ? 'border-r border-gray-700' : ''}`}>
                  <h2 className="text-xl font-semibold text-gray-100 mb-6">Add New Transaction</h2>

                  <form id="global-txn-form" onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Bank vs Credit Toggle */}
                    <div className="flex bg-[#151923] p-1 rounded-lg border border-gray-700">
                      {['Bank Account', 'Credit Card'].map(mode => (
                        <button 
                          key={mode} type="button" onClick={() => handleTypeChange(mode)}
                          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${form.paymentType === mode ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Account</label>
                        <CustomSelect 
                          value={form.accountId} 
                          options={form.paymentType === 'Bank Account' ? paymentModes.banks : paymentModes.cards} 
                          onChange={(val) => setForm({...form, accountId: val})} 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Date</label>
                        <input 
                          type="date" required style={{ colorScheme: 'dark' }} value={form.date} onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full bg-[#151923] border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 text-sm shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Type</label>
                        <CustomSelect value={form.type} options={TYPES} onChange={(val) => setForm(prev => ({ ...prev, type: val }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Category</label>
                        <CustomSelect value={form.category} options={CATEGORIES} onChange={(val) => setForm(prev => ({ ...prev, category: val }))} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
                      <input 
                        type="text" required autoComplete="off" placeholder="e.g., Swiggy - Paneer Dam Biryani"
                        value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full bg-[#151923] border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 focus:outline-none focus:border-emerald-500 text-sm shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1.5">Amount (₹)</label>
                      <input 
                        type="number" required min="1" step="any" placeholder="e.g. 450"
                        value={form.amount} onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full bg-[#151923] border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 focus:outline-none focus:border-emerald-500 text-sm shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {form.type === 'Expense' && (
                      <div className="pt-2">
                        <button 
                          type="button" 
                          onClick={() => setIsSplitEnabled(!isSplitEnabled)}
                          className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg border border-dashed transition-all text-sm ${isSplitEnabled ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'border-gray-600 hover:bg-gray-800 text-gray-400 hover:border-gray-400'}`}
                        >
                          <SplitSquareHorizontal size={18} />
                          <span className="font-medium">{isSplitEnabled ? 'Split Bill Enabled' : 'Split this expense'}</span>
                        </button>
                      </div>
                    )}

                    {!isSplitEnabled && (
                      <button type="submit" form="global-txn-form" disabled={isSubmitting} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-medium py-3 rounded-lg transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98]">
                        {isSubmitting ? 'Saving...' : 'Save Transaction'}
                      </button>
                    )}
                  </form>
                </div>

                {/* RIGHT: SPLIT CALCULATOR */}
                {isSplitEnabled && (
                  <div className="p-6 flex-1 bg-[#151923]/50 flex flex-col overflow-y-auto animate-in slide-in-from-right-8 duration-300">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">Split Details</h3>
                    
                    {/* Mode Switcher */}
                    <div className="flex bg-[#151923] rounded-lg p-1 border border-gray-700 mb-4 shadow-sm">
                      {['Equal', 'Custom', 'Percentage'].map(mode => (
                        <button
                          key={mode} type="button" onClick={() => setSplitMode(mode)}
                          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${splitMode === mode ? 'bg-gray-700 text-emerald-400 shadow-sm border border-gray-600' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Add Friend to Split</label>
                      <FriendSelectDropdown onAddFriend={addFriend} friendsList={friends} />
                    </div>

                    {/* Participants Breakdown */}
                    <div className="flex-1 space-y-3 mb-6 overflow-y-auto max-h-60 pr-1 custom-scrollbar">
                      {participants.map((p) => (
                        <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all shadow-sm ${p.included ? 'bg-[#1c212e] border-gray-700' : 'bg-gray-800/50 border-gray-700/50 opacity-50'}`}>
                          
                          <div className="flex items-center space-x-3 flex-1 min-w-0 pr-2">
                            <input 
                              type="checkbox" checked={p.included} onChange={() => toggleParticipant(p.id)}
                              className="w-4 h-4 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 bg-[#151923] cursor-pointer"
                            />
                            <span className="text-sm font-medium text-gray-200 truncate">{p.name}</span>
                          </div>

                          {p.included && (
                            <div className="flex items-center space-x-2 w-[55%] justify-end shrink-0">
                              {/* EQUAL MODE */}
                              {splitMode === 'Equal' && (
                                <span className="text-emerald-400 font-semibold text-sm text-right w-full">
                                  ₹{(totalAmount / (includedCount || 1)).toFixed(2)}
                                </span>
                              )}
                              
                              {/* CUSTOM MODE */}
                              {splitMode === 'Custom' && (
                                <div className="relative w-28">
                                  <span className="absolute left-2.5 top-1.5 text-gray-400 text-xs">₹</span>
                                  <input 
                                    type="number" value={p.exactValue} onChange={(e) => handleCustomSplitChange(p.id, 'exactValue', e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-[#151923] border border-gray-700 rounded px-2 py-1 pl-6 text-sm text-gray-200 outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-right font-medium"
                                  />
                                </div>
                              )}

                              {/* PERCENTAGE MODE */}
                              {splitMode === 'Percentage' && (
                                <div className="flex flex-col items-end w-28">
                                  <div className="relative w-full">
                                    <input 
                                      type="number" value={p.percentage} onChange={(e) => handleCustomSplitChange(p.id, 'percentage', e.target.value)}
                                      placeholder="0"
                                      className="w-full bg-[#151923] border border-gray-700 rounded px-2 py-1 pr-6 text-sm text-gray-200 outline-none text-right focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-medium"
                                    />
                                    <span className="absolute right-2 top-1 text-gray-400 text-xs">%</span>
                                  </div>
                                  <span className="text-xs text-emerald-400 font-medium mt-0.5">
                                    ₹{((parseFloat(p.percentage) || 0) * totalAmount / 100).toFixed(2)}
                                  </span>
                                </div>
                              )}

                              {p.id !== 'me' && (
                                <button type="button" onClick={() => removeFriend(p.id)} className="text-gray-500 hover:text-rose-400 transition-colors p-1 shrink-0">
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-700 pt-4 mt-auto">
                      <button 
                        type="submit" form="global-txn-form" 
                        disabled={isSubmitting || !isSplitValid} 
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/40 disabled:text-gray-500 text-white font-medium py-3 rounded-lg transition-all shadow-lg shadow-indigo-900/20 flex justify-center items-center text-sm active:scale-[0.98]"
                      >
                        {isSubmitting ? 'Saving...' : 'Save & Track Owed Money'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}