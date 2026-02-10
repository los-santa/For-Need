import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Plus, Trash2, TrendingUp, TrendingDown, HandCoins, DollarSign, Package, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { useLanguage } from "../schedule-budget-contexts/LanguageContext";

export interface Item {
  id: string;
  name: string;
  amount: number;
}

export interface Debt {
  id: string;
  name: string;
  target: string;
  amount: number;
}

export interface Loan {
  id: string;
  name: string;
  amount: number;
}

interface WealthAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashAmount: number;
  items: Item[];
  debts: Debt[];
  loans: Loan[];
  onUpdateCash: (amount: number) => void;
  onAddItem: (item: Omit<Item, 'id'>) => void;
  onDeleteItem: (id: string) => void;
  onSellItem: (itemId: string, itemName: string, salePrice: number) => void;
  onScheduleSale: (itemId: string, itemName: string, salePrice: number, saleDate: Date) => void;
  onAddDebt: (debt: Omit<Debt, 'id'>) => void;
  onDeleteDebt: (id: string) => void;
  onAddLoan: (loan: Omit<Loan, 'id'>) => void;
  onDeleteLoan: (id: string) => void;
  onRepayLoan: (id: string) => void;
  onRepayDebt: (id: string) => void;
}

export function WealthAssetModal({
  open,
  onOpenChange,
  cashAmount,
  items,
  debts,
  loans,
  onUpdateCash,
  onAddItem,
  onDeleteItem,
  onSellItem,
  onScheduleSale,
  onAddDebt,
  onDeleteDebt,
  onAddLoan,
  onDeleteLoan,
  onRepayLoan,
  onRepayDebt,
}: WealthAssetModalProps) {
  const { t } = useLanguage();
  const [cashInput, setCashInput] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemAmount, setItemAmount] = useState("");
  const [debtName, setDebtName] = useState("");
  const [debtTarget, setDebtTarget] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [loanName, setLoanName] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [itemToSell, setItemToSell] = useState<Item | null>(null);
  const [salePrice, setSalePrice] = useState("");
  const [isScheduledSale, setIsScheduledSale] = useState(false);
  const [saleDate, setSaleDate] = useState<Date | undefined>(undefined);

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

  const handleUpdateCash = () => {
    if (!cashInput) return;
    onUpdateCash(parseFloat(cashInput.replace(/,/g, '')) || 0);
    setCashInput("");
  };

  const handleAddItem = () => {
    if (!itemName) return;
    onAddItem({
      name: itemName,
      amount: itemAmount ? parseFloat(itemAmount.replace(/,/g, '')) : 0,
    });
    setItemName("");
    setItemAmount("");
  };

  const handleAddDebt = () => {
    if (!debtName || !debtTarget || !debtAmount) return;
    onAddDebt({
      name: debtName,
      target: debtTarget,
      amount: parseFloat(debtAmount.replace(/,/g, '')) || 0,
    });
    setDebtName("");
    setDebtTarget("");
    setDebtAmount("");
  };

  const handleAddLoan = () => {
    if (!loanName || !loanAmount) return;
    onAddLoan({
      name: loanName,
      amount: parseFloat(loanAmount.replace(/,/g, '')) || 0,
    });
    setLoanName("");
    setLoanAmount("");
  };

  const handleOpenSellDialog = (item: Item) => {
    setItemToSell(item);
    setSalePrice(item.amount > 0 ? item.amount.toString() : "");
    setIsScheduledSale(false);
    setSaleDate(undefined);
    setSellDialogOpen(true);
  };

  const handleConfirmSell = () => {
    if (!itemToSell || !salePrice) return;
    const price = parseFloat(salePrice.replace(/,/g, '')) || 0;
    if (price <= 0) return;

    if (isScheduledSale) {
      if (!saleDate) return;
      onScheduleSale(itemToSell.id, itemToSell.name, price, saleDate);
    } else {
      onSellItem(itemToSell.id, itemToSell.name, price);
    }

    setSellDialogOpen(false);
    setItemToSell(null);
    setSalePrice("");
    setIsScheduledSale(false);
    setSaleDate(undefined);
  };

  const totalItems = items.reduce((sum, item) => sum + item.amount, 0);
  const totalDebts = debts.reduce((sum, debt) => sum + debt.amount, 0);
  const totalLoans = loans.reduce((sum, loan) => sum + loan.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white text-black border-white/20">
        <DialogHeader>
          <DialogTitle>{t('modal.wealth')}</DialogTitle>
          <DialogDescription>
            {t('app.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="wealth" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wealth">{t('modal.assets')}</TabsTrigger>
            <TabsTrigger value="debts">{t('modal.debts')}</TabsTrigger>
          </TabsList>

          <TabsContent value="wealth" className="space-y-4">
            <Tabs defaultValue="assets" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="assets">{t('modal.cash')}</TabsTrigger>
                <TabsTrigger value="loans">{t('modal.loans')}</TabsTrigger>
                <TabsTrigger value="items">{t('modal.otherAssets')}</TabsTrigger>
              </TabsList>

              <TabsContent value="assets" className="space-y-4">
                <Card className="p-4 border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold">{t('modal.editCash')}</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="cash-amount">{t('modal.value')} (₩)</Label>
                      <Input
                        id="cash-amount"
                        type="text"
                        value={formatNumber(cashInput)}
                        onChange={(e) => handleAmountChange(e.target.value, setCashInput)}
                        placeholder={formatCurrency(cashAmount)}
                        className="bg-white border-gray-300"
                      />
                    </div>

                    <Button onClick={handleUpdateCash} className="w-full bg-black text-white hover:bg-gray-800">
                      {t('common.save')}
                    </Button>
                  </div>
                </Card>

                <Card className="p-6 bg-gray-50 border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">{t('modal.totalCash')}</span>
                    <div className="text-2xl font-bold text-green-600">
                      ₩{formatCurrency(cashAmount)}
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="loans" className="space-y-4">
                <Card className="p-4 border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <HandCoins className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold">{t('modal.addLoan')}</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="loan-name">{t('modal.borrower')}</Label>
                      <Input
                        id="loan-name"
                        value={loanName}
                        onChange={(e) => setLoanName(e.target.value)}
                        placeholder={t('modal.borrower')}
                        className="bg-white border-gray-300"
                      />
                    </div>

                    <div>
                      <Label htmlFor="loan-amount">{t('modal.value')} (₩)</Label>
                      <Input
                        id="loan-amount"
                        type="text"
                        value={formatNumber(loanAmount)}
                        onChange={(e) => handleAmountChange(e.target.value, setLoanAmount)}
                        placeholder="0"
                        className="bg-white border-gray-300"
                      />
                    </div>

                    <Button onClick={handleAddLoan} className="w-full bg-black text-white hover:bg-gray-800">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('modal.add')}
                    </Button>
                  </div>
                </Card>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{t('modal.loans')}</h3>
                    <div className="text-blue-600 font-bold">
                      ₩{formatCurrency(totalLoans)}
                    </div>
                  </div>

                  {loans.length === 0 ? (
                    <Card className="p-8 text-center text-gray-500 border-gray-200">
                      <p>{t('modal.noLoans')}</p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {loans.map((loan) => (
                        <Card key={loan.id} className="p-4 border-gray-200">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-medium">{loan.name}</p>
                              <p className="text-sm text-blue-600">
                                +₩{formatCurrency(loan.amount)}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onRepayLoan(loan.id)}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                {t('modal.repay')}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDeleteLoan(loan.id)}
                                className="text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="items" className="space-y-4">
                <Card className="p-4 border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold">{t('modal.addAsset')}</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="item-name">{t('modal.assetName')}</Label>
                      <Input
                        id="item-name"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder={t('modal.assetName')}
                        className="bg-white border-gray-300"
                      />
                    </div>

                    <div>
                      <Label htmlFor="item-amount">{t('modal.value')} (₩)</Label>
                      <Input
                        id="item-amount"
                        type="text"
                        value={formatNumber(itemAmount)}
                        onChange={(e) => handleAmountChange(e.target.value, setItemAmount)}
                        placeholder="0"
                        className="bg-white border-gray-300"
                      />
                    </div>

                    <Button onClick={handleAddItem} className="w-full bg-black text-white hover:bg-gray-800">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('modal.add')}
                    </Button>
                  </div>
                </Card>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{t('modal.otherAssets')}</h3>
                    <div className="text-purple-600 font-bold">
                      ₩{formatCurrency(totalItems)}
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <Card className="p-8 text-center text-gray-500 border-gray-200">
                      <p>{t('modal.noAssets')}</p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => (
                        <Card key={item.id} className="p-4 border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {item.amount > 0 ? (
                                <p className="text-sm text-purple-600">
                                  +₩{formatCurrency(item.amount)}
                                </p>
                              ) : (
                                <p className="text-sm text-gray-500">
                                  0
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenSellDialog(item)}
                                className="text-gray-400 hover:text-blue-600"
                                title={t('modal.sell')}
                              >
                                <DollarSign className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDeleteItem(item.id)}
                                className="text-gray-400 hover:text-red-600"
                                title={t('common.delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="debts" className="space-y-4">
            <Card className="p-4 border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold">{t('modal.addDebt')}</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="debt-name">{t('modal.assetName')}</Label>
                  <Input
                    id="debt-name"
                    value={debtName}
                    onChange={(e) => setDebtName(e.target.value)}
                    placeholder={t('modal.assetName')}
                    className="bg-white border-gray-300"
                  />
                </div>

                <div>
                  <Label htmlFor="debt-target">{t('modal.creditor')}</Label>
                  <Input
                    id="debt-target"
                    value={debtTarget}
                    onChange={(e) => setDebtTarget(e.target.value)}
                    placeholder={t('modal.creditor')}
                    className="bg-white border-gray-300"
                  />
                </div>

                <div>
                  <Label htmlFor="debt-amount">{t('modal.value')} (₩)</Label>
                  <Input
                    id="debt-amount"
                    type="text"
                    value={formatNumber(debtAmount)}
                    onChange={(e) => handleAmountChange(e.target.value, setDebtAmount)}
                    placeholder="0"
                    className="bg-white border-gray-300"
                  />
                </div>

                <Button onClick={handleAddDebt} className="w-full bg-black text-white hover:bg-gray-800">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('modal.add')}
                </Button>
              </div>
            </Card>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{t('modal.debts')}</h3>
                <div className="text-red-600 font-bold">
                  ₩{formatCurrency(totalDebts)}
                </div>
              </div>

              {debts.length === 0 ? (
                <Card className="p-8 text-center text-gray-500 border-gray-200">
                  <p>{t('modal.noDebts')}</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {debts.map((debt) => (
                    <Card key={debt.id} className="p-4 border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{debt.name}</p>
                            <span className="text-sm text-gray-500">({debt.target})</span>
                          </div>
                          <p className="text-sm text-red-600">
                            -₩{formatCurrency(debt.amount)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onRepayDebt(debt.id)}
                                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                              >
                                {t('modal.repayDebt')}
                              </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteDebt(debt.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Card className="p-4 bg-gray-50 border-gray-200">
          <div className="flex items-center justify-between">
            <span className="font-medium">{t('modal.netWorth')}</span>
            <div className={`text-xl font-bold ${cashAmount + totalLoans - totalDebts >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              ₩{formatCurrency(cashAmount + totalLoans - totalDebts)}
            </div>
          </div>
        </Card>
      </DialogContent>

      <AlertDialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <AlertDialogContent className="bg-white text-black border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('modal.sell')}</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToSell?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="sale-price">{t('modal.value')} (₩)</Label>
              <Input
                id="sale-price"
                type="text"
                value={formatNumber(salePrice)}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, '');
                  if (value === '' || /^\d+$/.test(value)) {
                    setSalePrice(value);
                  }
                }}
                placeholder="0"
                className="mt-2 bg-white border-gray-300"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="scheduled-sale"
                checked={isScheduledSale}
                onChange={(e) => setIsScheduledSale(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <Label htmlFor="scheduled-sale" className="cursor-pointer">{t('modal.scheduleSale')}</Label>
            </div>

            {isScheduledSale && (
              <div>
                <Label>{t('schedule.date')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left mt-2 bg-white border-gray-300"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {saleDate ? format(saleDate, 'PPP') : t('schedule.date')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white border-gray-200">
                    <Calendar
                      mode="single"
                      selected={saleDate}
                      onSelect={setSaleDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSellDialogOpen(false);
              setItemToSell(null);
              setSalePrice("");
              setIsScheduledSale(false);
              setSaleDate(undefined);
            }} className="border-gray-200 hover:bg-gray-100">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSell} className="bg-black text-white hover:bg-gray-800">
              {isScheduledSale ? t('modal.scheduleSale') : t('modal.sell')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
