import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { TrendingDown, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { useMemo } from "react";
import { startOfMonth, endOfMonth, differenceInDays, startOfDay, isSameDay } from "date-fns";
import { useLanguage } from "../schedule-budget-contexts/LanguageContext";

export interface Budget {
  id: string;
  category: string;
  amount: number;
  month: Date; // Start of month
}

export interface Expense {
  id: string;
  date: Date;
  category: string;
  amount: number;
  description: string;
}

interface DailyBudgetDisplayProps {
  budgets: Budget[];
  expenses: Expense[];
}

export function DailyBudgetDisplay({ budgets, expenses }: DailyBudgetDisplayProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const dailyBudgetInfo = useMemo(() => {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    
    // Total budget for this month
    const totalMonthlyBudget = budgets
      .filter(b => b.month.getTime() === monthStart.getTime())
      .reduce((sum, b) => sum + b.amount, 0);

    // Total spent this month
    const monthlySpent = expenses
      .filter(e => {
        const expenseDate = startOfDay(e.date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    // Total spent today
    const todaySpent = expenses
      .filter(e => isSameDay(e.date, today))
      .reduce((sum, e) => sum + e.amount, 0);

    // Remaining budget for the month
    const remainingMonthly = totalMonthlyBudget - monthlySpent;

    // Days left in month (including today)
    const daysLeft = differenceInDays(monthEnd, today) + 1;

    // Daily allowance (remaining budget / days left)
    const dailyAllowance = daysLeft > 0 ? remainingMonthly / daysLeft : 0;

    // Remaining allowance today
    const remainingToday = dailyAllowance - todaySpent;

    return {
      totalMonthlyBudget,
      monthlySpent,
      remainingMonthly,
      todaySpent,
      dailyAllowance,
      remainingToday,
      daysLeft,
      budgetProgress: totalMonthlyBudget > 0 ? (monthlySpent / totalMonthlyBudget) * 100 : 0,
    };
  }, [budgets, expenses]);

  const getStatusColor = () => {
    if (dailyBudgetInfo.remainingToday >= dailyBudgetInfo.dailyAllowance * 0.5) {
      return "text-green-600 bg-green-50";
    } else if (dailyBudgetInfo.remainingToday >= 0) {
      return "text-orange-600 bg-orange-50";
    } else {
      return "text-red-600 bg-red-50";
    }
  };

  const { t } = useLanguage();

  if (dailyBudgetInfo.totalMonthlyBudget === 0) {
    return (
      <Card className="p-6 bg-[#4A4A4A] border-white/40 shadow-[0_8px_24px_rgba(255,255,255,0.2)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[#6A6A6A] rounded-full border-2 border-white/50">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-white">{t('budget.daily')}</h2>
        </div>
        <p className="text-sm text-white/60">{t('budget.setBudget')}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-[#4A4A4A] border-white/40 shadow-[0_8px_24px_rgba(255,255,255,0.2)]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6A6A6A] rounded-full border-2 border-white/50 shadow-sm">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-white">{t('budget.todayAllowance')}</h2>
          </div>
          <Badge variant={dailyBudgetInfo.remainingToday >= 0 ? "default" : "destructive"} className="bg-white text-black">
            {dailyBudgetInfo.daysLeft} {t('budget.daysLeft')}
          </Badge>
        </div>

        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl text-white">₩{formatCurrency(Math.max(0, Math.round(dailyBudgetInfo.dailyAllowance)))}</span>
            <span className="text-sm text-white/60">{t('budget.perDay')}</span>
          </div>
          <p className="text-sm text-white/60">
            {t('budget.dailyAllowance')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-[#2A2A2A] rounded-lg border border-white/30">
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="w-4 h-4 text-white/60" />
              <span className="text-xs text-white/60">{t('budget.spentToday')}</span>
            </div>
            <p className="text-lg text-white">₩{formatCurrency(dailyBudgetInfo.todaySpent)}</p>
          </div>

          <div className="p-3 bg-[#2A2A2A] rounded-lg border border-white/30">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-white/60" />
              <span className="text-xs text-white/60">{t('budget.remainingToday')}</span>
            </div>
            <p className={`text-lg ${dailyBudgetInfo.remainingToday >= 0 ? 'text-white' : 'text-red-600'}`}>
              ₩{formatCurrency(Math.round(dailyBudgetInfo.remainingToday))}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-white/30">
          <div className="flex justify-between items-center text-sm mb-2 text-white">
            <span>{t('budget.monthlyProgress')}</span>
            <span className="font-medium">
              {dailyBudgetInfo.budgetProgress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-[#2A2A2A] rounded-full h-2 overflow-hidden border border-white/20">
            <div 
              className={`h-full transition-all ${
                dailyBudgetInfo.budgetProgress > 100 ? 'bg-red-600' : 
                dailyBudgetInfo.budgetProgress > 80 ? 'bg-orange-500' : 
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(dailyBudgetInfo.budgetProgress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/60 mt-1">
            <span>₩{formatCurrency(dailyBudgetInfo.monthlySpent)} {t('budget.spent')}</span>
            <span>₩{formatCurrency(dailyBudgetInfo.totalMonthlyBudget)} {t('budget.daily')}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}