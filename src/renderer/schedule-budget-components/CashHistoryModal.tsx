import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useLanguage } from "../schedule-budget-contexts/LanguageContext";

export interface CashTransaction {
  id: string;
  date: Date;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  balance: number; // 거래 후 잔액
}

interface CashHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: CashTransaction[];
}

export function CashHistoryModal({
  open,
  onOpenChange,
  transactions,
}: CashHistoryModalProps) {
  const { t } = useLanguage();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatDateTime = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // 최신순으로 정렬
  const sortedTransactions = [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#2A2A2A] border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{t('cashHistory.title')}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {sortedTransactions.length === 0 ? (
              <Card className="p-6 bg-[#3A3A3A] border-white/20 text-center">
                <p className="text-white/60">{t('cashHistory.noTransactions')}</p>
              </Card>
            ) : (
              sortedTransactions.map((transaction) => (
                <Card
                  key={transaction.id}
                  className="p-4 bg-[#3A3A3A] border-white/20 hover:bg-[#4A4A4A] transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-full ${
                        transaction.type === 'income' 
                          ? 'bg-green-500/20' 
                          : 'bg-red-500/20'
                      }`}>
                        {transaction.type === 'income' ? (
                          <ArrowUpCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <ArrowDownCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-white font-medium">{transaction.description}</p>
                        <p className="text-white/50 text-sm">{formatDateTime(transaction.date)}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-lg font-medium ${
                        transaction.type === 'income' 
                          ? 'text-green-400' 
                          : 'text-red-400'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}₩{formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-white/50 text-sm">
                        {t('cashHistory.balance')}: ₩{formatCurrency(transaction.balance)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
