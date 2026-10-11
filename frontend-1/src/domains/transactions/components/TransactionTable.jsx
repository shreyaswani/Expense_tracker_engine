import { useState, useMemo } from 'react';
import { Filter, ChevronDown, Check } from 'lucide-react';

// --- CUSTOM MULTI-SELECT DROPDOWN ---
const MultiSelect = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((item) => item !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="relative w-full md:w-48 shrink-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text focus:border-emerald-500 outline-none transition-colors"
      >
        <span className="truncate">
          {selected.length === 0 ? `All ${label}s` : `${selected.length} ${label}(s)`}
        </span>
        <ChevronDown size={14} className={`text-dark-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <ul className="absolute right-0 md:left-0 z-40 mt-1 w-56 bg-dark-card border border-dark-border rounded-lg shadow-xl max-h-60 overflow-y-auto py-1">
            {options.map((opt) => (
              <li
                key={opt}
                onClick={() => toggleOption(opt)}
                className="px-3 py-2 cursor-pointer text-sm text-dark-text hover:bg-dark-border/50 flex items-center space-x-2"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selected.includes(opt) ? 'bg-emerald-500 border-emerald-500' : 'border-dark-muted'}`}>
                  {selected.includes(opt) && <Check size={12} className="text-dark-bg font-bold" />}
                </div>
                <span>{opt}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

// --- SAFE DATE PARSER ---
const parseSafeDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const d = new Date(dateStr);
  if (d > new Date()) d.setFullYear(d.getFullYear() - 1);
  return d;
};

const getBillingCycle = (dateString, billingDay = 1) => {
  const date = new Date(dateString);
  if (isNaN(date)) return 'Unknown';
  
  const day = date.getDate();
  let month = date.getMonth(); 
  let year = date.getFullYear();

  // Step 1: Push transactions that happen after the billing day to the next statement
  if (day > billingDay) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  if (billingDay <= 5) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }

  return new Date(year, month, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

// --- MAIN TABLE COMPONENT ---
export default function TransactionTable({ transactions, billingDay = 13, onRowClick }) {
  const [selectedCycles, setSelectedCycles] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  const options = useMemo(() => {
    const cycles = new Set();
    const categories = new Set();
    
    transactions.forEach(txn => {
      cycles.add(getBillingCycle(txn.Date, billingDay));
      if (txn.Category) categories.add(txn.Category);
    });

    return {
      cycles: Array.from(cycles).sort((a, b) => new Date(a) - new Date(b)),
      categories: Array.from(categories).sort()
    };
  }, [transactions, billingDay]);

  const filteredData = useMemo(() => {
    return transactions.filter(txn => {
      let matchCycle = true;
      if (selectedCycles.length > 0) {
        matchCycle = selectedCycles.includes(getBillingCycle(txn.Date, billingDay));
      }
      
      let matchCategory = true;
      if (selectedCategories.length > 0) {
        matchCategory = selectedCategories.includes(txn.Category);
      }
      
      return matchCycle && matchCategory;
    })
    .sort((a, b) => parseSafeDate(b.Date) - parseSafeDate(a.Date)); 
  }, [transactions, selectedCycles, selectedCategories, billingDay]);

  const totals = useMemo(() => {
    let expenses = 0;
    let payments = 0;
    let cashbacks = 0;
    let refunds = 0;

    filteredData.forEach((txn) => {
      const amount = parseFloat(txn.Amount) || 0;
      if (txn.Type === 'Expense') expenses += amount;
      else if (txn.Type === 'Payment') payments += amount;
      else if (txn.Type === 'Cashback') cashbacks += amount;
      else if (txn.Type === 'Refund') refunds += amount;
    });

    return { expenses, payments, cashbacks, refunds };
  }, [filteredData]);

  const getAmountStyle = (type) => {
    if (type === 'Payment') return 'text-emerald-400 font-medium';
    if (type === 'Refund') return 'text-indigo-400 font-medium';
    if (type === 'Cashback') return 'text-amber-400 font-medium';
    return 'text-dark-text font-medium'; 
  };

  const getPrefix = (type) => (type === 'Expense' ? '' : '+');

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl shadow-sm flex flex-col w-full overflow-hidden">
      
      <div className="p-6 border-b border-dark-border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-dark-text flex items-center">
            <Filter size={18} className="mr-2 text-emerald-400" />
            Transaction Ledger <p className="text-xs text-dark-muted ml-2"> (Click to Edit)</p>
          </h3>
          
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <p className="text-sm text-dark-muted">
              Spent: <span className="text-rose-400 font-semibold tracking-wide ml-1">₹{totals.expenses.toLocaleString()}</span>
            </p>
            <p className="text-sm text-dark-muted">
              Paid: <span className="text-emerald-400 font-semibold tracking-wide ml-1">₹{totals.payments.toLocaleString()}</span>
            </p>
            <p className="text-sm text-dark-muted">
              Refunds: <span className="text-indigo-400 font-semibold tracking-wide ml-1">₹{totals.refunds.toLocaleString()}</span>
            </p>
            <p className="text-sm text-dark-muted">
              Cashbacks: <span className="text-amber-400 font-semibold tracking-wide ml-1">₹{totals.cashbacks.toLocaleString()}</span>
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <MultiSelect 
            label="Statement" 
            options={options.cycles} 
            selected={selectedCycles} 
            onChange={setSelectedCycles} 
          />
          <MultiSelect 
            label="Category" 
            options={options.categories} 
            selected={selectedCategories} 
            onChange={setSelectedCategories} 
          />
        </div>
      </div>

      <div className="overflow-auto max-h-100 w-full">
        <table className="w-full text-left text-sm text-dark-muted relative">
          <thead className="text-xs uppercase text-dark-text sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-4 font-medium bg-dark-bg border-b border-dark-border">Date</th>
              <th className="px-6 py-4 font-medium bg-dark-bg border-b border-dark-border">Description</th>
              <th className="px-6 py-4 font-medium bg-dark-bg border-b border-dark-border">Type</th>
              <th className="px-6 py-4 font-medium bg-dark-bg border-b border-dark-border">Category</th>
              <th className="px-6 py-4 font-medium bg-dark-bg border-b border-dark-border text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {filteredData.length > 0 ? (
              filteredData.map((txn) => (
                <tr key={txn.Txn_ID}
                onClick={() => onRowClick && onRowClick(txn)}
                 className="hover:bg-dark-border/20 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">{txn.Date}</td>
                  <td className="px-6 py-4 font-medium text-dark-text">{txn.Description}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium bg-dark-bg border border-dark-border ${getAmountStyle(txn.Type)}`}>
                      {txn.Type}
                    </span>
                  </td>
                  <td className="px-6 py-4">{txn.Category}</td>
                  <td className={`px-6 py-4 text-right whitespace-nowrap ${getAmountStyle(txn.Type)}`}>
                    {getPrefix(txn.Type)}{parseFloat(txn.Amount).toLocaleString()}
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
      <div className="p-4 bg-dark-bg/30 border-t border-dark-border text-xs text-dark-muted text-right shrink-0">
        Showing {filteredData.length} transaction(s)
      </div>
    </div>
  );
}