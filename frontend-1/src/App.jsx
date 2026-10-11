import { useState, useMemo } from "react";
import {
  CreditCard,
  Landmark,
  LayoutDashboard,
  PlusCircle,
  Calendar,
  ShoppingBag,
  PiggyBank,
  Users,
} from "lucide-react";
import { useDashboardData } from "./hooks/useDashboardData";

// Widgets
import TrendChart from "./domains/transactions/components/TrendChart";
import CategoryChart from "./domains/transactions/components/CategoryChart";
import LimitGauge from "./domains/transactions/components/LimitGauge";
import MonthlyOverview from "./domains/transactions/components/MonthlyOverview";
import QuickStats from "./domains/transactions/components/QuickStats";
import TransactionTable from "./domains/transactions/components/TransactionTable";
import TransactionFormModal from "./domains/transactions/components/TransactionFormModal";
import EmiDashboard from "./domains/emis/components/EmiDashboard";
import TakeMoneyDashboard from "./domains/bank/components/TakeMoneyDashboard";
import BillTrackerWidget from "./domains/transactions/components/BillTrackerWidget";
import EditTransactionModal from "./domains/transactions/components/EditTransactionModal";
import ProfileSettingsModal from './domains/profile/components/ProfileSettingsModal';
import WealthDashboard from './domains/bank/components/WealthDashboard'; 
import BankDashboard from './domains/bank/components/BankDashboard';
import GlobalQuickAdd from './domains/core/components/GlobalQuickAdd'
import { addTransaction } from "./api/client";

const getBillingCycle = (dateString, billingDay = 1) => {
  const date = new Date(dateString);
  if (isNaN(date)) return "Unknown";

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

  return new Date(year, month, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
};

function App() {
  const [activeTab, setActiveTab] = useState("credit-cards");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userSelectedCycle, setUserSelectedCycle] = useState("");
const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const {
    cards,
    activeCardId,
    setActiveCardId,
    transactions,
    setTransactions,
    loading,
    error,
  } = useDashboardData();

  // 1. DEFINE CARD DETAILS FIRST
  const activeCardDetails = cards.find((c) => c.Card_ID === activeCardId);
  const rawLimitString = activeCardDetails?.Credit_Limit?.toString() || "0";
  const cleanLimit = parseFloat(rawLimitString.replace(/,/g, "")) || 0;
  const billingDay = parseInt(activeCardDetails?.Billing_Day);

  // 2. NOW WE CAN USE BILLING DAY TO GET CYCLES
  const availableCycles = useMemo(() => {
    const cycles = new Set();
    transactions.forEach((txn) => {
      cycles.add(getBillingCycle(txn.Date, billingDay));
    });
    return Array.from(cycles).sort((a, b) => new Date(a) - new Date(b));
  }, [transactions, billingDay]);

  // 3. NOW WE CAN SET THE ACTIVE CYCLE
  const activeCycle =
    userSelectedCycle ||
    (availableCycles.length > 0
      ? availableCycles[availableCycles.length - 1]
      : "");

  // 4. FILTER TRANSACTIONS FOR THAT CYCLE
  const cycleTransactions = useMemo(() => {
    if (!activeCycle) return transactions;
    return transactions
      .filter((txn) => getBillingCycle(txn.Date, billingDay) === activeCycle)
      .sort((a, b) => new Date(a.Date) - new Date(b.Date));
  }, [transactions, activeCycle, billingDay]);

  // 5. GET LAST TXN DATE
  const lastTxnDate = useMemo(() => {
    if (!transactions || transactions.length === 0) return "No entries";

    const parseSafeDate = (dateStr) => {
      const d = new Date(dateStr);
      if (d > new Date()) d.setFullYear(d.getFullYear() - 1);
      return d;
    };

    const sorted = [...transactions].sort(
      (a, b) => parseSafeDate(b.Date) - parseSafeDate(a.Date),
    );
    return sorted[0].Date;
  }, [transactions]);

  // 6. CALCULATE BALANCES
  const currentBalance = useMemo(() => {
    return cycleTransactions.reduce((acc, txn) => {
      const amount = parseFloat(txn.Amount) || 0;
      if (txn.Type === "Expense") return acc + amount;
      if (["Refund", "Cashback"].includes(txn.Type)) return acc - amount;
      return acc;
    }, 0);
  }, [cycleTransactions]);

  const availableCredit = Math.max(0, cleanLimit - Math.max(0, currentBalance));

  // 7. SUBMIT HANDLER
  const handleAddTransaction = async (newTransactionData) => {
    try {
      const response = await addTransaction(newTransactionData);
      const savedTransaction = {
        ...newTransactionData,
        Txn_ID: response.data.Txn_ID,
      };
      setTransactions((prev) => [...prev, savedTransaction]);
    } catch (err) {
      console.error("Failed to add transaction", err);
      alert("Failed to save transaction.");
    }
  };

  // 8. RENDER GUARDS
  if (loading && cards.length === 0)
    return (
      <div className="flex h-screen bg-dark-bg items-center justify-center text-emerald-400 font-medium">
        Loading your finances...
      </div>
    );
  if (error)
    return (
      <div className="flex h-screen bg-dark-bg items-center justify-center text-rose-400 font-medium">
        {error}
      </div>
    );

  // 9. RETURN JSX
  return (
    <div className="flex h-screen bg-dark-bg text-dark-text overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-dark-card border-r border-dark-border flex flex-col z-20">
        <div className="p-6 border-b border-dark-border">
          <h1 className="text-xl font-bold tracking-wider text-emerald-400">
            MONEY.
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <p className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-4 mt-4">
            Dashboards
          </p>
          <button
            onClick={() => setActiveTab("credit-cards")}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "credit-cards" ? "bg-emerald-500/10 text-emerald-400" : "text-dark-muted hover:bg-dark-border/50 hover:text-dark-text"}`}
          >
            <CreditCard size={20} />
            <span className="font-medium">Credit Cards</span>
          </button>

          <button
            onClick={() => setActiveTab("emis")}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "emis" ? "bg-emerald-500/10 text-emerald-400" : "text-dark-muted hover:bg-dark-border/50 hover:text-dark-text"}`}
          >
            <ShoppingBag size={20} />
            <span className="font-medium">EMIs</span>
          </button>

<button 
            onClick={() => setActiveTab('bank')} 
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'bank' ? 'bg-emerald-500/10 text-emerald-400' : 'text-dark-muted hover:bg-dark-border/50 hover:text-dark-text'}`}
          >
            <Landmark size={20} />
            <span className="font-medium">Bank Accounts</span>
          </button>

          <button
            onClick={() => setActiveTab("take-money")}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "take-money" ? "bg-indigo-500/10 text-indigo-400" : "text-dark-muted hover:bg-dark-border/50 hover:text-dark-text"}`}
          >
            <Users size={20} />
            <span className="font-medium">Take Money</span>
          </button>

          <button 
            onClick={() => setActiveTab('wealth')} 
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'wealth' ? 'bg-emerald-500/10 text-emerald-400' : 'text-dark-muted hover:bg-dark-border/50 hover:text-dark-text'}`}
          >
            <PiggyBank size={20} />
            <span className="font-medium">Saving & Goals</span>
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative h-screen overflow-hidden">
        {/* --- NEW: GLOBAL PROFILE HEADER --- */}
        <div className="h-19 bg-dark-bg border-b border-dark-border flex justify-between items-center px-8 shrink-0 z-20">
          <div className="text-emerald-400 font-bold tracking-widest md:hidden">
            SHREYAS.
          </div>
          <div className="hidden md:block"></div>{" "}
          {/* Spacer to push profile to the right */}
          <div className="flex items-center space-x-4">
<div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-dark-text">Shreyas Wani</p>
          <p 
            onClick={() => setIsProfileModalOpen(true)} 
            className="text-xs text-emerald-400 cursor-pointer hover:text-emerald-300"
          >
            View Profile
          </p>
        </div>
        <div 
           onClick={() => setIsProfileModalOpen(true)}
           className="h-10 w-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-900/20 cursor-pointer hover:bg-emerald-500 transition"
        >
          SW
        </div>
          </div>
        </div>

        {/* --- CONDITIONAL CREDIT CARD HEADER --- */}
        {/* This header (and the Add Expense button) will NOW ONLY show up when the Credit Card tab is active! */}
        {activeTab === "credit-cards" && (
          <header className="h-20 flex items-center justify-between px-8 bg-dark-card/50 backdrop-blur-sm border-b border-dark-border shrink-0">
            <div className="flex items-center space-x-3">
              <LayoutDashboard className="text-dark-muted" />
              <h2 className="text-xl font-semibold">
                {activeCardDetails ? activeCardDetails.Card_Name : "Loading..."}
                <span className="text-sm font-normal text-dark-muted ml-4 border-l border-dark-border pl-4 hidden md:inline-block">
                  Available:{" "}
                  <span className="text-emerald-400 font-medium">
                    ₹{availableCredit.toLocaleString()}
                  </span>
                  <span className="mx-2">•</span>
                  Last Txn:{" "}
                  <span className="text-emerald-400 font-medium">
                    {lastTxnDate}
                  </span>
                </span>
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-dark-bg border border-dark-border rounded-lg px-3 py-2">
                <Calendar size={16} className="text-dark-muted mr-2" />
                <select
                  value={activeCycle}
                  onChange={(e) => setUserSelectedCycle(e.target.value)}
                  className="bg-transparent text-sm text-dark-text focus:outline-none cursor-pointer"
                >
                  {availableCycles.map((cycle) => (
                    <option key={cycle} value={cycle}>
                      {cycle}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
              >
                <PlusCircle size={18} />
                <span>Add Expense</span>
              </button>
            </div>
          </header>
        )}

        {/* DASHBOARD GRID CONTENT */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === "credit-cards" && (
            <div className="space-y-6 max-w-7xl mx-auto pb-10">
              <div className="flex space-x-4 overflow-x-auto pb-2">
                {cards.map((card) => (
                  <button
                    key={card.Card_ID}
                    onClick={() => setActiveCardId(card.Card_ID)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg transition-colors border ${
                      activeCardId === card.Card_ID
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-400"
                        : "bg-dark-card border-dark-border hover:bg-dark-border/50 text-dark-muted"
                    }`}
                  >
                    {card.Card_Name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-72">
                <div className="col-span-1 lg:col-span-1 bg-dark-card border border-dark-border rounded-xl p-6 shadow-sm">
                  <LimitGauge
                    transactions={cycleTransactions}
                    creditLimit={cleanLimit}
                  />
                </div>
                <div className="col-span-1 lg:col-span-2 bg-dark-card border border-dark-border rounded-xl p-6 shadow-sm">
                  <MonthlyOverview transactions={cycleTransactions} />
                </div>
                <div className="col-span-1 lg:col-span-1 bg-dark-card border border-dark-border rounded-xl p-6 shadow-sm">
                  <QuickStats monthlyTransactions={cycleTransactions} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-96">
                <div className="col-span-1 lg:col-span-2 bg-dark-card border border-dark-border rounded-xl p-6 shadow-sm">
                  <TrendChart transactions={cycleTransactions} />
                </div>
                <div className="col-span-1 lg:col-span-1 bg-dark-card border border-dark-border rounded-xl p-6 shadow-sm">
                  <CategoryChart transactions={cycleTransactions} />
                </div>
                <div className="col-span-1 lg:col-span-1 bg-dark-card border border-dark-border rounded-xl p-6 shadow-sm">
                  <BillTrackerWidget
                    activeCardId={activeCardId}
                    activeCycle={activeCycle}
                    transactions={transactions}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1">
                <TransactionTable
                  transactions={transactions}
                  billingDay={billingDay}
                  onRowClick={(txn) => {
                    setEditingTxn(txn);
                    setIsEditModalOpen(true);
                  }}
                />
              </div>
            </div>
          )}
          {activeTab === "emis" && <EmiDashboard />}
{activeTab === 'bank' && (
            <BankDashboard />
          )}
{activeTab === 'wealth' && (
            <WealthDashboard />
          )}
          {activeTab === "take-money" && <TakeMoneyDashboard />}
        </div>
      </main>

      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTransaction}
        activeCardId={activeCardId}
      />
      <EditTransactionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        transaction={editingTxn}
        onSaveSuccess={(updatedTxn) => {
          // Instantly updates the UI array without a page reload
          setTransactions((prev) =>
            prev.map((t) => (t.Txn_ID === updatedTxn.Txn_ID ? updatedTxn : t)),
          );
        }}
      />

      <ProfileSettingsModal 
    isOpen={isProfileModalOpen} 
    onClose={() => setIsProfileModalOpen(false)} 
  />
  <GlobalQuickAdd />
    </div>
  );
}

export default App;
