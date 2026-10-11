import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TrendChart({ transactions = [] }) {
  
  const data = useMemo(() => {
    const expenses = transactions.filter(txn => txn.Type !== 'Payment');
    
    // 1. Group expenses by Date to get total daily spend
    const groupedByDate = expenses.reduce((acc, txn) => {
      const date = txn.Date;
      const amount = parseFloat(txn.Amount) || 0;
      
      if (!acc[date]) acc[date] = 0;
      acc[date] += amount;
      return acc;
    }, {});

    // 2. Convert to array (assuming dates in Google Sheets are chronologically ordered)
    const dailyData = Object.entries(groupedByDate).map(([date, amount]) => ({
      date,
      dailyAmount: amount
    }));

    // 3. Calculate a cumulative total so the chart line climbs as the month progresses
    let runningTotal = 0;
    return dailyData.map(day => {
      runningTotal += day.dailyAmount;
      return {
        date: day.date,
        dailyAmount: day.dailyAmount,
        amount: runningTotal // The Area chart will plot this cumulative amount
      };
    });
  }, [transactions]);

  if (data.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-dark-card rounded-xl">
        <p className="text-dark-muted">No trend data available.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <h3 className="text-lg font-semibold text-dark-text mb-4">Cumulative Spending Trend</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8" 
              tick={{ fill: '#94a3b8', fontSize: 12 }} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#94a3b8" 
              tick={{ fill: '#94a3b8', fontSize: 12 }} 
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip
              formatter={(value) => [`₹${value.toLocaleString()}`, 'Total Spent']}
              labelStyle={{ color: '#94a3b8' }}
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                borderColor: '#334155',
                borderRadius: '0.5rem',
                color: '#f8fafc'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke="#10b981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorAmount)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}