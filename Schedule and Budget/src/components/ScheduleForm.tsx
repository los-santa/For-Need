import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { Switch } from "./ui/switch";
import { useState } from "react";
import { format } from "date-fns";
import { useLanguage } from "../contexts/LanguageContext";

export interface Schedule {
  id: string;
  title: string;
  date: Date;
  requiredAmount: number;
  isIncome?: boolean;
  time?: string;
  isSaleSchedule?: boolean;
  itemId?: string;
}

interface ScheduleFormProps {
  onAddSchedule: (schedule: Omit<Schedule, 'id'>) => void;
}

export function ScheduleForm({ onAddSchedule }: ScheduleFormProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>();
  const [requiredAmount, setRequiredAmount] = useState("");
  const [isIncome, setIsIncome] = useState(false);
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [isPM, setIsPM] = useState(false);

  const formatNumber = (value: string) => {
    const number = value.replace(/,/g, '');
    if (!number || isNaN(Number(number))) return '';
    return Number(number).toLocaleString('ko-KR');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (value === '' || /^\d+$/.test(value)) {
      setRequiredAmount(value);
    }
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 1 && parseInt(value) <= 12)) {
      setHour(value);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0 && parseInt(value) <= 59)) {
      setMinute(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !requiredAmount) return;

    let time24: string | undefined = undefined;
    if (hour && minute) {
      let hour24 = parseInt(hour);
      if (isPM && hour24 !== 12) hour24 += 12;
      else if (!isPM && hour24 === 12) hour24 = 0;
      time24 = `${hour24.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }

    onAddSchedule({
      title,
      date,
      requiredAmount: parseFloat(requiredAmount.replace(/,/g, '')) || 0,
      isIncome,
      time: time24,
    });

    setTitle("");
    setDate(undefined);
    setRequiredAmount("");
    setIsIncome(false);
    setHour("");
    setMinute("");
    setIsPM(false);
  };

  return (
    <Card className="p-6 bg-[#2A2A2A] border-white/20 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-white" />
          <h2 className="text-white text-lg font-semibold">{t('schedule.title')}</h2>
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
          <Label htmlFor="title" className="text-white/60 text-xs uppercase tracking-wider mb-1 block">{t('schedule.name')}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('schedule.name')}
            className="bg-[#1A1A1A] border-white/10 text-white placeholder:text-white/20 focus:border-white/40 transition-colors"
          />
        </div>

        <div>
          <Label className="text-white/60 text-xs uppercase tracking-wider mb-1 block">{t('schedule.date')}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left bg-[#1A1A1A] border-white/10 text-white/80 hover:bg-[#333] hover:text-white transition-colors"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "yyyy-MM-dd") : t('schedule.date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#2A2A2A] border-white/20" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount" className="text-white/60 text-xs uppercase tracking-wider mb-1 block">{t('schedule.amount')} (₩)</Label>
            <Input
              id="amount"
              type="text"
              value={formatNumber(requiredAmount)}
              onChange={handleAmountChange}
              placeholder="0"
              className="bg-[#1A1A1A] border-white/10 text-white placeholder:text-white/20 focus:border-white/40 transition-colors"
            />
          </div>
          <div>
             <Label className="text-white/60 text-xs uppercase tracking-wider mb-1 block">Time</Label>
             <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={hour}
                  onChange={handleHourChange}
                  placeholder="12"
                  className="bg-[#1A1A1A] border-white/10 text-white text-center px-1"
                  maxLength={2}
                />
                <span className="text-white/40">:</span>
                <Input
                  type="text"
                  value={minute}
                  onChange={handleMinuteChange}
                  placeholder="00"
                  className="bg-[#1A1A1A] border-white/10 text-white text-center px-1"
                  maxLength={2}
                />
                <div className="flex items-center gap-1 ml-1 bg-[#1A1A1A] rounded p-1 border border-white/10">
                   <button 
                     type="button"
                     onClick={() => setIsPM(false)}
                     className={`text-[10px] px-1.5 py-0.5 rounded ${!isPM ? 'bg-white text-black' : 'text-white/40'}`}
                   >AM</button>
                   <button 
                     type="button"
                     onClick={() => setIsPM(true)}
                     className={`text-[10px] px-1.5 py-0.5 rounded ${isPM ? 'bg-white text-black' : 'text-white/40'}`}
                   >PM</button>
                </div>
             </div>
          </div>
        </div>

        <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200 transition-colors font-semibold mt-2">
          {t('schedule.add')}
        </Button>
      </form>
    </Card>
  );
}
