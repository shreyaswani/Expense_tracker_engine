import { useState } from 'react';
import { X, ChevronDown, Loader2 } from 'lucide-react';
import { editTransaction } from '../../../api/client';

const CustomSelect = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative w-full">
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500">
        <span>{value}</span>
        <ChevronDown size={16} className={`text-dark-muted ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <ul className="absolute top-full left-0 mt-1 w-full z-50 bg-dark-card border border-dark-border rounded-lg shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <li key={opt} onClick={() => { onChange(opt); setIsOpen(false); }} className={`px-3 py-2 cursor-pointer ${value === opt ? 'bg-emerald-500/20 text-emerald-400' : 'text-dark-text hover:bg-dark-border/50'}`}>
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function EditTransactionModal({ isOpen, onClose, transaction, onSaveSuccess }) {
  const [prevTxn, setPrevTxn] = useState(null);
  const [formData, setFormData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- THE FIX: React "Derived State" Pattern ---
  // This completely replaces useEffect and prevents the cascading render error!
  if (transaction !== prevTxn) {
    setPrevTxn(transaction);
    if (transaction) {
      const d = new Date(transaction.Date);
      const isoDate = !isNaN(d.valueOf()) ? d.toISOString().split('T')[0] : '';
      
      setFormData({
        Date: isoDate,
        Type: transaction.Type || 'Expense',
        Category: transaction.Category || 'Groceries',
        Amount: transaction.Amount || '',
        Description: transaction.Description || ''
      });
    } else {
      setFormData(null);
    }
  }

  if (!isOpen || !formData) return null;

  const formatDateForSheet = (dateString) => {
    const date = new Date(dateString);
    return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formattedData = {
        ...formData,
        Date: formatDateForSheet(formData.Date),
        Amount: parseFloat(formData.Amount)
      };
      await editTransaction(transaction.Txn_ID, formattedData);
      
      onSaveSuccess({ ...transaction, ...formattedData });
      onClose();
    } catch (error) {
      console.error("Failed to edit transaction", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl w-full max-w-md relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <button onClick={onClose} className="absolute top-4 right-4 z-10 text-dark-muted hover:text-dark-text bg-dark-bg p-1 rounded-full border border-dark-border">
          <X size={18} />
        </button>

        <div className="p-6">
          <h2 className="text-xl font-semibold text-dark-text mb-6">Edit Transaction</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-muted mb-1">Date</label>
                <input type="date" required style={{ colorScheme: 'dark' }} value={formData.Date} onChange={(e) => setFormData({...formData, Date: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-muted mb-1">Type</label>
                <CustomSelect value={formData.Type} options={['Expense', 'Payment', 'Refund', 'Cashback']} onChange={(val) => setFormData({...formData, Type: val})} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-muted mb-1">Category</label>
              <CustomSelect value={formData.Category} options={['Food', 'Groceries', 'Shopping', 'Tax', 'Travel', 'Entertainment', 'Personal Care', 'Appliance', 'Fee', 'Bill Pay', 'Rewards', 'Refund', 'Other']} onChange={(val) => setFormData({...formData, Category: val})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-muted mb-1">Description</label>
              <input type="text" required value={formData.Description} onChange={(e) => setFormData({...formData, Description: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-muted mb-1">Amount (₹)</label>
              <input type="number" required min="1" step="any" value={formData.Amount} onChange={(e) => setFormData({...formData, Amount: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-medium py-3 rounded-lg transition-all shadow-lg shadow-emerald-900/20 flex justify-center items-center">
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}