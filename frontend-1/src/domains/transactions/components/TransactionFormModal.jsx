import { useState, useEffect } from 'react';
import { X, ChevronDown, SplitSquareHorizontal, Trash2 } from 'lucide-react';
import { fetchFriends } from '../../../api/client';

// --- CUSTOM SELECT COMPONENT ---
const CustomSelect = ({ value, options, onChange, placeholder = "Select..." }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full">
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-emerald-500 transition-colors"
      >
        <span>{value || placeholder}</span>
        <ChevronDown size={16} className={`text-dark-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul className="absolute top-full left-0 mt-1 w-full z-50 bg-dark-card border border-dark-border rounded-lg shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <li
              key={opt.value || opt}
              onClick={() => {
                onChange(opt.value || opt);
                setIsOpen(false);
              }}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                value === (opt.value || opt) 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'text-dark-text hover:bg-dark-border/50'
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

// --- CUSTOM FRIEND SELECT DROPDOWN (Matches Type & Category dropdowns) ---
const FriendSelectDropdown = ({ onAddFriend }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [availableFriends, setAvailableFriends] = useState([]);
  useEffect(() => {
    fetchFriends().then(res => setAvailableFriends(res.data.map(f => f.name))).catch(console.error);
  }, []);

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
        className="w-full flex items-center justify-between bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-muted hover:text-dark-text focus:outline-none focus:border-emerald-500 transition-colors"
      >
        <span>Add friend from list or custom...</span>
        <ChevronDown size={16} className={`text-dark-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full z-50 bg-dark-card border border-dark-border rounded-lg shadow-xl overflow-hidden py-1 max-h-56 overflow-y-auto">
          {/* Custom Input Header */}
          <div className="p-2 border-b border-dark-border flex gap-2 bg-dark-bg/50">
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
              className="flex-1 bg-dark-bg border border-dark-border rounded-md px-2.5 py-1 text-xs text-dark-text focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleCustomAdd}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
            >
              Add
            </button>
          </div>

          {/* Preset Friends List */}
          <div className="py-1">
            {availableFriends.map((name) => (
              <div
                key={name}
                onClick={() => handleSelect(name)}
                className="px-3 py-2 text-sm text-dark-text hover:bg-dark-border/50 cursor-pointer flex items-center justify-between transition-colors"
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

export default function TransactionFormModal({ isOpen, onClose, onSubmit, activeCardId }) {
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    Date: today,
    Type: 'Expense',
    Category: 'Groceries',
    Amount: '',
    Description: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- SPLIT BILL STATE ---
  const [isSplitEnabled, setIsSplitEnabled] = useState(false);
  const [splitMode, setSplitMode] = useState('Equal'); 
  const [participants, setParticipants] = useState([
    { id: 'me', name: 'Shreyas (Me)', included: true, exactValue: '', percentage: '', locked: false }
  ]);

  const totalAmount = parseFloat(formData.Amount) || 0;
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

  const addFriend = (friendName) => {
    if (!friendName || participants.some(p => p.name.toLowerCase() === friendName.toLowerCase())) return;
    
    const newParticipant = { 
      id: `friend-${Date.now()}-${Math.random()}`, 
      name: friendName, 
      included: true, 
      exactValue: '', 
      percentage: '',
      locked: false 
    };

    const newParticipantsList = [...participants, newParticipant];
    setParticipants(newParticipantsList);
  };

  const removeFriend = (id) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const toggleParticipant = (id) => {
    setParticipants(participants.map(p => p.id === id ? { ...p, included: !p.included, locked: false } : p));
  };

  // --- SMART AUTO-DISTRIBUTE LOGIC ---
  const handleCustomSplitChange = (id, field, value) => {
    // 1. Mark the participant being edited as locked with their new explicit value
    const updated = participants.map(p => 
      p.id === id ? { ...p, [field]: value, locked: true } : p
    );

    // 2. Identify the other participants
    const otherIncluded = updated.filter(p => p.included && p.id !== id);
    const unlockedOthers = otherIncluded.filter(p => !p.locked);

    // Target the unlocked ones first; if all others were locked, target the last one as buffer
    const targetGroup = unlockedOthers.length > 0 
      ? unlockedOthers 
      : (otherIncluded.length > 0 ? [otherIncluded[otherIncluded.length - 1]] : []);

    if (targetGroup.length > 0) {
      // 3. Sum up all locked values (excluding target group)
      const lockedSum = updated
        .filter(p => p.included && !targetGroup.some(t => t.id === p.id))
        .reduce((sum, p) => {
          const val = field === 'exactValue' ? parseFloat(p.exactValue) || 0 : parseFloat(p.percentage) || 0;
          return sum + val;
        }, 0);

      const totalPool = field === 'exactValue' ? totalAmount : 100;
      const remainder = Math.max(0, totalPool - lockedSum);
      const splitVal = (remainder / targetGroup.length);

      const finalParticipants = updated.map(p => {
        if (targetGroup.some(t => t.id === p.id)) {
          const formattedVal = field === 'exactValue'
            ? (splitVal % 1 === 0 ? splitVal.toString() : splitVal.toFixed(2))
            : (splitVal % 1 === 0 ? splitVal.toString() : splitVal.toFixed(1));

          return {
            ...p,
            [field]: formattedVal
          };
        }
        return p;
      });

      setParticipants(finalParticipants);
      return;
    }

    setParticipants(updated);
  };

  if (!isOpen) return null;

  const formatDateForSheet = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSplitValid) return; 
    
    setIsSubmitting(true);
    
    const splitData = isSplitEnabled ? participants.filter(p => p.included && p.id !== 'me').map(p => {
      let owedAmount = 0;
      
      if (splitMode === 'Equal') owedAmount = totalAmount / includedCount;
      if (splitMode === 'Custom') owedAmount = parseFloat(p.exactValue) || 0;
      if (splitMode === 'Percentage') owedAmount = (totalAmount * (parseFloat(p.percentage) || 0)) / 100;
      
      return { friend: p.name, amountOwed: owedAmount };
    }) : [];

    await onSubmit({
      ...formData,
      Date: formatDateForSheet(formData.Date),
      Card_ID: activeCardId,
      splits: splitData 
    });
    
    setIsSubmitting(false);
    setFormData({ ...formData, Amount: '', Description: '' });
    setIsSplitEnabled(false);
    setParticipants([{ id: 'me', name: 'Shreyas (Me)', included: true, exactValue: '', percentage: '', locked: false }]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`bg-dark-card border border-dark-border rounded-xl shadow-2xl w-full transition-all duration-300 ${isSplitEnabled ? 'max-w-3xl' : 'max-w-md'} relative flex flex-col md:flex-row overflow-hidden max-h-[90vh]`}>
        
        <button onClick={onClose} className="absolute top-4 right-4 z-10 text-dark-muted hover:text-dark-text transition-colors bg-dark-bg p-1 rounded-full border border-dark-border">
          <X size={18} />
        </button>

        {/* LEFT: MAIN FORM */}
        <div className={`p-6 flex-1 overflow-y-auto ${isSplitEnabled ? 'border-r border-dark-border' : ''}`}>
          <h2 className="text-xl font-semibold text-dark-text mb-6">Add New Transaction</h2>

          <form id="txn-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-muted mb-1">Date</label>
                <input 
                  type="date" name="Date" required style={{ colorScheme: 'dark' }} 
                  value={formData.Date} onChange={(e) => setFormData(prev => ({ ...prev, Date: e.target.value }))}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-muted mb-1">Type</label>
                <CustomSelect 
                  value={formData.Type}
                  options={['Expense', 'Payment', 'Refund', 'Cashback']}
                  onChange={(val) => setFormData(prev => ({ ...prev, Type: val }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-muted mb-1">Category</label>
              <CustomSelect 
                value={formData.Category}
                options={['Food', 'Groceries', 'Shopping', 'Tax', 'Travel', 'Entertainment', 'Personal Care', 'Appliance', 'Fee', 'Bill Pay', 'Rewards', 'Refund', 'Other', 'Gifts & Stuff']}
                onChange={(val) => setFormData(prev => ({ ...prev, Category: val }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-muted mb-1">Description</label>
              <input 
                type="text" required autoComplete="off" placeholder="e.g., Swiggy - Paneer Dam Biryani"
                value={formData.Description} onChange={(e) => setFormData(prev => ({ ...prev, Description: e.target.value }))}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-muted mb-1">Amount (₹)</label>
              <input 
                type="number" required min="1" step="any" style={{ colorScheme: 'dark' }} placeholder="e.g. 450"
                value={formData.Amount} onChange={(e) => setFormData(prev => ({ ...prev, Amount: e.target.value }))}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {formData.Type === 'Expense' && (
              <div className="pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsSplitEnabled(!isSplitEnabled)}
                  className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg border border-dashed transition-all ${isSplitEnabled ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'border-dark-border hover:bg-dark-border/30 text-dark-muted'}`}
                >
                  <SplitSquareHorizontal size={18} />
                  <span className="font-medium">{isSplitEnabled ? 'Split Bill Enabled' : 'Split this expense'}</span>
                </button>
              </div>
            )}

            {!isSplitEnabled && (
              <button type="submit" form="txn-form" disabled={isSubmitting} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-medium py-3 rounded-lg transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98]">
                {isSubmitting ? 'Saving...' : 'Save Transaction'}
              </button>
            )}
          </form>
        </div>

        {/* RIGHT: SPLIT CALCULATOR */}
        {isSplitEnabled && (
          <div className="p-6 flex-1 bg-dark-bg/30 flex flex-col overflow-y-auto animate-in slide-in-from-right-8 duration-300">
            <h3 className="text-lg font-semibold text-dark-text mb-4">Split Details</h3>
            
            {/* Mode Switcher */}
            <div className="flex bg-dark-bg rounded-lg p-1 border border-dark-border mb-4">
              {['Equal', 'Custom', 'Percentage'].map(mode => (
                <button
                  key={mode} type="button" onClick={() => setSplitMode(mode)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${splitMode === mode ? 'bg-dark-card text-emerald-400 shadow-sm border border-dark-border' : 'text-dark-muted hover:text-dark-text'}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Custom Styled Friend Dropdown */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-dark-muted mb-1">Add Friend to Split</label>
              <FriendSelectDropdown onAddFriend={addFriend} />
            </div>

            {/* Participants Breakdown */}
            <div className="flex-1 space-y-3 mb-6 overflow-y-auto max-h-60 pr-1">
              {participants.map((p) => (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${p.included ? 'bg-dark-card border-dark-border' : 'bg-dark-bg/50 border-dark-border/50 opacity-50'}`}>
                  
                  <div className="flex items-center space-x-3 flex-1 min-w-0 pr-2">
                    <input 
                      type="checkbox" checked={p.included} onChange={() => toggleParticipant(p.id)}
                      className="w-4 h-4 rounded border-dark-border text-emerald-500 focus:ring-emerald-500 bg-dark-bg cursor-pointer"
                    />
                    <span className="text-sm font-medium text-dark-text truncate">{p.name}</span>
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
                          <span className="absolute left-2.5 top-1.5 text-dark-muted text-xs">₹</span>
                          <input 
                            type="number" value={p.exactValue} onChange={(e) => handleCustomSplitChange(p.id, 'exactValue', e.target.value)}
                            placeholder="0"
                            className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1 pl-6 text-sm text-dark-text outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-right font-medium"
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
                              className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1 pr-6 text-sm text-dark-text outline-none text-right focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-medium"
                            />
                            <span className="absolute right-2 top-1 text-dark-muted text-xs">%</span>
                          </div>
                          {/* Exact Rupee Amount per Friend */}
                          <span className="text-xs text-emerald-400 font-medium mt-0.5">
                            ₹{((parseFloat(p.percentage) || 0) * totalAmount / 100).toFixed(2)}
                          </span>
                        </div>
                      )}

                      {p.id !== 'me' && (
                        <button type="button" onClick={() => removeFriend(p.id)} className="text-dark-muted hover:text-rose-400 transition-colors p-1 shrink-0">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="border-t border-dark-border pt-4 mt-auto">
              <button 
                type="submit" form="txn-form" 
                disabled={isSubmitting || !isSplitValid} 
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/40 disabled:text-dark-muted text-white font-medium py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-900/20 flex justify-center items-center text-sm"
              >
                {isSubmitting ? 'Saving...' : 'Save & Track Owed Money'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}