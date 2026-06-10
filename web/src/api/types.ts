export type User = 'him' | 'her';
export type IncomeSource = 'salary' | 'advance' | 'nails' | 'other';
export type BillStatus = 'paid' | 'due_soon' | 'overdue' | 'upcoming';

export interface UpcomingBill {
  id: number;
  name: string;
  dueDay: number;
  amount: number;
  status: BillStatus;
}

export interface RecentExpense {
  id: number;
  date: string;
  amount: number;
  comment: string | null;
  category: string;
  icon: string;
}

export interface Payday {
  date: string;
  daysLeft: number;
}

export interface StateResponse {
  user: User;
  currency: string;
  dailyBalance: number;
  perDay: number;
  payday: Payday;
  arcFill: number;
  upcomingBills: UpcomingBill[];
  recentExpenses: RecentExpense[];
  savingsBalance: number;
  isPaydayToday: boolean;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  sort: number;
  is_active: number;
}

export interface BillItem {
  id: number;
  name: string;
  kind: string;
  default_amount: number;
  due_day: number;
  owner: User;
  is_active: number;
  status: BillStatus;
  payment: { paidDate: string; amount: number } | null;
}

export interface BillSummary {
  totalCount: number;
  paidCount: number;
  paidSum: number;
  plannedSum: number;
  reservedSum: number;
}

export interface BillsResponse {
  summary: BillSummary;
  items: BillItem[];
}

export interface SavingsTx {
  id: number;
  type: 'deposit' | 'withdrawal';
  user: User;
  date: string;
  amount: number;
  purpose: string | null;
  income_id: number | null;
}

export interface SavingsResponse {
  balance: number;
  items: SavingsTx[];
}

export interface Settings {
  currencySymbol: string;
  paydayHim: number[];
  paydayHer: number[];
}
