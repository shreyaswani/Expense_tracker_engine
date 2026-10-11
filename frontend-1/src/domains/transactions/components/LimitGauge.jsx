import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function LimitGauge({ transactions, creditLimit = 17000 }) {
  
  const currentBalance = useMemo(() => {
    return transactions.reduce((acc, txn) => {
      const amount = parseFloat(txn.Amount) || 0;
      if (txn.Type === 'Expense') return acc + amount;
      if (['Refund', 'Cashback'].includes(txn.Type)) return acc - amount;
      return acc;
    }, 0);
  }, [transactions]);

  const displayBalance = Math.max(0, currentBalance);
  const remaining = Math.max(0, creditLimit - displayBalance);
  
  const percentUsed = creditLimit > 0 ? (displayBalance / creditLimit) * 100 : 0;

  let gaugeColor = '#10b981'; 
  if (percentUsed > 30) gaugeColor = '#f59e0b'; 
  if (percentUsed > 70) gaugeColor = '#ef4444'; 

  const data = [
    { name: 'Used', value: displayBalance, color: gaugeColor },
    { name: 'Remaining', value: remaining, color: '#334155' } 
  ];

  return (
    <div className="h-full w-full flex flex-col items-center justify-between">
      <h3 className="text-lg font-semibold text-dark-text w-full text-left">Credit Utilization</h3>
      
      <div className="relative w-full h-56 flex items-end justify-center mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="75%"
              startAngle={180}
              endAngle={0}
              innerRadius={90}
              outerRadius={120}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute bottom-6 flex flex-col items-center">
          <span className="text-3xl font-bold text-dark-text">₹{displayBalance.toLocaleString()}</span>
          {/* THE FIX: Added the percentage used string! */}
          <span className="text-sm text-dark-muted mt-1">
            <span className="font-semibold text-dark-text">{percentUsed.toFixed(1)}% Used</span> - ₹{creditLimit.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}