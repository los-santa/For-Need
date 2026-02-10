import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Calendar, Wallet, Trash2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Schedule } from "./ScheduleForm";
import { useLanguage } from "../contexts/LanguageContext";

interface ScheduleListProps {
  schedules: Schedule[];
  currentWealth: number;
  onDeleteSchedule: (id: string) => void;
  onExecuteSale?: (scheduleId: string) => void;
}

export function ScheduleList({ schedules, currentWealth, onDeleteSchedule, onExecuteSale }: ScheduleListProps) {
  const { t } = useLanguage();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatTime = (time24: string) => {
    const [hourStr, minuteStr] = time24.split(':');
    let hour = parseInt(hourStr);
    const isPM = hour >= 12;
    
    if (hour > 12) {
      hour -= 12;
    } else if (hour === 0) {
      hour = 12;
    }
    
    return `${isPM ? 'PM' : 'AM'} ${hour}:${minuteStr}`;
  };

  // Sort by date (considering time as well)
  const sortedSchedules = [...schedules].sort((a, b) => {
    const dateCompare = a.date.getTime() - b.date.getTime();
    if (dateCompare !== 0) return dateCompare;
    
    // If dates are the same, compare by time
    if (a.time && b.time) {
      return a.time.localeCompare(b.time);
    }
    if (a.time) return -1; // With time comes first
    if (b.time) return 1;
    return 0;
  });

  const totalRequired = schedules.reduce((sum, schedule) => {
    return schedule.isIncome ? sum - schedule.requiredAmount : sum + schedule.requiredAmount;
  }, 0);
  const isAffordable = currentWealth >= totalRequired;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white">{t('schedule.list')}</h2>
        <Badge variant={isAffordable ? "default" : "destructive"} className={isAffordable ? "bg-white text-black" : ""}>
          Total Required: ₩{formatCurrency(totalRequired)}
        </Badge>
      </div>

      {schedules.length === 0 ? (
        <Card className="p-12 text-center bg-[#4A4A4A] border-white/40 shadow-[0_8px_24px_rgba(255,255,255,0.2)]">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50 text-white" />
          <p className="text-white/60">{t('schedule.noSchedules')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedSchedules.map((schedule) => {
            const canAfford = currentWealth >= schedule.requiredAmount;
            
            return (
              <Card 
                key={schedule.id} 
                className="p-4 bg-[#4A4A4A] border-white/40 shadow-[0_8px_24px_rgba(255,255,255,0.2)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-white">{schedule.title}</h3>
                      {schedule.isSaleSchedule && (
                        <Badge variant="outline" className="text-xs bg-[#6A6A6A] text-white border-white/50">
                          Sale Schedule
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-3 text-sm text-white/60">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(schedule.date, "yyyy-MM-dd")}
                          {schedule.time && ` ${formatTime(schedule.time)}`}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {schedule.isIncome ? (
                          <>
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-green-500">
                              +₩{formatCurrency(schedule.requiredAmount)}
                            </span>
                          </>
                        ) : (
                          <>
                            <Wallet className="w-4 h-4" />
                            <span className={canAfford ? "text-green-500" : "text-red-600"}>
                              ₩{formatCurrency(schedule.requiredAmount)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {!canAfford && !schedule.isIncome && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs text-red-600 border-red-600">
                          Short ₩{formatCurrency(schedule.requiredAmount - currentWealth)}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1">
                    {schedule.isSaleSchedule && onExecuteSale && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onExecuteSale(schedule.id)}
                        className="text-white/60 hover:text-blue-500 hover:bg-white/10"
                        title="Execute Sale"
                      >
                        <DollarSign className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteSchedule(schedule.id)}
                      className="text-white/60 hover:text-red-600 hover:bg-white/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {schedules.length > 0 && (
        <Card className="p-4 bg-[#4A4A4A] border-white/40 shadow-[0_8px_24px_rgba(255,255,255,0.2)]">
          <div className="flex justify-between items-center">
            <span className="text-white">Can afford all schedules with current wealth:</span>
            <Badge variant={isAffordable ? "default" : "destructive"} className={isAffordable ? "bg-white text-black" : ""}>
              {isAffordable ? "Yes" : "No"}
            </Badge>
          </div>
          {!isAffordable && (
            <p className="mt-2 text-sm text-red-600">
              Need ₩{formatCurrency(totalRequired - currentWealth)} more.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}