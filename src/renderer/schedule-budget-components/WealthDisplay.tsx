import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Wallet, Clock, History } from "lucide-react";
import { useLanguage } from "../schedule-budget-contexts/LanguageContext";

interface WealthDisplayProps {
  wealth: number;
  onOpenHistoryModal: () => void;
}

export function WealthDisplay({ wealth, onOpenHistoryModal }: WealthDisplayProps) {
  const { t, language } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const weekdays = language === 'ko' 
      ? ['일', '월', '화', '수', '목', '금', '토']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = weekdays[date.getDay()];
    return `${year}-${month}-${day} (${weekday})`;
  };

  return (
    <Card className="p-6 bg-[#4A4A4A] border-white/40 shadow-[0_8px_24px_rgba(255,255,255,0.2)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#6A6A6A] rounded-full border-2 border-white/50">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-white">{t('wealth.title')}</h2>
        </div>
        
        <div className="flex items-center gap-2 text-white/60">
          <Clock className="w-4 h-4" />
          <div className="text-right">
            <p className="text-xs">{formatDate(currentTime)}</p>
            <p className="text-lg tabular-nums">{formatTime(currentTime)}</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-4xl text-white">₩{formatCurrency(wealth)}</p>
          <p className="text-sm text-white/50 mt-2">{t('modal.calculation')}</p>
        </div>
        <Button 
          onClick={onOpenHistoryModal} 
          variant="outline" 
          size="icon"
          className="h-10 w-10 bg-[#6A6A6A] border-white/50 text-white hover:bg-white hover:text-black"
        >
          <History className="w-5 h-5" />
        </Button>
      </div>
    </Card>
  );
}