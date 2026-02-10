import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { TrendingUp, Menu } from "lucide-react";
import { useLanguage } from "../schedule-budget-contexts/LanguageContext";

interface TotalAssetsDisplayProps {
  totalAssets: number;
  onOpenAssetModal: () => void;
}

export function TotalAssetsDisplay({ totalAssets, onOpenAssetModal }: TotalAssetsDisplayProps) {
  const { t } = useLanguage();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  return (
    <Card className="p-6 bg-[#4A4A4A] border-white/40 shadow-[0_8px_24px_rgba(255,255,255,0.2)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#6A6A6A] rounded-full border-2 border-white/50">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-white">{t('assets.title')}</h2>
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-4xl text-white">₩{formatCurrency(totalAssets)}</p>
          <p className="text-sm text-white/50 mt-2">{t('assets.calculation')}</p>
        </div>
        <Button 
          onClick={onOpenAssetModal} 
          variant="outline" 
          size="icon"
          className="h-10 w-10 bg-[#6A6A6A] border-white/50 text-white hover:bg-white hover:text-black"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>
    </Card>
  );
}