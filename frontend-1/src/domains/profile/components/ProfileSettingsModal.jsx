import { useState, useEffect } from 'react';
import { X, User, Users, Landmark, Plus, Loader2, Pencil, Trash2, Check, ChevronDown, CheckSquare, CreditCard, ShoppingBag, PiggyBank } from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  fetchFriends, addFriend, editFriend, deleteFriend, 
  fetchPaymentModes, addPaymentMode, editPaymentMode, deletePaymentMode,
  fetchEmis, fetchSavings 
} from '../../../api/client';

// --- CUSTOM SELECT COMPONENT FOR PAYMENT MODES ---
const CustomSelect = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative w-40 h-full flex items-center">
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-transparent border-none text-sm text-dark-text px-3 focus:outline-none"
      >
        <span className="truncate">{value}</span>
        <ChevronDown size={14} className={`text-dark-muted shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul className="absolute top-[120%] right-0 mt-1 w-48 z-50 bg-dark-card border border-dark-border rounded-lg shadow-xl overflow-hidden py-1">
          {options.map((opt) => (
            <li
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                value === opt 
                  ? 'bg-amber-500/20 text-amber-400' 
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

export default function ProfileSettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('checklist');
  
  // Master Data
  const [friends, setFriends] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);
  const [emis, setEmis] = useState([]);
  const [savings, setSavings] = useState([]);
  
  // New Item States
  const [newFriendName, setNewFriendName] = useState('');
  const [newModeName, setNewModeName] = useState('');
  const [newModeType, setNewModeType] = useState('Bank Account');
  
  // Inline Editing States
  const [editingFriendId, setEditingFriendId] = useState(null);
  const [editingFriendName, setEditingFriendName] = useState('');
  const [editingModeId, setEditingModeId] = useState(null);
  const [editingModeName, setEditingModeName] = useState('');

  // Daily Checklist State
  const [dailyChecks, setDailyChecks] = useState(() => {
    const today = new Date().toLocaleDateString('en-GB');
    const storedData = JSON.parse(localStorage.getItem('dailySettlementChecks') || '{}');
    if (storedData.date !== today) return {};
    return storedData.checks || {};
  });

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadMasterData = async () => {
      setLoading(true);
      try {
        const [fRes, pRes, eRes, sRes] = await Promise.all([
          fetchFriends(), 
          fetchPaymentModes(),
          fetchEmis(),
          fetchSavings()
        ]);
        setFriends(fRes.data);
        setPaymentModes(pRes.data);
        setEmis(eRes.data.filter(e => e.Status === 'Active')); 
        setSavings(sRes.data);
      } catch (err) {
        console.error("Failed to load master data", err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadMasterData();
      
      const today = new Date().toLocaleDateString('en-GB');
      const storedData = JSON.parse(localStorage.getItem('dailySettlementChecks') || '{}');
      if (storedData.date !== today) {
        localStorage.setItem('dailySettlementChecks', JSON.stringify({ date: today, checks: {} }));
      }
    }
  }, [isOpen]);

  // Checklist Prep
  const creditCards = paymentModes.filter(m => m.type === 'Credit Card');
  const bankAccounts = paymentModes.filter(m => m.type === 'Bank Account');
  
  // Total Tasks = CCs + Banks + EMIs + Savings + 2 (Take/Give Settlements)
  const totalTasks = creditCards.length + bankAccounts.length + emis.length + savings.length + 2;
  const completedTasks = Object.values(dailyChecks).filter(Boolean).length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // --- CONFETTI EFFECT ENGINE ---
  useEffect(() => {
    if (totalTasks > 0 && completedTasks === totalTasks) {
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.4 },
        zIndex: 9999, // Ensure it bursts OVER the modal
        colors: ['#10b981', '#6366f1', '#f59e0b', '#f43f5e']
      });
    }
  }, [completedTasks, totalTasks]);

  // --- CHECKLIST HANDLER ---
  const toggleCheck = (id) => {
    const newChecks = { ...dailyChecks, [id]: !dailyChecks[id] };
    setDailyChecks(newChecks);
    
    const today = new Date().toLocaleDateString('en-GB');
    localStorage.setItem('dailySettlementChecks', JSON.stringify({ date: today, checks: newChecks }));
  };

  // --- FRIEND HANDLERS ---
  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!newFriendName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await addFriend({ name: newFriendName });
      setFriends([...friends, res.data]);
      setNewFriendName('');
    } catch (err) { console.error(err); } 
    finally { setIsSubmitting(false); }
  };

  const handleEditFriend = async (id) => {
    if (!editingFriendName.trim()) return;
    try {
      await editFriend(id, { name: editingFriendName });
      setFriends(friends.map(f => f.id === id ? { ...f, name: editingFriendName } : f));
      setEditingFriendId(null);
    } catch (err) { console.error(err); }
  };

  const handleDeleteFriend = async (id) => {
    if (!window.confirm("Delete this friend from directory?")) return;
    try {
      await deleteFriend(id);
      setFriends(friends.filter(f => f.id !== id));
    } catch (err) { console.error(err); }
  };

  // --- PAYMENT MODE HANDLERS ---
  const handleAddMode = async (e) => {
    e.preventDefault();
    if (!newModeName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await addPaymentMode({ name: newModeName, type: newModeType });
      setPaymentModes([...paymentModes, res.data]);
      setNewModeName('');
    } catch (err) { console.error(err); } 
    finally { setIsSubmitting(false); }
  };

  const handleEditMode = async (id, currentType) => {
    if (!editingModeName.trim()) return;
    try {
      await editPaymentMode(id, { name: editingModeName, type: currentType });
      setPaymentModes(paymentModes.map(m => m.id === id ? { ...m, name: editingModeName } : m));
      setEditingModeId(null);
    } catch (err) { console.error(err); }
  };

  const handleDeleteMode = async (id) => {
    if (!window.confirm("Delete this payment mode from directory?")) return;
    try {
      await deletePaymentMode(id);
      setPaymentModes(paymentModes.filter(m => m.id !== id));
    } catch (err) { console.error(err); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl w-full max-w-4xl h-[650px] max-h-[90vh] flex flex-col md:flex-row overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 text-dark-muted hover:text-dark-text bg-dark-bg p-1.5 rounded-full border border-dark-border"><X size={20} /></button>

        {/* LEFT SIDEBAR */}
        <div className="w-full md:w-64 bg-dark-bg/50 border-r border-dark-border flex flex-col p-4 shrink-0">
          <div className="flex items-center space-x-3 mb-8 px-2 mt-2">
            <div className="h-10 w-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">SW</div>
            <div><h3 className="font-bold text-dark-text leading-tight">Shreyas Wani</h3><p className="text-xs text-emerald-400">Pro Account</p></div>
          </div>
          <nav className="space-y-2 flex-1 overflow-y-auto">
            <button onClick={() => setActiveTab('checklist')} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'checklist' ? 'bg-emerald-500/10 text-emerald-400' : 'text-dark-muted hover:bg-dark-border/50 hover:text-dark-text'}`}><CheckSquare size={18} /> <span className="font-medium text-sm">Daily Checklist</span></button>
            <button onClick={() => setActiveTab('friends')} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'friends' ? 'bg-indigo-500/10 text-indigo-400' : 'text-dark-muted hover:bg-dark-border/50 hover:text-dark-text'}`}><Users size={18} /> <span className="font-medium text-sm">Friend List</span></button>
            <button onClick={() => setActiveTab('payment')} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'payment' ? 'bg-amber-500/10 text-amber-400' : 'text-dark-muted hover:bg-dark-border/50 hover:text-dark-text'}`}><Landmark size={18} /> <span className="font-medium text-sm">Payment Modes</span></button>
            <button onClick={() => setActiveTab('account')} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'account' ? 'bg-rose-500/10 text-rose-400' : 'text-dark-muted hover:bg-dark-border/50 hover:text-dark-text'}`}><User size={18} /> <span className="font-medium text-sm">Account Settings</span></button>
          </nav>
        </div>

        {/* RIGHT CONTENT AREA */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-dark-card relative">
          {loading && <div className="absolute inset-0 z-10 bg-dark-card/80 flex items-center justify-center backdrop-blur-sm"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>}

          {/* TAB 0: DAILY CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">
              <h2 className="text-2xl font-bold text-dark-text mb-2">Daily Settlement Checklist</h2>
              <p className="text-dark-muted mb-6">Keep track of what you've updated today. <span className="text-emerald-400">Resets automatically at midnight.</span></p>
              
              {/* Progress Bar */}
              <div className="bg-dark-bg border border-dark-border rounded-xl p-5 mb-8 shadow-sm">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium text-dark-text">Peace of Mind Progress</span>
                  <span className={`text-sm font-bold ${completedTasks === totalTasks ? 'text-indigo-400' : 'text-emerald-400'}`}>
                    {completedTasks === totalTasks ? 'All Caught Up! 🎉' : `${completedTasks} / ${totalTasks} Done`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-dark-card rounded-full overflow-hidden border border-dark-border relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ease-out ${completedTasks === totalTasks ? 'bg-indigo-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${progressPercent}%` }} 
                  />
                </div>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto pr-2 pb-6 custom-scrollbar">
                
                {/* Bank Accounts Section */}
                {bankAccounts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-dark-muted uppercase tracking-wider mb-3 flex items-center"><Landmark size={16} className="mr-2" /> Bank Accounts</h3>
                    <div className="space-y-2">
                      {bankAccounts.map(bank => (
                        <label key={bank.id} className="flex items-center space-x-3 p-3 rounded-lg border border-dark-border bg-dark-bg/50 hover:bg-dark-bg cursor-pointer transition-colors group">
                          <input type="checkbox" checked={!!dailyChecks[bank.id]} onChange={() => toggleCheck(bank.id)} className="w-5 h-5 rounded border-dark-border text-emerald-500 focus:ring-emerald-500 bg-dark-card cursor-pointer" />
                          <span className={`font-medium transition-all ${dailyChecks[bank.id] ? 'text-dark-muted line-through' : 'text-dark-text group-hover:text-emerald-400'}`}>{bank.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* CC Section */}
                {creditCards.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-dark-muted uppercase tracking-wider mb-3 flex items-center"><CreditCard size={16} className="mr-2" /> Credit Cards</h3>
                    <div className="space-y-2">
                      {creditCards.map(cc => (
                        <label key={cc.id} className="flex items-center space-x-3 p-3 rounded-lg border border-dark-border bg-dark-bg/50 hover:bg-dark-bg cursor-pointer transition-colors group">
                          <input type="checkbox" checked={!!dailyChecks[cc.id]} onChange={() => toggleCheck(cc.id)} className="w-5 h-5 rounded border-dark-border text-emerald-500 focus:ring-emerald-500 bg-dark-card cursor-pointer" />
                          <span className={`font-medium transition-all ${dailyChecks[cc.id] ? 'text-dark-muted line-through' : 'text-dark-text group-hover:text-emerald-400'}`}>{cc.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* EMIs Section */}
                {emis.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-dark-muted uppercase tracking-wider mb-3 flex items-center"><ShoppingBag size={16} className="mr-2" /> Active EMIs</h3>
                    <div className="space-y-2">
                      {emis.map(emi => (
                        <label key={emi.EMI_ID} className="flex items-center space-x-3 p-3 rounded-lg border border-dark-border bg-dark-bg/50 hover:bg-dark-bg cursor-pointer transition-colors group">
                          <input type="checkbox" checked={!!dailyChecks[emi.EMI_ID]} onChange={() => toggleCheck(emi.EMI_ID)} className="w-5 h-5 rounded border-dark-border text-emerald-500 focus:ring-emerald-500 bg-dark-card cursor-pointer" />
                          <span className={`font-medium transition-all ${dailyChecks[emi.EMI_ID] ? 'text-dark-muted line-through' : 'text-dark-text group-hover:text-emerald-400'}`}>{emi.Product_Name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Savings Section */}
                {savings.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-dark-muted uppercase tracking-wider mb-3 flex items-center"><PiggyBank size={16} className="mr-2" /> Wealth & Goals</h3>
                    <div className="space-y-2">
                      {savings.map(sav => (
                        <label key={sav.id} className="flex items-center space-x-3 p-3 rounded-lg border border-dark-border bg-dark-bg/50 hover:bg-dark-bg cursor-pointer transition-colors group">
                          <input type="checkbox" checked={!!dailyChecks[sav.id]} onChange={() => toggleCheck(sav.id)} className="w-5 h-5 rounded border-dark-border text-emerald-500 focus:ring-emerald-500 bg-dark-card cursor-pointer" />
                          <span className={`font-medium transition-all ${dailyChecks[sav.id] ? 'text-dark-muted line-through' : 'text-dark-text group-hover:text-emerald-400'}`}>{sav.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-dark-card border border-dark-border text-dark-muted ml-auto">{sav.category}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Peer Settlements Section */}
                <div>
                  <h3 className="text-sm font-bold text-dark-muted uppercase tracking-wider mb-3 flex items-center"><Users size={16} className="mr-2" /> Peer Settlements</h3>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 p-3 rounded-lg border border-dark-border bg-dark-bg/50 hover:bg-dark-bg cursor-pointer transition-colors group">
                      <input type="checkbox" checked={!!dailyChecks['take_money']} onChange={() => toggleCheck('take_money')} className="w-5 h-5 rounded border-dark-border text-emerald-500 focus:ring-emerald-500 bg-dark-card cursor-pointer" />
                      <span className={`font-medium transition-all ${dailyChecks['take_money'] ? 'text-dark-muted line-through' : 'text-dark-text group-hover:text-emerald-400'}`}>Take Money Check (Who Owes Me)</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 rounded-lg border border-dark-border bg-dark-bg/50 hover:bg-dark-bg cursor-pointer transition-colors group">
                      <input type="checkbox" checked={!!dailyChecks['give_money']} onChange={() => toggleCheck('give_money')} className="w-5 h-5 rounded border-dark-border text-emerald-500 focus:ring-emerald-500 bg-dark-card cursor-pointer" />
                      <span className={`font-medium transition-all ${dailyChecks['give_money'] ? 'text-dark-muted line-through' : 'text-dark-text group-hover:text-emerald-400'}`}>Give Money Check (Who I Owe)</span>
                    </label>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 1: FRIEND LIST */}
          {activeTab === 'friends' && (
            <div className="animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">
              <h2 className="text-2xl font-bold text-dark-text mb-2">Friend List Directory</h2>
              <p className="text-dark-muted mb-6">These names will dynamically populate your expense splitter dropdowns.</p>
              
              <form onSubmit={handleAddFriend} className="flex space-x-3 mb-6 bg-dark-bg p-2 rounded-lg border border-dark-border">
                <input type="text" value={newFriendName} onChange={(e) => setNewFriendName(e.target.value)} required placeholder="Add new friend (e.g. Sushil)..." className="flex-1 bg-transparent border-none text-dark-text px-2 focus:outline-none" />
                <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white px-4 py-2 rounded-md font-medium flex items-center transition-colors shadow-lg shadow-indigo-900/20"><Plus size={16} className="mr-1"/> Add</button>
              </form>

              <div className="flex-1 overflow-y-auto border border-dark-border rounded-xl bg-dark-bg/30">
                {friends.length === 0 ? <p className="text-center text-dark-muted p-8">No friends added.</p> : (
                  <ul className="divide-y divide-dark-border">
                    {friends.map(f => (
                      <li key={f.id} className="p-4 flex justify-between items-center hover:bg-dark-card transition-colors group">
                        {editingFriendId === f.id ? (
                          <div className="flex flex-1 items-center space-x-2 mr-4">
                            <input autoFocus type="text" value={editingFriendName} onChange={(e) => setEditingFriendName(e.target.value)} className="flex-1 bg-dark-bg border border-indigo-500 rounded px-2 py-1 text-sm text-dark-text outline-none" />
                            <button onClick={() => handleEditFriend(f.id)} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/40"><Check size={14}/></button>
                            <button onClick={() => setEditingFriendId(null)} className="p-1.5 bg-dark-bg border border-dark-border text-dark-muted rounded hover:text-dark-text"><X size={14}/></button>
                          </div>
                        ) : (
                          <span className="font-medium text-dark-text flex-1">{f.name}</span>
                        )}
                        
                        {editingFriendId !== f.id && (
                          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingFriendId(f.id); setEditingFriendName(f.name); }} className="p-1.5 text-dark-muted hover:text-indigo-400"><Pencil size={16}/></button>
                            <button onClick={() => handleDeleteFriend(f.id)} className="p-1.5 text-dark-muted hover:text-rose-400"><Trash2 size={16}/></button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENT MODES */}
          {activeTab === 'payment' && (
            <div className="animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">
              <h2 className="text-2xl font-bold text-dark-text mb-2">Payment Modes Directory</h2>
              <p className="text-dark-muted mb-6">Manage your banks, credit cards, and wallets globally.</p>
              
              <form onSubmit={handleAddMode} className="flex space-x-3 mb-6 bg-dark-bg p-2 rounded-lg border border-dark-border items-center">
                <input type="text" value={newModeName} onChange={(e) => setNewModeName(e.target.value)} required placeholder="e.g. HDFC TATA NEU..." className="flex-1 w-1/2 bg-transparent border-r border-dark-border text-dark-text px-3 py-1 focus:outline-none" />
                
                <CustomSelect 
                  value={newModeType} 
                  options={['Bank Account', 'Credit Card', 'Wallet']} 
                  onChange={(val) => setNewModeType(val)} 
                />
                
                <button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white px-4 py-2 rounded-md font-medium flex items-center transition-colors shadow-lg shadow-amber-900/20"><Plus size={16} className="mr-1"/> Add</button>
              </form>

              <div className="flex-1 overflow-y-auto border border-dark-border rounded-xl bg-dark-bg/30">
                {paymentModes.length === 0 ? <p className="text-center text-dark-muted p-8">No payment modes added.</p> : (
                  <ul className="divide-y divide-dark-border">
                    {paymentModes.map(m => (
                      <li key={m.id} className="p-4 flex justify-between items-center hover:bg-dark-card transition-colors group">
                        {editingModeId === m.id ? (
                          <div className="flex flex-1 items-center space-x-2 mr-4">
                            <input autoFocus type="text" value={editingModeName} onChange={(e) => setEditingModeName(e.target.value)} className="flex-1 bg-dark-bg border border-amber-500 rounded px-2 py-1 text-sm text-dark-text outline-none" />
                            <button onClick={() => handleEditMode(m.id, m.type)} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/40"><Check size={14}/></button>
                            <button onClick={() => setEditingModeId(null)} className="p-1.5 bg-dark-bg border border-dark-border text-dark-muted rounded hover:text-dark-text"><X size={14}/></button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3 flex-1">
                            <span className="font-medium text-dark-text">{m.name}</span>
                            <span className="text-xs text-amber-400 px-2 py-1 bg-amber-500/10 rounded border border-amber-500/20">{m.type}</span>
                          </div>
                        )}
                        
                        {editingModeId !== m.id && (
                          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingModeId(m.id); setEditingModeName(m.name); }} className="p-1.5 text-dark-muted hover:text-amber-400"><Pencil size={16}/></button>
                            <button onClick={() => handleDeleteMode(m.id)} className="p-1.5 text-dark-muted hover:text-rose-400"><Trash2 size={16}/></button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-bold text-dark-text mb-2">Account Overview</h2>
              <p className="text-dark-muted mb-6">Manage your profile and authentication settings (Phase 5).</p>
              <div className="border border-dashed border-dark-border rounded-xl p-8 flex flex-col items-center justify-center text-center opacity-50">
                <User size={48} className="text-dark-muted mb-4" />
                <p className="font-medium text-dark-text">Authentication locked until Phase 5</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}