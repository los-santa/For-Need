import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Repeat, Calendar, Wallet, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { RecurringExpense } from "./RecurringExpenseForm";
import { useLanguage } from "../contexts/LanguageContext";

interface RecurringExpenseListProps {
  expenses: RecurringExpense[];
  onDeleteExpense: (id: string) => void;
}

export function RecurringExpenseList({ expenses, onDeleteExpense }: RecurringExpenseListProps) {
  const { t } = useLanguage();
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const frequencyLabels = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly"
  };

  const frequencyColors = {
    daily: "bg-red-100 text-red-700",
    weekly: "bg-orange-100 text-orange-700",
    monthly: "bg-blue-100 text-blue-700",
    yearly: "bg-green-100 text-green-700"
  };

  // Group by amount and frequency
  const groupedExpenses = expenses.reduce((groups, expense) => {
    const key = `${expense.amount}_${expense.frequency}_${expense.isIncome}`;
    if (!groups[key]) {
      groups[key] = {
        amount: expense.amount,
        frequency: expense.frequency,
        isIncome: expense.isIncome,
        items: []
      };
    }
    groups[key].items.push(expense);
    return groups;
  }, {} as Record<string, { amount: number; frequency: string; isIncome?: boolean; items: RecurringExpense[] }>);

  // Convert groups to array and sort (frequency order: daily > weekly > monthly > yearly, then by amount)
  const frequencyOrder = { daily: 0, weekly: 1, monthly: 2, yearly: 3 };
  const sortedGroups = Object.values(groupedExpenses).sort((a, b) => {
    // First sort by income/expense (expenses first)
    if (a.isIncome !== b.isIncome) {
      return a.isIncome ? 1 : -1;
    }
    // Sort by frequency
    const freqCompare = frequencyOrder[a.frequency as keyof typeof frequencyOrder] - frequencyOrder[b.frequency as keyof typeof frequencyOrder];
    if (freqCompare !== 0) return freqCompare;
    // Sort by amount (descending)
    return b.amount - a.amount;
  });

  const totalMonthly = expenses.reduce((sum, expense) => {
    const multiplier = {
      daily: 30,
      weekly: 4.33,
      monthly: 1,
      yearly: 1/12
    };
    const amount = expense.amount * multiplier[expense.frequency];
    return expense.isIncome ? sum - amount : sum + amount;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white">{t('recurring.list')}</h2>
        <Badge variant="secondary" className="bg-[#6A6A6A] text-white">
          Monthly Avg: ₩{formatCurrency(Math.round(totalMonthly))}
        </Badge>
      </div>

      {expenses.length === 0 ? (
        <Card className="p-12 text-center bg-[#4A4A4A] border-white/40 shadow-[0_8px_24px_rgba(255,255,255,0.2)]">
          <Repeat className="w-12 h-12 mx-auto mb-4 opacity-50 text-white" />
          <p className="text-white/60">{t('recurring.noExpenses')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedGroups.map((group) => (
            <Card 
              key={`${group.amount}_${group.frequency}_${group.isIncome}`} 
              className="p-4 bg-[#4A4A4A] border-white/40 shadow-[0_8px_24px_rgba(255,255,255,0.2)]"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {group.isIncome ? (
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  )}
                  <h3 className={group.isIncome ? "text-green-500" : "text-red-500"}>
                    ₩{formatCurrency(group.amount)} {t(`recurring.${group.frequency}` as any)}
                  </h3>
                  <Badge className="bg-[#6A6A6A] text-white border-white/50">
                    {group.items.length} items
                  </Badge>
                </div>

                <div className="space-y-2 ml-7">
                  {group.items.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{expense.title}</span>
                        <span className="text-xs text-white/50">
                          {format(expense.startDate, "yy.MM.dd")}
                          {expense.endDate && ` ~ ${format(expense.endDate, "yy.MM.dd")}`}
                          {!expense.endDate && " ~ Ongoing"}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteExpense(expense.id)}
                        className="text-white/60 hover:text-red-600 hover:bg-white/10 h-6 w-6"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}