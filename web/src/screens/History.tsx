import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CategoryIcon } from '../components/CategoryGrid';
import { fmtMoney, fmtMonthName, fmtDateShort, prevMonth, nextMonth, monthStr } from '../utils/format';
import {
  useHistory,
  useSettings,
  useDeleteExpense,
  useDeleteIncome,
  useDeleteTransfer,
  useDeleteSavingsTx,
} from '../api/queries';
import type { User, HistoryOperation } from '../api/types';

const SOURCE_LABELS: Record<string, string> = {
  salary: 'Зарплата',
  advance: 'Аванс',
  nails: 'Маникюр',
  other: 'Другое',
};

interface Props {
  user: User;
  showToast: (msg: string, action?: { label: string; onClick: () => void }) => void;
}

function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const label = fmtMonthName(month);
  const cap = label.charAt(0).toUpperCase() + label.slice(1);
  const atCurrent = month === monthStr();
  return (
    <div className="flex items-center justify-center gap-4 px-4 py-3">
      <button
        className="w-8 h-8 flex items-center justify-center rounded-full active:bg-bg text-muted"
        onClick={() => onChange(prevMonth(month))}
      >
        <ChevronLeft size={20} />
      </button>
      <span className="text-[16px] font-bold text-ink min-w-[160px] text-center">{cap}</span>
      <button
        className="w-8 h-8 flex items-center justify-center rounded-full active:bg-bg text-muted"
        onClick={() => onChange(nextMonth(month))}
        disabled={atCurrent}
        style={{ opacity: atCurrent ? 0.3 : 1 }}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

function OperationItem({
  op,
  currency,
  onDelete,
}: {
  op: HistoryOperation;
  currency: string;
  onDelete?: () => void;
}) {
  const [confirm, setConfirm] = useState(false);

  const isDeletable = !!onDelete && !(op.type === 'savings' && op.incomeId != null);

  function getLabel(): string {
    if (op.type === 'expense') return op.category ?? 'Трата';
    if (op.type === 'income') return SOURCE_LABELS[op.source ?? ''] ?? 'Доход';
    if (op.type === 'transfer') return `Перевод ${op.fromUser === 'him' ? 'Он→Она' : 'Она→Он'}`;
    if (op.type === 'savings') {
      if (op.savingsType === 'deposit') {
        return op.incomeId ? `Копилка: из зарплаты ${op.user === 'him' ? 'Его' : 'Её'}` : 'Копилка: пополнение';
      }
      return `Копилка: ${op.purpose ?? 'снятие'}`;
    }
    return '';
  }

  type AmountInfo = { sign: string; color: string };
  function getAmountInfo(): AmountInfo {
    if (op.type === 'expense') return { sign: '−', color: 'var(--ink)' };
    if (op.type === 'income') return { sign: '+', color: 'var(--ok)' };
    if (op.type === 'transfer') return { sign: '', color: 'var(--muted)' };
    if (op.type === 'savings') {
      return op.savingsType === 'deposit'
        ? { sign: '+', color: 'var(--ok)' }
        : { sign: '−', color: 'var(--danger)' };
    }
    return { sign: '', color: 'var(--ink)' };
  }

  const { sign, color } = getAmountInfo();

  if (confirm) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-bg">
        <span className="flex-1 text-[14px] font-medium text-ink truncate">Удалить операцию?</span>
        <button
          onClick={() => { setConfirm(false); onDelete?.(); }}
          className="px-3 py-1.5 rounded-btn bg-danger text-surface text-[13px] font-semibold active:opacity-70"
        >
          Удалить
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="px-3 py-1.5 rounded-btn bg-surface text-muted text-[13px] font-medium active:opacity-70"
        >
          Отмена
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-colors select-none
        ${isDeletable ? 'active:bg-bg cursor-pointer' : ''}`}
      onClick={isDeletable ? () => setConfirm(true) : undefined}
    >
      {op.type === 'expense' && op.icon ? (
        <span className="w-8 h-8 rounded-full bg-bg flex items-center justify-center text-primary flex-shrink-0">
          <CategoryIcon name={op.icon} size={18} />
        </span>
      ) : (
        <span className="w-8 h-8 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-ink truncate">{getLabel()}</div>
        <div className="text-[12px] text-muted">{fmtDateShort(op.date)}</div>
      </div>
      <span className="text-[14px] font-semibold tabnum" style={{ color }}>
        {sign}{fmtMoney(op.amount, currency)}
      </span>
    </div>
  );
}

export function History({ user, showToast }: Props) {
  const [month, setMonth] = useState(monthStr);
  const { data, isLoading, isError, refetch } = useHistory(month);
  const { data: settings } = useSettings();
  const currency = settings?.currencySymbol ?? '₽';

  const deleteExpense = useDeleteExpense(user);
  const deleteIncome = useDeleteIncome();
  const deleteTransfer = useDeleteTransfer();
  const deleteSavings = useDeleteSavingsTx();

  function handleDelete(op: HistoryOperation) {
    const cb = {
      onSuccess: () => showToast('Удалено'),
      onError: (e: unknown) => showToast(e instanceof Error ? e.message : 'Ошибка'),
    };
    if (op.type === 'expense') deleteExpense.mutate(op.id, cb);
    else if (op.type === 'income') deleteIncome.mutate(op.id, cb);
    else if (op.type === 'transfer') deleteTransfer.mutate(op.id, cb);
    else if (op.type === 'savings' && !op.incomeId) deleteSavings.mutate(op.id, cb);
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-32 safe-top">
      <div className="px-4 pt-4 pb-0">
        <h1 className="font-unbounded font-bold text-primary text-[18px]">Итоги</h1>
      </div>
      <MonthSwitcher month={month} onChange={setMonth} />

      {isLoading ? (
        <div className="mx-4 space-y-3 mt-2">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-card" />)}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 px-6">
          <p className="text-[15px] text-muted text-center">Нет связи с сервером. Проверьте интернет.</p>
          <button onClick={() => void refetch()} className="h-12 px-6 rounded-btn bg-primary text-surface font-semibold text-[15px]">Повторить</button>
        </div>
      ) : data ? (
        <div className="space-y-4 pb-4">
          {/* Expenses by category */}
          {data.expensesTotal > 0 && (
            <div className="mx-4">
              <h2 className="text-[13px] font-bold text-muted uppercase tracking-wide mb-2">
                Повседневные траты · {fmtMoney(data.expensesTotal, currency)}
              </h2>
              <div className="bg-surface rounded-card shadow-card px-4 py-3 space-y-3">
                {data.expensesByCategory.map((cat) => (
                  <div key={cat.categoryId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[14px] font-medium text-ink">{cat.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] text-muted tabnum">{Math.round(cat.share * 100)}%</span>
                        <span className="text-[14px] font-semibold text-ink tabnum">{fmtMoney(cat.total, currency)}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E8E7E2' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(cat.share * 100, 2)}%`, backgroundColor: 'var(--primary)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incomes by source */}
          {data.incomesBySource.length > 0 && (
            <div className="mx-4">
              <h2 className="text-[13px] font-bold text-muted uppercase tracking-wide mb-2">Доходы</h2>
              <div className="bg-surface rounded-card shadow-card divide-y divide-[#F0EFE9]">
                {data.incomesBySource.map((s) => (
                  <div key={s.source} className="flex items-center justify-between px-4 py-3">
                    <span className="text-[15px] font-medium text-ink">{SOURCE_LABELS[s.source] ?? s.source}</span>
                    <span className="text-[15px] font-semibold tabnum" style={{ color: 'var(--ok)' }}>
                      +{fmtMoney(s.total, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Savings */}
          {(data.savings.deposited > 0 || data.savings.withdrawn > 0) && (
            <div className="mx-4">
              <h2 className="text-[13px] font-bold text-muted uppercase tracking-wide mb-2">Копилка</h2>
              <div className="bg-surface rounded-card shadow-card px-4 py-3 space-y-2">
                {data.savings.deposited > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[14px] text-muted">Внесено</span>
                    <span className="text-[14px] font-semibold tabnum" style={{ color: 'var(--ok)' }}>
                      +{fmtMoney(data.savings.deposited, currency)}
                    </span>
                  </div>
                )}
                {data.savings.withdrawn > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[14px] text-muted">Снято</span>
                    <span className="text-[14px] font-semibold tabnum" style={{ color: 'var(--danger)' }}>
                      −{fmtMoney(data.savings.withdrawn, currency)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#F0EFE9] space-y-1">
                  <span className="text-[14px] font-bold text-ink">Итого в копилке</span>
                  {([['RUB', currency], ['EUR', '€'], ['USD', '$']] as [string, string][]).map(([cur, sym]) => {
                    const bal = data.savings.balances[cur as 'RUB' | 'EUR' | 'USD'];
                    if (bal === 0) return null;
                    return (
                      <div key={cur} className="flex justify-between">
                        <span className="text-[13px] text-muted">{sym}</span>
                        <span className="text-[14px] font-bold tabnum" style={{ color: 'var(--amber)' }}>
                          {fmtMoney(bal, sym)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Bills summary */}
          {data.bills.totalCount > 0 && (
            <div className="mx-4">
              <h2 className="text-[13px] font-bold text-muted uppercase tracking-wide mb-2">Платежи</h2>
              <div className="bg-surface rounded-card shadow-card px-4 py-3">
                <p className="text-[14px] text-ink">
                  Оплачено {data.bills.paidCount} из {data.bills.totalCount} на сумму{' '}
                  <span className="font-semibold tabnum">{fmtMoney(data.bills.paidSum, currency)}</span>
                </p>
              </div>
            </div>
          )}

          {/* All operations */}
          {data.operations.length > 0 && (
            <div className="mx-4">
              <h2 className="text-[13px] font-bold text-muted uppercase tracking-wide mb-2">
                Все операции
              </h2>
              <div className="bg-surface rounded-card shadow-card divide-y divide-[#F0EFE9]">
                {data.operations.map((op) => (
                  <OperationItem
                    key={`${op.type}-${op.id}`}
                    op={op}
                    currency={currency}
                    onDelete={() => handleDelete(op)}
                  />
                ))}
              </div>
            </div>
          )}

          {data.operations.length === 0 && (
            <div className="flex flex-col items-center py-12 px-6">
              <p className="text-[15px] text-muted text-center">За этот месяц операций нет</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
