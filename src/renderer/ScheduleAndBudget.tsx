import { useState, useMemo, useEffect } from "react";
import { WealthDisplay } from "./schedule-budget-components/WealthDisplay";
import { TotalAssetsDisplay } from "./schedule-budget-components/TotalAssetsDisplay";
import { WealthAssetModal, Item, Debt, Loan } from "./schedule-budget-components/WealthAssetModal";
import { CashHistoryModal, CashTransaction } from "./schedule-budget-components/CashHistoryModal";
import { ScheduleForm, Schedule } from "./schedule-budget-components/ScheduleForm";
import { ScheduleList } from "./schedule-budget-components/ScheduleList";
import { RecurringExpenseForm, RecurringExpense } from "./schedule-budget-components/RecurringExpenseForm";
import { RecurringExpenseList } from "./schedule-budget-components/RecurringExpenseList";
import { BalanceTimeline } from "./schedule-budget-components/BalanceTimeline";
import { DailyBudgetDisplay, Budget, Expense } from "./schedule-budget-components/DailyBudgetDisplay";
import { BudgetManager } from "./schedule-budget-components/BudgetManager";
import { LanguageToggle } from "./schedule-budget-components/LanguageToggle";
import { Button } from "./schedule-budget-components/ui/button";
import { Separator } from "./schedule-budget-components/ui/separator";
import { Wallet } from "lucide-react";
import { LanguageProvider, useLanguage } from "./schedule-budget-contexts/LanguageContext";

// Helper to load from localStorage
const loadState = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return defaultValue;
  try {
    const parsed = JSON.parse(saved);
    // Recursively convert date strings back to Date objects
    const reviveDates = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(obj)) {
        return new Date(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(reviveDates);
      }
      if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
          newObj[key] = reviveDates(obj[key]);
        }
        return newObj;
      }
      return obj;
    };
    return reviveDates(parsed);
  } catch (e) {
    console.error(`Error loading state ${key}`, e);
    return defaultValue;
  }
};

// Helper to save to localStorage
const saveState = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

function ScheduleAndBudgetContent() {
  const { t } = useLanguage();

  // Initialize states from localStorage
  const [cashAmount, setCashAmount] = useState<number>(() => loadState('cashAmount', 0));
  const [items, setItems] = useState<Item[]>(() => loadState('items', []));
  const [debts, setDebts] = useState<Debt[]>(() => loadState('debts', []));
  const [loans, setLoans] = useState<Loan[]>(() => loadState('loans', []));
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() => loadState('cashTransactions', []));
  const [budgets, setBudgets] = useState<Budget[]>(() => loadState('budgets', []));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadState('expenses', []));
  const [schedules, setSchedules] = useState<Schedule[]>(() => loadState('schedules', []));
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(() => loadState('recurringExpenses', []));

  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Sync states to localStorage
  useEffect(() => { saveState('cashAmount', cashAmount); }, [cashAmount]);
  useEffect(() => { saveState('items', items); }, [items]);
  useEffect(() => { saveState('debts', debts); }, [debts]);
  useEffect(() => { saveState('loans', loans); }, [loans]);
  useEffect(() => { saveState('cashTransactions', cashTransactions); }, [cashTransactions]);
  useEffect(() => { saveState('budgets', budgets); }, [budgets]);
  useEffect(() => { saveState('expenses', expenses); }, [expenses]);
  useEffect(() => { saveState('schedules', schedules); }, [schedules]);
  useEffect(() => { saveState('recurringExpenses', recurringExpenses); }, [recurringExpenses]);

  // Calculate current wealth (Cash + Loans - Debts)
  const currentWealth = useMemo(() => {
    const totalDebts = debts.reduce((sum, debt) => sum + debt.amount, 0);
    const totalLoans = loans.reduce((sum, loan) => sum + loan.amount, 0);
    return cashAmount + totalLoans - totalDebts;
  }, [cashAmount, debts, loans]);

  // Calculate total assets (Cash + Loans + Other Assets)
  const totalAssets = useMemo(() => {
    const totalLoans = loans.reduce((sum, loan) => sum + loan.amount, 0);
    const totalItems = items.reduce((sum, item) => sum + item.amount, 0);
    return cashAmount + totalLoans + totalItems ;
  }, [cashAmount, loans, items]);

  // Helper function to add cash transaction
  const addCashTransaction = (type: 'income' | 'expense', amount: number, description: string, newBalance: number) => {
    const transaction: CashTransaction = {
      id: Date.now().toString(),
      date: new Date(),
      type,
      amount,
      description,
      balance: newBalance,
    };
    setCashTransactions(prev => [...prev, transaction]);
  };

  const handleAddSchedule = (newSchedule: Omit<Schedule, 'id'>) => {
    const schedule: Schedule = {
      ...newSchedule,
      id: Date.now().toString(),
    };
    setSchedules(prevSchedules => [...prevSchedules, schedule]);
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules(prevSchedules => prevSchedules.filter(schedule => schedule.id !== id));
  };

  const handleExecuteSale = (scheduleId: string) => {
    const saleSchedule = schedules.find(s => s.id === scheduleId && s.isSaleSchedule);
    if (!saleSchedule || !saleSchedule.itemId) return;

    const item = items.find(i => i.id === saleSchedule.itemId);
    if (!item) {
      alert("매도할 자산을 찾을 수 없습니다.");
      return;
    }

    handleSellItem(item.id, item.name, saleSchedule.requiredAmount);
    setSchedules(prevSchedules => prevSchedules.filter(s => s.id !== scheduleId));
  };

  const handleAddRecurringExpense = (newExpense: Omit<RecurringExpense, 'id'>) => {
    const expense: RecurringExpense = {
      ...newExpense,
      id: Date.now().toString(),
    };
    setRecurringExpenses(prevExpenses => [...prevExpenses, expense]);
  };

  const handleDeleteRecurringExpense = (id: string) => {
    setRecurringExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== id));
  };

  const handleUpdateCash = (amount: number) => {
    setCashAmount(amount);
  };

  const handleAddItem = (newItem: Omit<Item, 'id'>) => {
    const item: Item = {
      ...newItem,
      id: Date.now().toString(),
    };
    setItems(prevItems => [...prevItems, item]);
  };

  const handleDeleteItem = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const handleSellItem = (itemId: string, itemName: string, salePrice: number) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    const newCashAmount = cashAmount + salePrice;
    setCashAmount(newCashAmount);
    addCashTransaction('income', salePrice, `Sold: ${itemName}`, newCashAmount);
  };

  const handleScheduleSale = (itemId: string, itemName: string, salePrice: number, saleDate: Date) => {
    const saleSchedule: Schedule = {
      id: Date.now().toString(),
      title: `${itemName} 매도`,
      date: saleDate,
      requiredAmount: salePrice,
      isIncome: true,
      isSaleSchedule: true,
      itemId: itemId,
    };
    setSchedules(prevSchedules => [...prevSchedules, saleSchedule]);
  };

  const handleAddDebt = (newDebt: Omit<Debt, 'id'>) => {
    const debt: Debt = {
      ...newDebt,
      id: Date.now().toString(),
    };
    setDebts(prevDebts => [...prevDebts, debt]);
  };

  const handleDeleteDebt = (id: string) => {
    setDebts(prevDebts => prevDebts.filter(debt => debt.id !== id));
  };

  const handleAddLoan = (newLoan: Omit<Loan, 'id'>) => {
    const loan: Loan = {
      ...newLoan,
      id: Date.now().toString(),
    };
    const newCashAmount = cashAmount - newLoan.amount;
    setCashAmount(newCashAmount);
    addCashTransaction('expense', newLoan.amount, `Loan given: ${newLoan.name}`, newCashAmount);
    setLoans(prevLoans => [...prevLoans, loan]);
  };

  const handleDeleteLoan = (id: string) => {
    setLoans(prevLoans => prevLoans.filter(loan => loan.id !== id));
  };

  const handleRepayLoan = (id: string) => {
    const loanToRepay = loans.find(loan => loan.id === id);
    if (loanToRepay) {
      const newCashAmount = cashAmount + loanToRepay.amount;
      setCashAmount(newCashAmount);
      addCashTransaction('income', loanToRepay.amount, `Loan received: ${loanToRepay.name}`, newCashAmount);
    }
    setLoans(prevLoans => prevLoans.filter(loan => loan.id !== id));
  };

  const handleAddBudget = (newBudget: Omit<Budget, 'id'>) => {
    const budget: Budget = {
      ...newBudget,
      id: Date.now().toString(),
    };
    setBudgets(prevBudgets => [...prevBudgets, budget]);
  };

  const handleDeleteBudget = (id: string) => {
    setBudgets(prevBudgets => prevBudgets.filter(budget => budget.id !== id));
  };

  const handleAddExpense = (newExpense: Omit<Expense, 'id'>) => {
    const expense: Expense = {
      ...newExpense,
      id: Date.now().toString(),
    };
    setExpenses(prevExpenses => [...prevExpenses, expense]);
    
    // Deduct from cash and add transaction history
    const newCashAmount = cashAmount - newExpense.amount;
    setCashAmount(newCashAmount);
    addCashTransaction('expense', newExpense.amount, `Expense: ${newExpense.description || newExpense.category}`, newCashAmount);
  };

  const handleDeleteExpense = (id: string) => {
    const expenseToDelete = expenses.find(e => e.id === id);
    if (expenseToDelete) {
      const newCashAmount = cashAmount + expenseToDelete.amount;
      setCashAmount(newCashAmount);
      addCashTransaction('income', expenseToDelete.amount, `Expense deleted: ${expenseToDelete.description || expenseToDelete.category}`, newCashAmount);
    }
    setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== id));
  };

  const handleRepayDebt = (id: string) => {
    const debtToRepay = debts.find(debt => debt.id === id);
    if (debtToRepay) {
      const newCashAmount = cashAmount - debtToRepay.amount;
      setCashAmount(newCashAmount);
      addCashTransaction('expense', debtToRepay.amount, `Debt repaid: ${debtToRepay.name}`, newCashAmount);
    }
    setDebts(prevDebts => prevDebts.filter(debt => debt.id !== id));
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000000', padding: '24px', overflowY: 'auto' }}>
      <div style={{ maxWidth: '1024px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ position: 'absolute', top: 0, right: 0 }}>
            <LanguageToggle />
          </div>
          <h1 style={{ marginBottom: '8px', color: '#FFFFFF', fontSize: '32px', fontWeight: 'bold' }}>{t('app.title')}</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{t('app.subtitle')}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <WealthDisplay 
            wealth={cashAmount} 
            onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
          />
          
          <TotalAssetsDisplay
            totalAssets={totalAssets}
            onOpenAssetModal={() => setIsAssetModalOpen(true)}
          />
          
          <DailyBudgetDisplay
            budgets={budgets}
            expenses={expenses}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            onClick={() => setIsBudgetModalOpen(true)}
            variant="outline"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Wallet style={{ width: '16px', height: '16px' }} />
            {t('budget.manager')}
          </Button>
        </div>

        <WealthAssetModal
          open={isAssetModalOpen}
          onOpenChange={setIsAssetModalOpen}
          cashAmount={cashAmount}
          items={items}
          debts={debts}
          loans={loans}
          onUpdateCash={handleUpdateCash}
          onAddItem={handleAddItem}
          onDeleteItem={handleDeleteItem}
          onSellItem={handleSellItem}
          onScheduleSale={handleScheduleSale}
          onAddDebt={handleAddDebt}
          onDeleteDebt={handleDeleteDebt}
          onAddLoan={handleAddLoan}
          onDeleteLoan={handleDeleteLoan}
          onRepayLoan={handleRepayLoan}
          onRepayDebt={handleRepayDebt}
        />

        <BudgetManager
          open={isBudgetModalOpen}
          onOpenChange={setIsBudgetModalOpen}
          budgets={budgets}
          expenses={expenses}
          onAddBudget={handleAddBudget}
          onDeleteBudget={handleDeleteBudget}
          onAddExpense={handleAddExpense}
          onDeleteExpense={handleDeleteExpense}
        />

        <CashHistoryModal
          open={isHistoryModalOpen}
          onOpenChange={setIsHistoryModalOpen}
          transactions={cashTransactions}
        />

        <Separator />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          <ScheduleForm onAddSchedule={handleAddSchedule} />
          <RecurringExpenseForm onAddExpense={handleAddRecurringExpense} />
          
          <div style={{ gridColumn: '1 / -1' }}>
            <ScheduleList 
              schedules={schedules}
              currentWealth={currentWealth}
              onDeleteSchedule={handleDeleteSchedule}
              onExecuteSale={handleExecuteSale}
            />
          </div>
          
          <div style={{ gridColumn: '1 / -1' }}>
            <RecurringExpenseList 
              expenses={recurringExpenses}
              onDeleteExpense={handleDeleteRecurringExpense}
            />
          </div>
        </div>

        <Separator />

        <BalanceTimeline 
          currentWealth={currentWealth}
          schedules={schedules}
          recurringExpenses={recurringExpenses}
        />
      </div>
    </div>
  );
}

export default function ScheduleAndBudget() {
  return (
    <LanguageProvider>
      <ScheduleAndBudgetContent />
    </LanguageProvider>
  );
}
