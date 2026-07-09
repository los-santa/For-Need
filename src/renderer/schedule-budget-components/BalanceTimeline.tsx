import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { CalendarIcon } from "lucide-react";
import { Schedule } from "./ScheduleForm";
import { RecurringExpense } from "./RecurringExpenseForm";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format, isBefore, isSameDay, startOfDay, addDays, addMonths, addYears, addWeeks } from "date-fns";
import { useState, useMemo } from "react";

interface BalanceTimelineProps {
  currentWealth: number;
  schedules: Schedule[];
  recurringExpenses: RecurringExpense[];
}

interface BalancePoint {
  date: Date;
  balance: number;
  scheduleName?: string;
  amount?: number;
}

type Interval = "day" | "week" | "month" | "year";
const recurringFrequencies = new Set(["daily", "weekly", "monthly", "yearly"]);

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function getRecurringExpensesAsSchedules(
  recurringExpenses: RecurringExpense[],
  endDate: Date,
  today: Date = new Date(),
): Schedule[] {
  const result: Schedule[] = [];
  const todayStart = startOfDay(today);

  recurringExpenses.forEach((expense) => {
    if (
      !isValidDate(expense.startDate) ||
      (expense.endDate && !isValidDate(expense.endDate)) ||
      !recurringFrequencies.has(expense.frequency)
    ) {
      return;
    }

    let currentDate = startOfDay(expense.startDate);
    const finalDate = expense.endDate ? startOfDay(expense.endDate) : endDate;

    while (currentDate <= finalDate && currentDate <= endDate) {
      if (currentDate >= todayStart) {
        result.push({
          id: `recurring-${expense.id}-${currentDate.getTime()}`,
          title: expense.title,
          date: currentDate,
          requiredAmount: expense.amount,
          isIncome: expense.isIncome,
        });
      }

      switch (expense.frequency) {
        case "daily":
          currentDate = addDays(currentDate, 1);
          break;
        case "weekly":
          currentDate = addDays(currentDate, 7);
          break;
        case "monthly":
          currentDate = addMonths(currentDate, 1);
          break;
        case "yearly":
          currentDate = addYears(currentDate, 1);
          break;
        default:
          return;
      }
    }
  });

  return result;
}

export function BalanceTimeline({ currentWealth, schedules, recurringExpenses }: BalanceTimelineProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [interval, setInterval] = useState<Interval>("day");
  const [pointCount, setPointCount] = useState<number>(10);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const normalizedPointCount = Math.min(
    1000,
    Math.max(1, Number.isFinite(pointCount) ? Math.floor(pointCount) : 1),
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // Calculate end date by interval and point count
  const getEndDate = (intervalType: Interval, count: number): Date => {
    const today = new Date();
    switch (intervalType) {
      case "day":
        return addDays(today, count);
      case "week":
        return addWeeks(today, count);
      case "month":
        return addMonths(today, count);
      case "year":
        return addYears(today, count);
      default:
        return addMonths(today, count);
    }
  };

  // Calculate balance changes
  const balancePoints = useMemo(() => {
    const endDate = getEndDate(interval, normalizedPointCount);
    const allSchedules = [
      ...schedules.filter((schedule) => isValidDate(schedule.date)),
      ...getRecurringExpensesAsSchedules(recurringExpenses, endDate),
    ];

    if (allSchedules.length === 0) return [];

    // Sort schedules by date
    const sortedSchedules = allSchedules.sort((a, b) => 
      a.date.getTime() - b.date.getTime()
    );

    const points: BalancePoint[] = [];
    let currentBalance = currentWealth;

    // Starting point today
    const today = startOfDay(new Date());
    points.push({
      date: today,
      balance: currentBalance,
    });

    // Group by date
    const schedulesByDate = new Map<string, Schedule[]>();
    sortedSchedules.forEach((schedule) => {
      const dateKey = format(schedule.date, "yyyy-MM-dd");
      if (!schedulesByDate.has(dateKey)) {
        schedulesByDate.set(dateKey, []);
      }
      schedulesByDate.get(dateKey)!.push(schedule);
    });

    // Add point for each date
    Array.from(schedulesByDate.keys())
      .sort()
      .forEach((dateKey) => {
        const schedulesOnDate = schedulesByDate.get(dateKey)!;
        const totalAmount = schedulesOnDate.reduce((sum, s) => {
          return s.isIncome ? sum - s.requiredAmount : sum + s.requiredAmount;
        }, 0);
        currentBalance -= totalAmount;
        
        // Expenses on that date are reflected at 00:00 the next day
        points.push({
          date: addDays(startOfDay(new Date(dateKey)), 1),
          balance: currentBalance,
          scheduleName: schedulesOnDate.length > 1 
            ? `${schedulesOnDate.length} items` 
            : schedulesOnDate[0].title,
          amount: totalAmount,
        });
      });

    return points;
  }, [currentWealth, schedules, recurringExpenses, interval, normalizedPointCount]);

  // Chart data - sampling based on interval
  const chartData = useMemo(() => {
    if (balancePoints.length === 0) return [];

    // Determine date format
    let dateFormat = "M/d";
    if (interval === "month" || interval === "year") {
      dateFormat = "yy.MM";
    } else if (interval === "week") {
      dateFormat = "M/d";
    }

    // Generate points according to interval (set center as today)
    const baseDate = startOfDay(startDate);
    const sampledPoints: any[] = [];
    
    // From past to future (past pointCount + today + future pointCount)
    for (let i = -normalizedPointCount; i <= normalizedPointCount; i++) {
      let targetDate: Date;
      
      switch (interval) {
        case "day":
          targetDate = addDays(baseDate, i);
          break;
        case "week":
          targetDate = addWeeks(baseDate, i);
          break;
        case "month":
          targetDate = addMonths(baseDate, i);
          break;
        case "year":
          targetDate = addYears(baseDate, i);
          break;
        default:
          targetDate = addDays(baseDate, i);
      }

      // Find balance up to that date
      let balance = currentWealth;
      for (const point of balancePoints) {
        if (point.date <= targetDate) {
          balance = point.balance;
        } else {
          break;
        }
      }

      sampledPoints.push({
        name: format(targetDate, dateFormat),
        fullDate: format(targetDate, "yyyy-MM-dd (EEE) 00:00"),
        Balance: balance,
        pointIndex: i,
        isToday: i === 0,
      });
    }

    return sampledPoints;
  }, [balancePoints, interval, normalizedPointCount, currentWealth, startDate]);

  // Calculate Y-axis range
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 'auto'];
    
    const balances = chartData.map(d => d.Balance);
    const minBalance = Math.min(...balances);
    const maxBalance = Math.max(...balances);
    const range = maxBalance - minBalance;
    
    // More padding if range is too small
    const padding = range === 0 ? Math.abs(minBalance) * 0.1 || 10000 : range * 0.1;
    
    return [
      Math.floor((minBalance - padding) / 10000) * 10000,
      Math.ceil((maxBalance + padding) / 10000) * 10000
    ];
  }, [chartData]);

  // Calculate balance at selected date
  const getBalanceAtDate = (date: Date) => {
    if (!date) return null;

    const targetDate = startOfDay(date);
    const endDate = getEndDate(interval, normalizedPointCount);
    const allSchedules = [
      ...schedules.filter((schedule) => isValidDate(schedule.date)),
      ...getRecurringExpensesAsSchedules(recurringExpenses, endDate),
    ];
    
    // Balance at 00:00 on that date (before expenses on that day)
    let balanceStart = currentWealth;
    allSchedules.forEach((schedule) => {
      if (isBefore(schedule.date, targetDate)) {
        balanceStart = schedule.isIncome 
          ? balanceStart + schedule.requiredAmount 
          : balanceStart - schedule.requiredAmount;
      }
    });

    // Balance at 24:00 on that date (after expenses on that day)
    let balanceEnd = balanceStart;
    const schedulesOnDate = allSchedules.filter(s => isSameDay(s.date, targetDate));
    schedulesOnDate.forEach((schedule) => {
      balanceEnd = schedule.isIncome 
        ? balanceEnd + schedule.requiredAmount 
        : balanceEnd - schedule.requiredAmount;
    });

    return { balanceStart, balanceEnd, schedulesOnDate };
  };

  const selectedDateInfo = selectedDate ? getBalanceAtDate(selectedDate) : null;

  return (
    <Card className="p-6 bg-[#4A4A4A] border-white/40 shadow-[0_8px_24px_rgba(255,255,255,0.2)]">
      <div className="mb-6">
        <h2 className="mb-2 text-white">Balance Forecast</h2>
        <p className="text-sm text-white/60">Check balance changes over time</p>
      </div>

      {schedules.length === 0 && recurringExpenses.length === 0 ? (
        <div className="text-center py-12 text-white/60">
          <p>Add schedules or fixed expenses to see balance changes.</p>
        </div>
      ) : (
        <>
          {/* Period settings */}
          <div className="flex flex-wrap gap-3 mb-6 items-center">
            <Label className="text-sm text-white/60">Base Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left bg-[#2A2A2A] border-white/30 text-white hover:bg-white hover:text-black">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, "yy.MM.dd")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#4A4A4A] border-white/40" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Input
              type="number"
              min="1"
              max="1000"
              value={pointCount}
              onChange={(e) => setPointCount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-24 bg-[#2A2A2A] border-white/30 text-white"
            />
            <Tabs value={interval} onValueChange={(value) => setInterval(value as Interval)} className="flex-1">
              <TabsList className="grid w-full grid-cols-4 bg-[#2A2A2A]">
                <TabsTrigger value="day" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">Day</TabsTrigger>
                <TabsTrigger value="week" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">Week</TabsTrigger>
                <TabsTrigger value="month" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">Month</TabsTrigger>
                <TabsTrigger value="year" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">Year</TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="text-sm text-white/60">
              {interval === "day" ? "days before/after" : interval === "week" ? "weeks before/after" : interval === "month" ? "months before/after" : "years before/after"}
            </span>
          </div>

          {/* Chart */}
          <div className="mb-6 h-64 p-4 bg-[#2A2A2A] rounded-lg">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.6)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.6)"
                  style={{ fontSize: '12px' }}
                  domain={yAxisDomain}
                  tickFormatter={(value) => {
                    if (Math.abs(value) >= 100000000) {
                      return `${(value / 100000000).toFixed(1)}B`;
                    }
                    return `${(value / 10000).toFixed(0)}K`;
                  }}
                />
                <Tooltip 
                  formatter={(value: number) => [`₩${formatCurrency(value)}`, 'Balance']}
                  labelFormatter={(label, payload) => {
                    if (payload && payload.length > 0) {
                      return payload[0].payload.fullDate;
                    }
                    return label;
                  }}
                  contentStyle={{ 
                    backgroundColor: '#4A4A4A', 
                    border: '2px solid white',
                    borderRadius: '6px',
                    color: 'white'
                  }}
                />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine 
                  x={chartData.find(d => d.isToday)?.name} 
                  stroke="#10b981" 
                  strokeWidth={2}
                  label={{ value: 'Today', position: 'top', fill: '#10b981', fontSize: 12 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Balance" 
                  stroke="#FFFFFF" 
                  strokeWidth={3}
                  dot={{ fill: '#FFFFFF', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Current wealth display */}
          <div className="mb-6">
            <div className="p-4 bg-[#2A2A2A] rounded-lg border border-white/30">
              <p className="text-sm text-white/60 mb-1">Current Wealth</p>
              <p className="text-xl text-white">₩{formatCurrency(currentWealth)}</p>
            </div>
          </div>

          {/* Date selection */}
          <div className="border-t border-white/30 pt-6">
            <h3 className="mb-4 text-white">Check Balance on Specific Date</h3>
            
            <div className="mb-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left bg-[#2A2A2A] border-white/30 text-white hover:bg-white hover:text-black"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#4A4A4A] border-white/40" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {selectedDateInfo && (
              <Card className="p-4 bg-[#2A2A2A] border-white/30">
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">
                      {format(selectedDate!, "yyyy-MM-dd")}
                    </span>
                  </div>
                  
                  {/* 00:00 starting point */}
                  <div className="p-3 bg-[#4A4A4A] rounded-lg border border-white/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/60">00:00 (Start)</span>
                      <Badge variant={selectedDateInfo.balanceStart >= 0 ? "default" : "destructive"} className={selectedDateInfo.balanceStart >= 0 ? "bg-white text-black" : ""}>
                        {selectedDateInfo.balanceStart >= 0 ? "Sufficient" : "Short"}
                      </Badge>
                    </div>
                    <p className={`text-2xl ${selectedDateInfo.balanceStart >= 0 ? 'text-white' : 'text-red-600'}`}>
                      ₩{formatCurrency(selectedDateInfo.balanceStart)}
                    </p>
                  </div>
                </div>

                {selectedDateInfo.schedulesOnDate.length > 0 && (
                  <div className="mb-3 pt-4 border-t border-white/30">
                    <p className="text-sm text-white/60 mb-2">Schedules on this day:</p>
                    <div className="space-y-2">
                      {selectedDateInfo.schedulesOnDate.map((schedule) => (
                        <div key={schedule.id} className="flex justify-between items-center text-sm">
                          <span className="text-white">{schedule.title}</span>
                          <span className={schedule.isIncome ? "text-green-500" : "text-red-500"}>
                            {schedule.isIncome ? '+' : '-'}₩{formatCurrency(schedule.requiredAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 24:00 ending point */}
                <div className="mb-3 p-3 bg-[#4A4A4A] rounded-lg border border-white/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white/60">24:00 (End)</span>
                    <Badge variant={selectedDateInfo.balanceEnd >= 0 ? "default" : "destructive"} className={selectedDateInfo.balanceEnd >= 0 ? "bg-white text-black" : ""}>
                      {selectedDateInfo.balanceEnd >= 0 ? "Sufficient" : "Short"}
                    </Badge>
                  </div>
                  <p className={`text-2xl ${selectedDateInfo.balanceEnd >= 0 ? 'text-white' : 'text-red-600'}`}>
                    ₩{formatCurrency(selectedDateInfo.balanceEnd)}
                  </p>
                </div>

                {selectedDateInfo.balanceEnd < 0 && (
                  <div className="p-3 bg-red-900/30 rounded-lg border border-red-600">
                    <p className="text-sm text-red-500">
                      ⚠️ Balance is short at the end of this day. Need ₩{formatCurrency(Math.abs(selectedDateInfo.balanceEnd))} more.
                    </p>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Timeline */}
          <div className="mt-6 border-t border-white/30 pt-6">
            <h3 className="mb-4 text-white">Balance Change Timeline</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {balancePoints.slice(0, 50).map((point, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-24 text-sm text-white/60 pt-1">
                    {format(point.date, "M/d (E)")}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`w-3 h-3 rounded-full border-2 ${point.balance >= 0 ? 'bg-white border-white' : 'bg-red-500 border-red-500'}`} />
                      <span className={`${point.balance >= 0 ? 'text-white' : 'text-red-600'}`}>
                        ₩{formatCurrency(point.balance)}
                      </span>
                    </div>
                    {point.scheduleName && (
                      <p className="text-sm text-white/60 ml-6">
                        {point.scheduleName} (-₩{formatCurrency(point.amount!)})
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {balancePoints.length > 50 && (
                <p className="text-sm text-white/50 text-center pt-2">
                  ... and {balancePoints.length - 50} more items
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}