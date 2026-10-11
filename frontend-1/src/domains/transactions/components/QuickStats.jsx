import { useMemo } from 'react';
import { TrendingDown, Trophy, Wallet } from 'lucide-react';

export default function QuickStats({ monthlyTransactions }) {
  
  const stats = useMemo(() => {
    let topExpense = { Description: 'None', Amount: 0 };
    let totalSpend = 0;
    let totalRecovered = 0; // Cashbacks + Refunds

    monthlyTransactions.forEach(txn => {
      const amount = parseFloat(txn.Amount) || 0;
      
      if (txn.Type === 'Expense') {
        totalSpend += amount;
        if (amount > topExpense.Amount) {
          topExpense = { Description: txn.Description, Amount: amount };
        }
      }
      if (txn.Type === 'Cashback' || txn.Type === 'Refund') {
        totalRecovered += amount;
      }
    });

    // Rough daily average (assuming 30 days for simplicity in the current view)
    const dailyAvg = totalSpend / 30;

    return { topExpense, dailyAvg, totalRecovered };
  }, [monthlyTransactions]);

  return (
    <div className="flex flex-col space-y-4 h-full justify-between">
      
      {/* Top Expense */}
      <div className="bg-dark-bg/50 border border-dark-border rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-dark-muted mb-1">Top Expense This Month</p>
          <p className="text-lg font-semibold text-rose-400">₹{stats.topExpense.Amount.toLocaleString()}</p>
          <p className="text-xs text-dark-muted truncate w-32">{stats.topExpense.Description}</p>
        </div>
        <div className="bg-rose-500/20 p-3 rounded-full text-rose-400">
          <TrendingDown size={20} />
        </div>
      </div>

      {/* Daily Average */}
      <div className="bg-dark-bg/50 border border-dark-border rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-dark-muted mb-1">Daily Average Spend</p>
          <p className="text-lg font-semibold text-amber-400">₹{stats.dailyAvg.toFixed(0).toLocaleString()}</p>
          <p className="text-xs text-dark-muted">Per day</p>
        </div>
        <div className="bg-amber-500/20 p-3 rounded-full text-amber-400">
          <Wallet size={20} />
        </div>
      </div>

      {/* Recovered Money */}
      <div className="bg-dark-bg/50 border border-dark-border rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-dark-muted mb-1">Total Recovered</p>
          <p className="text-lg font-semibold text-indigo-400">₹{stats.totalRecovered.toLocaleString()}</p>
          <p className="text-xs text-dark-muted">Refunds & Cashbacks</p>
        </div>
        <div className="bg-indigo-500/20 p-3 rounded-full text-indigo-400">
          <Trophy size={20} />
        </div>
      </div>

    </div>
  );
}