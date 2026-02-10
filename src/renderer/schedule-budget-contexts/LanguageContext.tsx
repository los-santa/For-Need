import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type Language = "ko" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<
  LanguageContextType | undefined
>(undefined);

const translations = {
  ko: {
    // Main
    "app.title": "Money Monitor",
    "app.subtitle": "재산을 추적하고 미리 계획하세요",

    // Wealth Display
    "wealth.title": "가용 현금",
    "wealth.manage": "재산 관리",

    // Total Assets Display
    "assets.title": "총 자산",
    "assets.calculation": "돈 + 빌려준 돈 + 현금 외 자산 - 빚 ",

    // Cash History
    "cashHistory.title": "현금 변동 이력",
    "cashHistory.balance": "잔액",
    "cashHistory.noTransactions": "거래 내역이 없습니다",
    "cashHistory.viewHistory": "변동 이력 보기",

    // Daily Budget
    "budget.daily": "일일 예산",
    "budget.todayAllowance": "오늘의 허용 금액",
    "budget.daysLeft": "일 남음",
    "budget.perDay": "/ 일",
    "budget.dailyAllowance": "남은 예산 기반 일일 허용 금액",
    "budget.spentToday": "오늘 지출",
    "budget.remainingToday": "오늘 남은 금액",
    "budget.monthlyProgress": "월간 진행률",
    "budget.spent": "지출",
    "budget.setBudget":
      "월간 예산을 설정하여 일일 허용 금액을 확인하세요",
    "budget.manager": "예산 & 지출 관리",

    // Schedule
    "schedule.title": "일정 추가",
    "schedule.name": "일정 이름",
    "schedule.date": "날짜",
    "schedule.amount": "필요 금액",
    "schedule.add": "일정 추가",
    "schedule.list": "일정 목록",
    "schedule.noSchedules": "예정된 일정이 없습니다",
    "schedule.affordable": "가능",
    "schedule.notAffordable": "불가능",
    "schedule.delete": "삭제",
    "schedule.execute": "매도 실행",
    "schedule.income": "수입",
    "schedule.expense": "지출",

    // Recurring Expense
    "recurring.title": "고정비 추가",
    "recurring.name": "항목 이름",
    "recurring.amount": "금액",
    "recurring.startDate": "시작 날짜",
    "recurring.frequency": "주기",
    "recurring.daily": "매일",
    "recurring.weekly": "매주",
    "recurring.monthly": "매월",
    "recurring.yearly": "매년",
    "recurring.add": "고정비 추가",
    "recurring.list": "고정비 목록",
    "recurring.noExpenses": "고정비가 없습니다",

    // Balance Timeline
    "timeline.title": "잔고 변화 추이",
    "timeline.balance": "잔고",
    "timeline.date": "날짜",

    // Wealth Asset Modal
    "modal.wealth": "재산 관리",
    "modal.assets": "재산",
    "modal.debts": "빚",
    "modal.cash": "돈",
    "modal.loans": "빌려준 돈",
    "modal.otherAssets": "현금 외 자산",
    "modal.totalCash": "총 돈",
    "modal.editCash": "돈 수정",
    "modal.addAsset": "자산 추가",
    "modal.assetName": "자산 이름",
    "modal.value": "가치",
    "modal.add": "추가",
    "modal.sell": "매도",
    "modal.scheduleSale": "매도 예약",
    "modal.noAssets": "자산이 없습니다",
    "modal.addLoan": "빌려준 돈 추가",
    "modal.borrower": "차용인",
    "modal.repay": "상환 받기",
    "modal.noLoans": "빌려준 돈이 없습니다",
    "modal.addDebt": "빚 추가",
    "modal.creditor": "채권자",
    "modal.repayDebt": "상환하기",
    "modal.noDebts": "빚이 없습니다",
    "modal.netWorth": "순자산",
    "modal.calculation": "현재 보유 현금",

    // Budget Manager Modal
    "budgetManager.title": "예산 & 지출 관리",
    "budgetManager.budgets": "예산",
    "budgetManager.expenses": "지출",
    "budgetManager.addBudget": "예산 추가",
    "budgetManager.category": "카테고리",
    "budgetManager.amount": "금액",
    "budgetManager.month": "월",
    "budgetManager.noBudgets": "예산이 없습니다",
    "budgetManager.addExpense": "지출 추가",
    "budgetManager.description": "설명",
    "budgetManager.noExpenses": "지출 내역이 없습니다",
    "budgetManager.delete": "삭제",

    // Common
    "common.close": "닫기",
    "common.save": "저장",
    "common.cancel": "취소",
    "common.edit": "수정",
    "common.delete": "삭제",
  },
  en: {
    // Main
    "app.title": "Money Monitor",
    "app.subtitle": "Track your finances and plan ahead",

    // Wealth Display
    "wealth.title": "Available Cash",
    "wealth.manage": "Manage Wealth",

    // Total Assets Display
    "assets.title": "Total Assets",
    "assets.calculation":
      "Cash + Loans Out + Other Assets - dept",

    // Cash History
    "cashHistory.title": "Cash Transaction History",
    "cashHistory.balance": "Balance",
    "cashHistory.noTransactions": "No transaction history",
    "cashHistory.viewHistory": "View History",

    // Daily Budget
    "budget.daily": "Daily Budget",
    "budget.todayAllowance": "Today's Allowance",
    "budget.daysLeft": "days left",
    "budget.perDay": "/ day",
    "budget.dailyAllowance":
      "Daily allowance based on remaining budget",
    "budget.spentToday": "Spent Today",
    "budget.remainingToday": "Remaining Today",
    "budget.monthlyProgress": "Monthly Progress",
    "budget.spent": "spent",
    "budget.setBudget":
      "Set a monthly budget to see your daily allowance",
    "budget.manager": "Budget & Expense Manager",

    // Schedule
    "schedule.title": "Add Schedule",
    "schedule.name": "Schedule Name",
    "schedule.date": "Date",
    "schedule.amount": "Required Amount",
    "schedule.add": "Add Schedule",
    "schedule.list": "Schedule List",
    "schedule.noSchedules": "No scheduled events",
    "schedule.affordable": "Affordable",
    "schedule.notAffordable": "Not Affordable",
    "schedule.delete": "Delete",
    "schedule.execute": "Execute Sale",
    "schedule.income": "Income",
    "schedule.expense": "Expense",

    // Recurring Expense
    "recurring.title": "Add Recurring Expense",
    "recurring.name": "Item Name",
    "recurring.amount": "Amount",
    "recurring.startDate": "Start Date",
    "recurring.frequency": "Frequency",
    "recurring.daily": "Daily",
    "recurring.weekly": "Weekly",
    "recurring.monthly": "Monthly",
    "recurring.yearly": "Yearly",
    "recurring.add": "Add Recurring Expense",
    "recurring.list": "Recurring Expenses",
    "recurring.noExpenses": "No recurring expenses",

    // Balance Timeline
    "timeline.title": "Balance Timeline",
    "timeline.balance": "Balance",
    "timeline.date": "Date",

    // Wealth Asset Modal
    "modal.wealth": "Wealth Management",
    "modal.assets": "Assets",
    "modal.debts": "Debts",
    "modal.cash": "Cash",
    "modal.loans": "Loans Out",
    "modal.otherAssets": "Other Assets",
    "modal.totalCash": "Total Cash",
    "modal.editCash": "Edit Cash",
    "modal.addAsset": "Add Asset",
    "modal.assetName": "Asset Name",
    "modal.value": "Value",
    "modal.add": "Add",
    "modal.sell": "Sell",
    "modal.scheduleSale": "Schedule Sale",
    "modal.noAssets": "No assets",
    "modal.addLoan": "Add Loan",
    "modal.borrower": "Borrower",
    "modal.repay": "Repay",
    "modal.noLoans": "No loans out",
    "modal.addDebt": "Add Debt",
    "modal.creditor": "Creditor",
    "modal.repayDebt": "Repay Debt",
    "modal.noDebts": "No debts",
    "modal.netWorth": "Net Worth",
    "modal.calculation": "Current Cash Holdings",

    // Budget Manager Modal
    "budgetManager.title": "Budget & Expense Manager",
    "budgetManager.budgets": "Budgets",
    "budgetManager.expenses": "Expenses",
    "budgetManager.addBudget": "Add Budget",
    "budgetManager.category": "Category",
    "budgetManager.amount": "Amount",
    "budgetManager.month": "Month",
    "budgetManager.noBudgets": "No budgets set",
    "budgetManager.addExpense": "Add Expense",
    "budgetManager.description": "Description",
    "budgetManager.noExpenses": "No expenses recorded",
    "budgetManager.delete": "Delete",

    // Common
    "common.close": "Close",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.edit": "Edit",
    "common.delete": "Delete",
  },
};

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "ko";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const t = (key: string): string => {
    return (
      translations[language][
        key as keyof typeof translations.ko
      ] || key
    );
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error(
      "useLanguage must be used within a LanguageProvider",
    );
  }
  return context;
}