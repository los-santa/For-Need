import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CalendarIcon, Plus, Repeat, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { useLanguage } from "../contexts/LanguageContext";

export interface RecurringExpense {
  id: string;
  title: string;
  amount: number;
  startDate: Date;
  endDate?: Date;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  isIncome?: boolean;
}

interface RecurringExpenseFormProps {
  onAddExpense: (expense: Omit<RecurringExpense, 'id'>) => void;
}

export function RecurringExpenseForm({ onAddExpense }: RecurringExpenseFormProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [isIncome, setIsIncome] = useState(false);

  const formatNumber = (value: string) => {
    const number = value.replace(/,/g, '');
    if (!number || isNaN(Number(number))) return '';
    return Number(number).toLocaleString('ko-KR');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (value === '' || /^\d+$/.test(value)) {
      setAmount(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !startDate) return;

    onAddExpense({
      title,
      amount: parseFloat(amount.replace(/,/g, '')) || 0,
      startDate,
      endDate: hasEndDate ? endDate : undefined,
      frequency,
      isIncome,
    });

    setTitle("");
    setAmount("");
    setStartDate(undefined);
    setEndDate(undefined);
    setFrequency("monthly");
    setHasEndDate(false);
    setIsIncome(false);
  };

  return (
    <Card className="p-6 bg-[#2A2A2A] border-white/20 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-white" />
          <h2 className="text-white text-lg font-semibold">{t('recurring.title')}</h2>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={!isIncome ? "default" : "outline"}
            size="sm"
            onClick={() => setIsIncome(false)}
            className={!isIncome ? "bg-red-600 hover:bg-red-700 text-white border-none" : "bg-transparent border-white/30 text-white/70 hover:text-white hover:border-white"}
          >
            <TrendingDown className="w-4 h-4 mr-1" />
            {t('schedule.expense')}
          </Button>
          <Button
            type="button"
            variant={isIncome ? "default" : "outline"}
            size="sm"
            onClick={() => setIsIncome(true)}
            className={isIncome ? "bg-green-600 hover:bg-green-700 text-white border-none" : "bg-transparent border-white/30 text-white/70 hover:text-white hover:border-white"}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            {t('schedule.income')}
          </Button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="recurring-title" className="text-white/60 text-xs uppercase tracking-wider mb-1 block">{t('recurring.name')}</Label>
          <Input
            id="recurring-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('recurring.name')}
            className="bg-[#1A1A1A] border-white/10 text-white placeholder:text-white/20 focus:border-white/40 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="recurring-amount" className="text-white/60 text-xs uppercase tracking-wider mb-1 block">{t('recurring.amount')} (₩)</Label>
            <Input
              id="recurring-amount"
              type="text"
              value={formatNumber(amount)}
              onChange={handleAmountChange}
              placeholder="0"
              className="bg-[#1A1A1A] border-white/10 text-white placeholder:text-white/20 focus:border-white/40 transition-colors"
            />
          </div>
          <div>
            <Label className="text-white/60 text-xs uppercase tracking-wider mb-1 block">{t('recurring.frequency')}</Label>
            <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
              <SelectTrigger className="bg-[#1A1A1A] border-white/10 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#2A2A2A] border-white/20">
                <SelectItem value="daily">{t('recurring.daily')}</SelectItem>
                <SelectItem value="weekly">{t('recurring.weekly')}</SelectItem>
                <SelectItem value="monthly">{t('recurring.monthly')}</SelectItem>
                <SelectItem value="yearly">{t('recurring.yearly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-white/60 text-xs uppercase tracking-wider mb-1 block">{t('recurring.startDate')}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left bg-[#1A1A1A] border-white/10 text-white/80 hover:bg-[#333] hover:text-white transition-colors"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "yyyy-MM-dd") : t('recurring.startDate')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#2A2A2A] border-white/20" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center justify-between bg-[#1A1A1A] p-3 rounded-lg border border-white/10">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="has-end-date"
              checked={hasEndDate}
              onChange={(e) => setHasEndDate(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-transparent text-white accent-white"
            />
            <Label htmlFor="has-end-date" className="cursor-pointer text-white text-sm">
              Set End Date
            </Label>
          </div>
          
          {hasEndDate && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 text-xs text-white/60 hover:text-white p-0"
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {endDate ? format(endDate, "yyyy-MM-dd") : "Select"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#2A2A2A] border-white/20" align="end">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  disabled={(date) => startDate ? date < startDate : false}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200 transition-colors font-semibold mt-2">
          {t('recurring.add')}
        </Button>
      </form>
    </Card>
  );
}
