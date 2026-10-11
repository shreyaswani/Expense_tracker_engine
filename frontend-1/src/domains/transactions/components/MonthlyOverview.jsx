import { useMemo } from 'react';

export default function MonthlyOverview({ transactions }) {
  
  const stats = useMemo(() => {
    let totalSpent = 0;
    let totalPaid = 0;
    let totalCashback = 0;
    let totalRefunds = 0;

    transactions.forEach(txn => {
      const amount = parseFloat(txn.Amount) || 0;
      if (txn.Type === 'Expense') totalSpent += amount;
      if (txn.Type === 'Payment') totalPaid += amount;
      if (txn.Type === 'Cashback') totalCashback += amount;
      if (txn.Type === 'Refund') totalRefunds += amount;
    });

    const netSpend = totalSpent - totalRefunds;

    return { totalSpent, totalPaid, totalCashback, totalRefunds, netSpend };
  }, [transactions]);

  return (
    <div className="h-full w-full flex flex-col">
      <h3 className="text-lg font-semibold text-dark-text mb-6">Monthly Overview</h3>

      <div className="grid grid-cols-2 gap-4 flex-1">
        {/* Net Spend Box */}
        <div className="bg-dark-bg/50 border border-dark-border rounded-lg p-4 flex flex-col justify-center">
          <span className="text-sm text-dark-muted mb-1">Net Spend</span>
          <span className="text-2xl font-bold text-rose-400">₹{stats.netSpend.toLocaleString()}</span>
          {stats.totalRefunds > 0 && (
            <span className="text-xs text-dark-muted mt-1">(After ₹{stats.totalRefunds} refunds)</span>
          )}
        </div>

        {/* Total Paid Box */}
        <div className="bg-dark-bg/50 border border-dark-border rounded-lg p-4 flex flex-col justify-center">
          <span className="text-sm text-dark-muted mb-1">Bill Payments</span>
          <span className="text-2xl font-bold text-emerald-400">₹{stats.totalPaid.toLocaleString()}</span>
        </div>

        {/* Cashback Box */}
        <div className="bg-dark-bg/50 border border-dark-border rounded-lg p-4 flex flex-col justify-center">
          <span className="text-sm text-dark-muted mb-1">Rewards / Cashback</span>
          <span className="text-xl font-bold text-indigo-400">₹{stats.totalCashback.toLocaleString()}</span>
        </div>

        {/* Cycle Status Box */}
        <div className="bg-dark-bg/50 border border-dark-border rounded-lg p-4 flex flex-col justify-center">
          <span className="text-sm text-dark-muted mb-1">Payment Status</span>
          <span className={`text-lg font-bold ${stats.totalPaid >= stats.netSpend ? 'text-emerald-400' : 'text-amber-400'}`}>
            {stats.totalPaid >= stats.netSpend ? 'Cleared' : 'Balance Pending'}
          </span>
        </div>
      </div>
    </div>
  );
}