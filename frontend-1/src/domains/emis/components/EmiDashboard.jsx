import { useState, useEffect } from 'react';
import { ShoppingBag, PlusCircle, ArrowLeft, CheckCircle2, Circle, Landmark, CalendarDays, Loader2, X, ChevronDown } from 'lucide-react';
import { fetchEmis, fetchEmiPayments, addEmi, logEmiPayment, fetchPaymentModes } from '../../../api/client';

// --- CUSTOM SELECT COMPONENT ---
const CustomSelect = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative w-full">
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500 transition-colors"
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
              className={`px-3 py-2 cursor-pointer transition-colors ${
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

export default function EmiDashboard() {
  const [emis, setEmis] = useState([]);
  const [activeEmi, setActiveEmi] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Dynamic Bank Options from Master Data
  const [bankOptions, setBankOptions] = useState([]);

  // --- Pay EMI State ---
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payFormData, setPayFormData] = useState({ date: '', amount: '', bankSource: 'HDFC TATA NEU' });
  const [payingIndex, setPayingIndex] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    productName: '',
    totalAmount: '',
    downPayment: '',
    durationMonths: '',
    startDate: '',
    bankSource: 'HDFC TATA NEU' 
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [emisRes, paymentsRes, modesRes] = await Promise.all([
          fetchEmis(),
          fetchEmiPayments(),
          fetchPaymentModes()
        ]);
        
        // Populate dropdown from Database
        const modes = modesRes.data.map(m => m.name);
        setBankOptions(modes);

        // Make sure default formData respects available banks if HDFC isn't there
        if (modes.length > 0 && !modes.includes('HDFC TATA NEU')) {
          setFormData(prev => ({ ...prev, bankSource: modes[0] }));
          setPayFormData(prev => ({ ...prev, bankSource: modes[0] }));
        }
        
        const formattedEmis = emisRes.data.map(emi => ({
          id: emi.EMI_ID,
          productName: emi.Product_Name,
          totalAmount: emi.Total_Amount,
          downPayment: emi.Down_Payment,
          durationMonths: emi.Duration_Months,
          startDate: emi.Start_Date,
          status: emi.Status,
          bankSource: emi.Bank_Source || 'Bank Account',
          payments: paymentsRes.data
            .filter(p => p.EMI_ID === emi.EMI_ID)
            .map(p => ({
              id: p.Payment_ID,
              date: p.Date,
              amount: p.Amount,
              bank: p.Bank_Source
            }))
        }));
        
        setEmis(formattedEmis.reverse());
      } catch (err) {
        console.error("Failed to load EMI data:", err);
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
      const response = await addEmi(formData);
      const newEmi = {
        id: response.data.EMI_ID,
        productName: formData.productName,
        totalAmount: parseFloat(formData.totalAmount) || 0,
        downPayment: parseFloat(formData.downPayment) || 0,
        durationMonths: parseInt(formData.durationMonths) || 1,
        startDate: formData.startDate,
        bankSource: formData.bankSource,
        status: 'Active',
        payments: [] 
      };
      
      setEmis([newEmi, ...emis]);
      setIsAddModalOpen(false);
      setFormData({ productName: '', totalAmount: '', downPayment: '', durationMonths: '', startDate: '', bankSource: bankOptions[0] || 'Bank Account' });
    } catch (err) {
      console.error("Error adding EMI:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await logEmiPayment({
        EMI_ID: activeEmi,
        Date: payFormData.date,
        Amount: payFormData.amount,
        Bank_Source: payFormData.bankSource
      });

      const newPayment = {
        id: response.data.Payment_ID,
        date: payFormData.date,
        amount: parseFloat(payFormData.amount),
        bank: payFormData.bankSource
      };

      setEmis(emis.map(emi => emi.id === activeEmi ? { ...emi, payments: [...emi.payments, newPayment] } : emi));
      setIsPayModalOpen(false);
      setPayFormData({ date: '', amount: '', bankSource: bankOptions[0] || 'Bank Account' });
    } catch (err) {
      console.error("Error logging payment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-emerald-400">
        <Loader2 className="animate-spin mr-2" size={24} />
        <span className="font-medium">Loading EMI Database...</span>
      </div>
    );
  }

  if (activeEmi) {
    const emi = emis.find(e => e.id === activeEmi);
    const amountPaid = emi.downPayment + emi.payments.reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = emi.totalAmount - amountPaid;
    const monthsDone = emi.payments.length;
    const monthsRemaining = emi.durationMonths - monthsDone;
    const progressPercent = Math.min(100, (amountPaid / emi.totalAmount) * 100);
    const monthlyEmi = (emi.totalAmount - emi.downPayment) / emi.durationMonths;
    const isCleared = pendingAmount <= 0;

    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10 fade-in animate-in duration-200">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setActiveEmi(null)}
            className="p-2 bg-dark-card border border-dark-border rounded-lg hover:bg-dark-border/50 transition-colors text-dark-muted hover:text-dark-text"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-dark-text">{emi.productName}</h2>
              {isCleared && <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Cleared</span>}
            </div>
            <p className="text-sm text-dark-muted mt-1">EMI Schedule & Payment History</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-sm">
            <p className="text-sm text-dark-muted mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-dark-text">₹{emi.totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-sm">
            <p className="text-sm text-dark-muted mb-1">Amount Paid</p>
            <p className="text-2xl font-bold text-emerald-400">₹{amountPaid.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <p className="text-xs text-dark-muted mt-1">(Incl. ₹{emi.downPayment.toLocaleString()} down)</p>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-sm">
            <p className="text-sm text-dark-muted mb-1">Pending Amount</p>
            <p className="text-2xl font-bold text-rose-400">₹{pendingAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-sm">
            <p className="text-sm text-dark-muted mb-1">Timeline</p>
            <p className={`text-2xl font-bold ${isCleared ? 'text-emerald-400' : 'text-indigo-400'}`}>
              {monthsDone} <span className="text-lg text-dark-muted font-normal">/ {emi.durationMonths} Mo</span>
            </p>
            <p className="text-xs text-dark-muted mt-1">{isCleared ? 'Fully paid off' : `${monthsRemaining} payments left`}</p>
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-medium text-dark-text">Repayment Progress</span>
            <span className="text-sm font-bold text-emerald-400">{progressPercent.toFixed(1)}%</span>
          </div>
          <div className="w-full h-3 bg-dark-bg rounded-full overflow-hidden border border-dark-border">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-dark-border flex justify-between items-center bg-dark-bg/50">
            <h3 className="text-lg font-semibold text-dark-text flex items-center">
              <Landmark size={18} className="mr-2 text-indigo-400" />
              Payment Ledger
            </h3>
            <span className="text-sm text-dark-muted font-medium bg-dark-bg px-3 py-1 rounded-full border border-dark-border">
              Monthly EMI: <span className="text-dark-text">₹{monthlyEmi.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-dark-muted">
              <thead className="bg-dark-bg text-xs uppercase border-b border-dark-border text-dark-text">
                <tr>
                  <th className="px-6 py-4 font-medium">Installment</th>
                  <th className="px-6 py-4 font-medium">Date Paid</th>
                  <th className="px-6 py-4 font-medium">Bank Source</th>
                  <th className="px-6 py-4 font-medium text-right">Amount (₹)</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                <tr className="hover:bg-dark-border/20 transition-colors bg-dark-bg/20">
                  <td className="px-6 py-4 font-medium text-dark-text">Down Payment</td>
                  <td className="px-6 py-4">{emi.startDate}</td>
                  <td className="px-6 py-4">{emi.bankSource || '-'}</td>
                  <td className="px-6 py-4 text-right text-emerald-400 font-medium">₹{emi.downPayment.toLocaleString()}</td>
                  <td className="px-6 py-4 flex justify-center"><CheckCircle2 size={18} className="text-emerald-500" /></td>
                </tr>
                {emi.payments.map((txn, idx) => (
                  <tr key={idx} className="hover:bg-dark-border/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-dark-text">Month {idx + 1}</td>
                    <td className="px-6 py-4">{txn.date}</td>
                    <td className="px-6 py-4">{txn.bank}</td>
                    <td className="px-6 py-4 text-right text-emerald-400 font-medium">₹{txn.amount.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                    <td className="px-6 py-4 flex justify-center"><CheckCircle2 size={18} className="text-emerald-500" /></td>
                  </tr>
                ))}
                
                {Array.from({ length: Math.max(0, monthsRemaining) }).map((_, idx) => (
                  <tr key={`future-${idx}`} className="opacity-60 hover:opacity-100 transition-opacity">
                    <td className="px-6 py-4">Month {monthsDone + idx + 1}</td>
                    <td className="px-6 py-4">Pending</td>
                    <td className="px-6 py-4">-</td>
                    <td className="px-6 py-4 text-right">₹{monthlyEmi.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                    <td className="px-6 py-4 flex justify-center">
                       {idx === 0 ? (
                         <button 
                           onClick={() => {
                             const today = new Date().toISOString().split('T')[0];
                             setPayFormData({ date: today, amount: monthlyEmi, bankSource: bankOptions[0] || 'Bank Account' });
                             setPayingIndex(monthsDone + 1);
                             setIsPayModalOpen(true);
                           }}
                           className="text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
                         >
                           Update
                         </button>
                       ) : (
                         <Circle size={18} className="text-dark-muted" />
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- PAY EMI MODAL --- */}
        {isPayModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-dark-text">Pay Month {payingIndex} EMI</h2>
                <button onClick={() => setIsPayModalOpen(false)} className="text-dark-muted hover:text-dark-text"><X size={18}/></button>
              </div>
              <form onSubmit={handlePaySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">Date Paid</label>
                  <div className="relative">
                    <input 
                      type="date" required style={{ colorScheme: 'dark' }}
                      value={payFormData.date} onChange={(e) => setPayFormData({...payFormData, date: e.target.value})}
                      className="w-full bg-dark-bg border border-dark-border rounded-lg pl-3 pr-10 py-2 text-dark-text focus:outline-none focus:border-emerald-500 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <CalendarDays size={18} className="absolute right-3 top-2.5 text-dark-muted pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">Amount (₹)</label>
                  <input 
                    type="number" required min="1" step="any"
                    value={payFormData.amount} onChange={(e) => setPayFormData({...payFormData, amount: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">Bank Source</label>
                  <CustomSelect 
                    value={payFormData.bankSource} 
                    options={bankOptions.length ? bankOptions : ['Bank Account']} 
                    onChange={(val) => setPayFormData({...payFormData, bankSource: val})} 
                  />
                </div>
                <button 
                  type="submit" disabled={isSubmitting}
                  className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white py-2.5 rounded-lg transition-colors font-medium shadow-lg shadow-emerald-900/20 flex justify-center items-center"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Payment'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  // --- GRID VIEW (DEFAULT) ---
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-dark-text">Active EMIs</h2>
          <p className="text-sm text-dark-muted mt-1">Track your product installments and remaining balances.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
        >
          <PlusCircle size={18} />
          <span>Add Product</span>
        </button>
      </div>

      {emis.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-dark-border rounded-xl">
          <ShoppingBag size={40} className="mx-auto text-dark-muted mb-4 opacity-50" />
          <p className="text-dark-muted font-medium">No EMIs tracked yet.</p>
          <p className="text-sm text-dark-muted/70 mt-1">Click Add Product to start tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {emis.map((emi) => {
            const amountPaid = emi.downPayment + emi.payments.reduce((sum, p) => sum + p.amount, 0);
            const pendingAmount = emi.totalAmount - amountPaid;
            const progressPercent = Math.min(100, (amountPaid / emi.totalAmount) * 100);
            const isCleared = pendingAmount <= 0;
            
            return (
              <div 
                key={emi.id} 
                onClick={() => setActiveEmi(emi.id)}
                className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-sm hover:border-emerald-500/50 hover:shadow-emerald-900/10 cursor-pointer transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-dark-bg rounded-lg border border-dark-border group-hover:border-emerald-500/30 transition-colors">
                    <ShoppingBag size={24} className="text-emerald-400" />
                  </div>
                  <div className="flex gap-4 text-right items-center">
                    {isCleared ? (
                      <span className="inline-flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider">
                        <CheckCircle2 size={16} />
                        <span>Cleared</span>
                      </span>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs text-dark-muted font-medium uppercase tracking-wider mb-1">Pending</p>
                          <p className="text-lg font-bold text-rose-400">₹{pendingAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                        </div>
                        <div className="w-px h-8 bg-dark-border"></div>
                        <div>
                          <p className="text-xs text-dark-muted font-medium uppercase tracking-wider mb-1">Total</p>
                          <p className="text-lg font-bold text-dark-text">₹{emi.totalAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-dark-text mb-6 truncate">{emi.productName}</h3>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-muted">Progress</span>
                    <span className="font-medium text-emerald-400">{progressPercent.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-dark-bg rounded-full overflow-hidden border border-dark-border">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-dark-border">
                  <div className="flex items-center text-xs font-medium text-dark-muted">
                    <CalendarDays size={14} className={`mr-1.5 ${isCleared ? 'text-emerald-400' : 'text-indigo-400'}`} />
                    {isCleared ? 'Fully Paid Off' : `${emi.durationMonths - emi.payments.length} Months Left`}
                  </div>
                  <span className="text-xs font-medium text-dark-bg bg-emerald-400 px-2 py-1 rounded">View Ledger</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- ADD EMI MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-semibold text-dark-text mb-6">Add New EMI Product</h2>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">Product Name</label>
                  <input 
                    type="text" required
                    value={formData.productName}
                    onChange={(e) => setFormData({...formData, productName: e.target.value})}
                    placeholder="e.g. MacBook Pro M3"
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">Bank Source</label>
                  <CustomSelect 
                    value={formData.bankSource} 
                    options={bankOptions.length ? bankOptions : ['Bank Account']} 
                    onChange={(val) => setFormData({...formData, bankSource: val})} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">Total Cost (₹)</label>
                  <input 
                    type="number" required min="1"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({...formData, totalAmount: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">Duration (Months)</label>
                  <input 
                    type="number" required min="1"
                    value={formData.durationMonths}
                    onChange={(e) => setFormData({...formData, durationMonths: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">Down Payment (₹)</label>
                  <input 
                    type="number" required min="0"
                    value={formData.downPayment}
                    onChange={(e) => setFormData({...formData, downPayment: e.target.value})}
                    placeholder="Amount paid upfront"
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">Date of Purchase</label>
                  <div className="relative">
                    <input 
                      type="date" required style={{ colorScheme: 'dark' }}
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      className="w-full bg-dark-bg border border-dark-border rounded-lg pl-3 pr-10 py-2 text-dark-text focus:outline-none focus:border-emerald-500 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <CalendarDays size={18} className="absolute right-3 top-2.5 text-dark-muted pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="flex space-x-3 mt-6 pt-2">
                <button 
                  type="button" onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-dark-bg border border-dark-border hover:bg-dark-border/50 text-dark-text py-2.5 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white py-2.5 rounded-lg transition-colors font-medium shadow-lg shadow-emerald-900/20 flex justify-center items-center"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Save EMI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}