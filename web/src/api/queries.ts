import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiMutate } from './client';
import type {
  StateResponse,
  Category,
  BillsResponse,
  SavingsResponse,
  Settings,
  User,
} from './types';
import { todayStr, monthStr } from '../utils/format';

/* ── Ключи ─────────────────────────────────────────────────────── */
export const keys = {
  state: (user: User) => ['state', user] as const,
  categories: () => ['categories'] as const,
  bills: (month: string) => ['bills', month] as const,
  savings: () => ['savings'] as const,
  settings: () => ['settings'] as const,
  history: (month: string) => ['history', month] as const,
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

/* ── Мутации ───────────────────────────────────────────────────── */

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

export function useAddTransfer(user: User) {
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

/** Возвращает сумму ещё неоплаченных обязательств текущего месяца (для автозаполнения формы дохода) */
export function useUnpaidBillsSum(): number {
  const { data } = useBills(monthStr());
  if (!data) return 0;
  return data.items
    .filter((i) => i.payment === null)
    .reduce((acc, i) => acc + i.default_amount, 0);
}
