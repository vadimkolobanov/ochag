import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiMutate } from './client';
import type {
  StateResponse,
  Category,
  BillsResponse,
  CreditsResponse,
  SavingsResponse,
  Settings,
  HistoryResponse,
  TilesResponse,
  User,
} from './types';
import { todayStr, monthStr } from '../utils/format';

/* ── Ключи ─────────────────────────────────────────────────────── */
export const keys = {
  state: (user: User) => ['state', user] as const,
  categories: () => ['categories'] as const,
  bills: (month: string) => ['bills', month] as const,
  credits: () => ['credits'] as const,
  savings: () => ['savings'] as const,
  settings: () => ['settings'] as const,
  history: (month: string) => ['history', month] as const,
  tiles: () => ['tiles'] as const,
};

/* ── Запросы ───────────────────────────────────────────────────── */
export function useAppState(user: User) {
  return useQuery({
    queryKey: keys.state(user),
    queryFn: () =>
      apiGet<StateResponse>(`/api/state?user=${user}&today=${todayStr()}`),
    staleTime: 20_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: keys.categories(),
    queryFn: () => apiGet<Category[]>('/api/categories'),
    staleTime: 60_000 * 5,
  });
}

export function useBills(month?: string) {
  const m = month ?? monthStr();
  return useQuery({
    queryKey: keys.bills(m),
    queryFn: () => apiGet<BillsResponse>(`/api/bills?month=${m}&today=${todayStr()}`),
    staleTime: 20_000,
  });
}

export function useSavings() {
  return useQuery({
    queryKey: keys.savings(),
    queryFn: () => apiGet<SavingsResponse>('/api/savings'),
    staleTime: 20_000,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: keys.settings(),
    queryFn: () => apiGet<Settings>('/api/settings'),
    staleTime: 60_000 * 10,
  });
}

export function useCredits() {
  return useQuery({
    queryKey: keys.credits(),
    queryFn: () => apiGet<CreditsResponse>(`/api/credits?today=${todayStr()}`),
    staleTime: 20_000,
  });
}

export function useUpsertCreditData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: {
      id: number;
      body: {
        bank: string;
        contractNumber?: string;
        openedDate?: string;
        purpose?: string;
        principal: number;
        totalPayout: number;
        monthsTotal: number;
        paymentsBefore?: number;
        ratePercent?: number;
      };
    }) => apiMutate<{ ok: boolean }>('PUT', `/api/obligations/${id}/credit`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.credits() });
    },
  });
}

export function useTiles() {
  return useQuery({
    queryKey: keys.tiles(),
    queryFn: () => apiGet<TilesResponse>(`/api/tiles?today=${todayStr()}`),
    staleTime: 30_000,
  });
}

export function useHistory(month: string) {
  return useQuery({
    queryKey: keys.history(month),
    queryFn: () => apiGet<HistoryResponse>(`/api/history?month=${month}`),
    staleTime: 20_000,
  });
}

/* ── Мутации — траты/доходы/переводы ──────────────────────────── */

export function useAddExpense(user: User) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      user: User;
      date: string;
      amount: number;
      categoryId: number;
      comment?: string;
    }) => apiMutate<{ id: number }>('POST', '/api/expenses', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.state(user) });
    },
  });
}

export function useDeleteExpense(user: User) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiMutate<{ ok: boolean }>('DELETE', `/api/expenses/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.state(user) });
    },
  });
}

export function useAddIncome(user: User) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      user: User;
      date: string;
      source: string;
      amount: number;
      toDaily: number;
      toSavings: number;
      toBills: number;
      comment?: string;
    }) => apiMutate<{ id: number }>('POST', '/api/incomes', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.state(user) });
      void qc.invalidateQueries({ queryKey: keys.savings() });
      void qc.invalidateQueries({ queryKey: keys.bills(monthStr()) });
    },
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiMutate<{ ok: boolean }>('DELETE', `/api/incomes/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['state'] });
      void qc.invalidateQueries({ queryKey: keys.savings() });
    },
  });
}

export function useAddTransfer(_user: User) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      fromUser: User;
      toUser: User;
      date: string;
      amount: number;
      comment?: string;
    }) => apiMutate<{ id: number }>('POST', '/api/transfers', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.state('him') });
      void qc.invalidateQueries({ queryKey: keys.state('her') });
    },
  });
}

export function useDeleteTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiMutate<{ ok: boolean }>('DELETE', `/api/transfers/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['state'] });
    },
  });
}

/* ── Платежи (обязательства) ───────────────────────────────────── */

export function usePayObligation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { month: string; paidDate: string; amount: number } }) =>
      apiMutate<{ id: number }>('POST', `/api/obligations/${id}/pay`, body),
    onSuccess: (_data, { body }) => {
      void qc.invalidateQueries({ queryKey: keys.bills(body.month) });
      void qc.invalidateQueries({ queryKey: ['state'] });
      void qc.invalidateQueries({ queryKey: keys.credits() });
    },
  });
}

export function usePatchObligationPay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { month: string; paidDate: string; amount: number } }) =>
      apiMutate<{ ok: boolean }>('PATCH', `/api/obligations/${id}/pay`, body),
    onSuccess: (_data, { body }) => {
      void qc.invalidateQueries({ queryKey: keys.bills(body.month) });
      void qc.invalidateQueries({ queryKey: ['state'] });
      void qc.invalidateQueries({ queryKey: keys.credits() });
    },
  });
}

export function useUnpayObligation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, month }: { id: number; month: string }) =>
      apiMutate<{ ok: boolean }>('DELETE', `/api/obligations/${id}/pay?month=${month}`),
    onSuccess: (_data, { month }) => {
      void qc.invalidateQueries({ queryKey: keys.bills(month) });
      void qc.invalidateQueries({ queryKey: ['state'] });
      void qc.invalidateQueries({ queryKey: keys.credits() });
    },
  });
}

export function useAddObligation(month: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; kind: string; defaultAmount: number; dueDay: number; owner: User }) =>
      apiMutate<{ id: number }>('POST', '/api/obligations', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.bills(month) });
      void qc.invalidateQueries({ queryKey: ['state'] });
    },
  });
}

export function usePatchObligation(month: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: {
      id: number;
      body: Partial<{ name: string; kind: string; defaultAmount: number; dueDay: number; owner: User; isActive: boolean }>;
    }) =>
      apiMutate<{ ok: boolean }>('PATCH', `/api/obligations/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.bills(month) });
      void qc.invalidateQueries({ queryKey: ['state'] });
    },
  });
}

/* ── Копилка ───────────────────────────────────────────────────── */

export function useAddSavingsTx() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { type: 'deposit' | 'withdrawal'; user: User; date: string; amount: number; currency?: 'RUB' | 'EUR' | 'USD'; purpose?: string }) =>
      apiMutate<{ id: number }>('POST', '/api/savings/tx', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.savings() });
      void qc.invalidateQueries({ queryKey: ['state'] });
    },
  });
}

export function useDeleteSavingsTx() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiMutate<{ ok: boolean }>('DELETE', `/api/savings/tx/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.savings() });
      void qc.invalidateQueries({ queryKey: ['state'] });
    },
  });
}

/* ── Настройки ─────────────────────────────────────────────────── */

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Settings) =>
      apiMutate<Settings>('PUT', '/api/settings', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.settings() });
      void qc.invalidateQueries({ queryKey: ['state'] });
    },
  });
}

/* ── Категории ─────────────────────────────────────────────────── */

export function useAddCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; icon: string }) =>
      apiMutate<{ id: number }>('POST', '/api/categories', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.categories() });
    },
  });
}

export function usePatchCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { name?: string; icon?: string; isActive?: boolean } }) =>
      apiMutate<{ ok: boolean }>('PATCH', `/api/categories/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.categories() });
    },
  });
}

/* ── Автозаполнение ────────────────────────────────────────────── */

/** Возвращает сумму ещё неоплаченных обязательств текущего месяца (для автозаполнения формы дохода) */
export function useUnpaidBillsSum(): number {
  const { data } = useBills(monthStr());
  if (!data) return 0;
  return data.items
    .filter((i) => i.payment === null)
    .reduce((acc, i) => acc + i.default_amount, 0);
}
