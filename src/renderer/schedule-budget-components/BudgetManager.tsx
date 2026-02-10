import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Plus, Trash2, TrendingDown, CalendarIcon, Receipt } from "lucide-react";
import { useState } from "react";
import { format, startOfMonth, isSameMonth } from "date-fns";
import { Budget, Expense } from "./DailyBudgetDisplay";
import { useLanguage } from "../schedule-budget-contexts/LanguageContext";

interface BudgetManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgets: Budget[];
  expenses: Expense[];
  onAddBudget: (budget: Omit<Budget, 'id'>) => void;
  onDeleteBudget: (id: string) => void;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
}

const DEFAULT_CATEGORIES = [
  "Food",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills",
  "Healthcare",
  "Education",
  "Other"
];

export function BudgetManager({
  open,
  onOpenChange,
  budgets,
  expenses,
  onAddBudget,
  onDeleteBudget,
  onAddExpense,
  onDeleteExpense,
}: BudgetManagerProps) {
  const { t } = useLanguage();
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetMonth, setBudgetMonth] = useState<Date>(startOfMonth(new Date()));
  const [customCategory, setCustomCategory] = useState("");
  const [useCustomCategory, setUseCustomCategory] = useState(false);

  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseCustomCategory, setExpenseCustomCategory] = useState("");
  const [expenseUseCustom, setExpenseUseCustom] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatNumber = (value: string) => {
    const number = value.replace(/,/g, '');
    if (!number || isNaN(Number(number))) return '';
    return Number(number).toLocaleString('ko-KR');
  };

  const handleAmountChange = (value: string, setter: (value: string) => void) => {
    const cleanValue = value.replace(/,/g, '');
    if (cleanValue === '' || /^\d+$/.test(cleanValue)) {
      setter(cleanValue);
    }
  };

  const handleAddBudget = () => {
    const category = useCustomCategory ? customCategory : budgetCategory;
    if (!category || !budgetAmount) return;

    onAddBudget({
      category,
      amount: parseFloat(budgetAmount.replace(/,/g, '')) || 0,
      month: budgetMonth,
    });

    setBudgetCategory("");
    setBudgetAmount("");
    setCustomCategory("");
    setUseCustomCategory(false);
  };

  const handleAddExpense = () => {
    const category = expenseUseCustom ? expenseCustomCategory : expenseCategory;
    if (!category || !expenseAmount || !expenseDescription) return;

    onAddExpense({
      date: expenseDate,
      category,
      amount: parseFloat(expenseAmount.replace(/,/g, '')) || 0,
      description: expenseDescription,
    });

    setExpenseCategory("");
    setExpenseAmount("");
    setExpenseDescription("");
    setExpenseCustomCategory("");
    setExpenseUseCustom(false);
  };

  const allCategories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...budgets.map(b => b.category),
      ...expenses.map(e => e.category),
    ])
  );

  const categorySpending = budgets
    .filter(b => isSameMonth(b.month, new Date()))
    .map(budget => {
      const spent = expenses
        .filter(e => 
          e.category === budget.category && 
          isSameMonth(e.date, new Date())
        )
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        ...budget,
        spent,
        remaining: budget.amount - spent,
        percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
      };
    });

  const recentExpenses = [...expenses]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 20);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white text-black border-white/20">
        <DialogHeader>
          <DialogTitle>{t('budgetManager.title')}</DialogTitle>
          <DialogDescription>
            {t('budget.setBudget')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">{t('budget.monthlyProgress')}</TabsTrigger>
            <TabsTrigger value="budgets">{t('budgetManager.budgets')}</TabsTrigger>
            <TabsTrigger value="expenses">{t('budgetManager.expenses')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div>
              <h3 className="mb-3 font-semibold">{t('budget.monthlyProgress')}</h3>
              {categorySpending.length === 0 ? (
                <Card className="p-8 text-center text-gray-500 border-gray-200">
                  <p>{t('budgetManager.noBudgets')}</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {categorySpending.map((item) => (
                    <Card key={item.id} className="p-4 border-gray-200">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.category}</span>
                          <Badge 
                            className={
                              item.percentage > 100 ? "bg-red-100 text-red-600" : 
                              item.percentage > 80 ? "bg-orange-100 text-orange-600" : 
                              "bg-green-100 text-green-600"
                            }
                          >
                            {item.percentage.toFixed(0)}%
                          </Badge>
                        </div>
                        
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              item.percentage > 100 ? 'bg-red-600' : 
                              item.percentage > 80 ? 'bg-orange-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {t('budget.spent')}: ₩{formatCurrency(item.spent)}
                          </span>
                          <span className={item.remaining >= 0 ? "text-green-600" : "text-red-600"}>
                            ₩{formatCurrency(Math.abs(item.remaining))}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h3 className="mb-3 font-semibold">{t('budgetManager.expenses')}</h3>
              {recentExpenses.length === 0 ? (
                <Card className="p-8 text-center text-gray-500 border-gray-200">
                  <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-300" />
                  <p>{t('budgetManager.noExpenses')}</p>
                </Card>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentExpenses.map((expense) => (
                    <Card key={expense.id} className="p-3 border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{expense.description}</span>
                            <Badge variant="outline" className="text-xs border-gray-200">
                              {expense.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>{format(expense.date, "yyyy-MM-dd")}</span>
                            <span className="text-red-600 font-medium">₩{formatCurrency(expense.amount)}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteExpense(expense.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="budgets" className="space-y-4">
            <Card className="p-4 border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-black" />
                <h3 className="font-semibold">{t('budgetManager.addBudget')}</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>{t('budgetManager.month')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left bg-white border-gray-300">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(budgetMonth, "yyyy-MM")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border-gray-200">
                      <Calendar
                        mode="single"
                        selected={budgetMonth}
                        onSelect={(date) => date && setBudgetMonth(startOfMonth(date))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="use-custom-budget"
                      checked={useCustomCategory}
                      onChange={(e) => setUseCustomCategory(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <Label htmlFor="use-custom-budget" className="cursor-pointer">
                      Custom Category
                    </Label>
                  </div>

                  {useCustomCategory ? (
                    <Input
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Category name"
                      className="bg-white border-gray-300"
                    />
                  ) : (
                    <>
                      <Label>{t('budgetManager.category')}</Label>
                      <Select value={budgetCategory} onValueChange={setBudgetCategory}>
                        <SelectTrigger className="bg-white border-gray-300">
                          <SelectValue placeholder={t('budgetManager.category')} />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          {allCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>

                <div>
                  <Label>{t('budgetManager.amount')} (₩)</Label>
                  <Input
                    type="text"
                    value={formatNumber(budgetAmount)}
                    onChange={(e) => handleAmountChange(e.target.value, setBudgetAmount)}
                    placeholder="0"
                    className="bg-white border-gray-300"
                  />
                </div>

                <Button onClick={handleAddBudget} className="w-full bg-black text-white hover:bg-gray-800">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('modal.add')}
                </Button>
              </div>
            </Card>

            <div>
              <h3 className="mb-3 font-semibold">{t('budgetManager.budgets')}</h3>
              {budgets.length === 0 ? (
                <Card className="p-8 text-center text-gray-500 border-gray-200">
                  <p>{t('budgetManager.noBudgets')}</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {budgets
                    .sort((a, b) => b.month.getTime() - a.month.getTime())
                    .map((budget) => (
                      <Card key={budget.id} className="p-3 border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{budget.category}</span>
                              <Badge variant="outline" className="text-xs border-gray-200">
                                {format(budget.month, "yyyy-MM")}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              ₩{formatCurrency(budget.amount)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteBudget(budget.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <Card className="p-4 border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-black" />
                <h3 className="font-semibold">{t('budgetManager.addExpense')}</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>{t('schedule.date')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left bg-white border-gray-300">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(expenseDate, "yyyy-MM-dd")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border-gray-200">
                      <Calendar
                        mode="single"
                        selected={expenseDate}
                        onSelect={(date) => date && setExpenseDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="use-custom-expense"
                      checked={expenseUseCustom}
                      onChange={(e) => setExpenseUseCustom(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <Label htmlFor="use-custom-expense" className="cursor-pointer">
                      Custom Category
                    </Label>
                  </div>

                  {expenseUseCustom ? (
                    <Input
                      value={expenseCustomCategory}
                      onChange={(e) => setExpenseCustomCategory(e.target.value)}
                      placeholder="Category name"
                      className="bg-white border-gray-300"
                    />
                  ) : (
                    <>
                      <Label>{t('budgetManager.category')}</Label>
                      <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                        <SelectTrigger className="bg-white border-gray-300">
                          <SelectValue placeholder={t('budgetManager.category')} />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          {allCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>

                <div>
                  <Label>{t('budgetManager.amount')} (₩)</Label>
                  <Input
                    type="text"
                    value={formatNumber(expenseAmount)}
                    onChange={(e) => handleAmountChange(e.target.value, setExpenseAmount)}
                    placeholder="0"
                    className="bg-white border-gray-300"
                  />
                </div>

                <div>
                  <Label>{t('budgetManager.description')}</Label>
                  <Input
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    placeholder={t('budgetManager.description')}
                    className="bg-white border-gray-300"
                  />
                </div>

                <Button onClick={handleAddExpense} className="w-full bg-black text-white hover:bg-gray-800">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('modal.add')}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
