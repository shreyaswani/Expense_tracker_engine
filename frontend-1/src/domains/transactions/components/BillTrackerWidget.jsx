import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Receipt } from 'lucide-react';
import { fetchBillSummary } from '../../../api/client';

export default function BillTrackerWidget({ activeCardId, activeCycle, transactions }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // We re-fetch whenever the card changes OR whenever transactions update
  useEffect(() => {
    if (!activeCardId) return;
    const loadSummary = async () => {
      try {
        const res = await fetchBillSummary(activeCardId);
        setSummary(res.data);
      } catch (err) {
        console.error("Failed to load bill summary", err);
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, [activeCardId, transactions]); 

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-emerald-400 h-40">
        <Loader2 className="animate-spin mb-2" size={24} />
        <span className="text-sm">Calculating Bills...</span>
      </div>
    );
  }

  const cycleData = summary?.[activeCycle] || { generated: 0, paid: 0 };
  const generated = Math.max(0, cycleData.generated);
  const paid = Math.max(0, cycleData.paid);
  const remaining = Math.max(0, generated - paid);
  const progress = generated > 0 ? Math.min(100, (paid / generated) * 100) : 0;
  const isCleared = progress >= 100 && generated > 0;
  const noBill = generated === 0;

  return (
    <div className="h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-dark-text flex items-center">
          <Receipt size={18} className="mr-2 text-indigo-400" />
          Bill Status
        </h3>
        {isCleared && <CheckCircle2 size={20} className="text-emerald-500" />}
        {(!isCleared && !noBill) && <AlertCircle size={20} className="text-rose-400" />}
      </div>

      {noBill ? (
        <div className="flex-1 flex items-center justify-center text-dark-muted text-sm border border-dashed border-dark-border rounded-lg bg-dark-bg/30">
          No bill generated for {activeCycle}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-dark-muted font-medium uppercase tracking-wider mb-1">Generated</p>
                <p className="text-xl font-bold text-dark-text">₹{generated.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-dark-muted font-medium uppercase tracking-wider mb-1">Paid</p>
                <p className="text-xl font-bold text-emerald-400">₹{paid.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              </div>
            </div>

            <div className="w-full h-3 bg-dark-bg rounded-full overflow-hidden border border-dark-border">
              <div 
                className={`h-full transition-all duration-1000 ease-out ${isCleared ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between text-xs font-medium">
              <span className="text-dark-muted">{progress.toFixed(0)}% Settled</span>
              {isCleared ? (
                <span className="text-emerald-400">Bill Cleared!</span>
              ) : (
                <span className="text-rose-400">₹{remaining.toLocaleString(undefined, {maximumFractionDigits: 0})} Remaining</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}