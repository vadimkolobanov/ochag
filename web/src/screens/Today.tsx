import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { ArcCard, ArcCardSkeleton } from '../components/ArcCard';
import { CategoryIcon } from '../components/CategoryGrid';
import { fmtMoney, fmtDateShort, todayStr } from '../utils/format';
import { useAppState, useDeleteExpense } from '../api/queries';
import type { User, RecentExpense, UpcomingBill } from '../api/types';
import { USER_KEY } from '../api/client';

interface Props {
  user: User;
  onSwitchUser: () => void;
  onOpenQuickInput: (tab?: 'expense' | 'income' | 'transfer') => void;
  showToast: (msg: string, action?: { label: string; onClick: () => void }) => void;
}

const STATUS_COLORS: Record<string, string> = {
  paid: 'var(--ok)',
  due_soon: 'var(--amber)',
  overdue: 'var(--danger)',
  upcoming: 'var(--muted)',
};

function UserAvatar({ user }: { user: User }) {
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-surface font-bold text-[15px] cursor-pointer active:opacity-70 transition-opacity"
      style={{ backgroundColor: user === 'him' ? 'var(--him)' : 'var(--her)' }}
    >
      {user === 'him' ? 'Он' : 'Она'}
    </div>
  );
}

function BillDot({ status }: { status: string }) {
  return (
    <span
      className="w-2 h-2 rounded-full inline-block flex-shrink-0"
      style={{ backgroundColor: STATUS_COLORS[status] ?? 'var(--muted)' }}
    />
  );
}

function UpcomingBillsList({ bills, currency }: { bills: UpcomingBill[]; currency: string }) {
  const navigate = useNavigate();
  if (bills.length === 0) return null;
  return (
    <div className="mx-4 mt-4">
      <h2 className="text-[13px] font-bold text-muted uppercase tracking-wide mb-2">
        Ближайшие платежи
      </h2>
      <div className="bg-surface rounded-card shadow-card divide-y divide-[#F0EFE9]">
        {bills.map((b) => (
          <button
            key={b.id}
            className="w-full flex items-center gap-3 px-4 py-3 active:bg-bg transition-colors"
            onClick={() => navigate('/bills')}
          >
            <BillDot status={b.status} />
            <span className="flex-1 text-[15px] font-medium text-ink text-left">{b.name}</span>
            <span className="text-[13px] text-muted">до {b.dueDay}-го</span>
            <span className="text-[14px] font-semibold text-ink tabnum ml-2">
              {fmtMoney(b.amount, currency)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RecentExpenseItem({
  expense,
  currency,
  onDelete,
}: {
  expense: RecentExpense;
  currency: string;
  onDelete: () => void;
}) {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  function startPress(e: React.PointerEvent) {
    // Захватываем указатель чтобы получать события даже за пределами элемента
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointerStart.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => {
      setConfirmVisible(true);
      longPressTimer.current = null;
    }, 500);
  }

  function endPress(e: React.PointerEvent) {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Свайп влево → показать confirm
    if (pointerStart.current) {
      const dx = pointerStart.current.x - e.clientX;
      const dy = Math.abs(pointerStart.current.y - e.clientY);
      if (dx > 60 && dy < 30) setConfirmVisible(true);
    }
    pointerStart.current = null;
  }

  function cancelPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pointerStart.current = null;
  }

  if (confirmVisible) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-bg">
        <span className="flex-1 text-[14px] font-medium text-ink truncate">
          Удалить «{expense.category}»?
        </span>
        <button
          onClick={() => { setConfirmVisible(false); onDelete(); }}
          className="px-3 py-1.5 rounded-btn bg-danger text-surface text-[13px] font-semibold active:opacity-70"
        >
          Удалить
        </button>
        <button
          onClick={() => setConfirmVisible(false)}
          className="px-3 py-1.5 rounded-btn bg-surface text-muted text-[13px] font-medium active:opacity-70"
        >
          Отмена
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-bg select-none"
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerCancel={cancelPress}
      onPointerLeave={cancelPress}
    >
      <span className="w-8 h-8 rounded-full bg-bg flex items-center justify-center text-primary flex-shrink-0">
        <CategoryIcon name={expense.icon} size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-ink truncate">{expense.category}</div>
        <div className="text-[12px] text-muted">{fmtDateShort(expense.date)}</div>
      </div>
      <span className="text-[15px] font-semibold text-ink tabnum">
        −{fmtMoney(expense.amount, currency)}
      </span>
    </div>
  );
}

export function Today({ user, onSwitchUser, onOpenQuickInput, showToast }: Props) {
  const { data, isLoading, isError, refetch } = useAppState(user);
  const deleteExpense = useDeleteExpense(user);

  const [paydayDismissed, setPaydayDismissed] = useState(() => {
    return sessionStorage.getItem(`payday_dismissed_${todayStr()}`) === '1';
  });

  function dismissPayday() {
    sessionStorage.setItem(`payday_dismissed_${todayStr()}`, '1');
    setPaydayDismissed(true);
  }

  function handleDelete(id: number, category: string) {
    deleteExpense.mutate(id, {
      onSuccess: () => showToast(`Трата «${category}» удалена`),
      onError: (e) => showToast(e instanceof Error ? e.message : 'Ошибка'),
    });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      {/* Шапка */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 safe-top">
        <button onClick={onSwitchUser} className="active:opacity-70 transition-opacity">
          <UserAvatar user={user} />
        </button>
        <h1 className="font-unbounded font-bold text-primary" style={{ fontSize: 20 }}>
          Очаг
        </h1>
        <button
          onClick={() => (window.location.href = '/settings')}
          className="w-9 h-9 flex items-center justify-center text-muted active:opacity-70"
        >
          <Settings size={22} />
        </button>
      </div>

      {/* Основной контент */}
      {isLoading ? (
        <>
          <ArcCardSkeleton />
          <div className="mx-4 mt-4 space-y-2">
            <div className="skeleton h-4 w-40 rounded" />
            <div className="bg-surface rounded-card shadow-card">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="skeleton w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <div className="skeleton h-4 w-28 rounded" />
                    <div className="skeleton h-3 w-16 rounded" />
                  </div>
                  <div className="skeleton h-4 w-20 rounded" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 px-6">
          <p className="text-[15px] text-muted text-center">
            Нет связи с сервером. Проверьте интернет.
          </p>
          <button
            onClick={() => void refetch()}
            className="h-12 px-6 rounded-btn bg-primary text-surface font-semibold text-[15px]"
          >
            Повторить
          </button>
        </div>
      ) : data ? (
        <>
          <ArcCard data={data} />

          {/* Баннер зарплаты */}
          {data.isPaydayToday && !paydayDismissed && (
            <div className="mx-4 mt-3 bg-primary rounded-card px-4 py-3 flex items-center gap-3 shadow-card">
              <div className="flex-1 text-surface text-[14px] font-medium">
                Сегодня зарплата — распределить?
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    dismissPayday();
                    onOpenQuickInput('income');
                  }}
                  className="bg-surface text-primary text-[13px] font-bold px-3 py-1.5 rounded-btn active:opacity-70"
                >
                  Да
                </button>
                <button
                  onClick={dismissPayday}
                  className="text-surface/70 text-[13px] font-medium active:opacity-70"
                >
                  Позже
                </button>
              </div>
            </div>
          )}

          <UpcomingBillsList bills={data.upcomingBills} currency={data.currency} />

          {/* Последние траты */}
          {data.recentExpenses.length > 0 && (
            <div className="mx-4 mt-4">
              <h2 className="text-[13px] font-bold text-muted uppercase tracking-wide mb-2">
                Последние траты
              </h2>
              <div className="bg-surface rounded-card shadow-card divide-y divide-[#F0EFE9]">
                {data.recentExpenses.map((exp) => (
                  <RecentExpenseItem
                    key={exp.id}
                    expense={exp}
                    currency={data.currency}
                    onDelete={() => handleDelete(exp.id, exp.category)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Пустое состояние */}
          {data.recentExpenses.length === 0 && !data.isPaydayToday && (
            <div className="flex flex-col items-center justify-center py-12 px-6 gap-2">
              <p className="text-[15px] text-muted text-center">
                Пока нет трат. Нажмите&nbsp;
                <button
                  onClick={() => onOpenQuickInput('expense')}
                  className="text-primary font-semibold"
                >
                  +
                </button>
                , чтобы добавить первую.
              </p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
