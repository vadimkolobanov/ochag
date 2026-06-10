import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Settings2, X } from 'lucide-react';
import { BottomSheet } from '../components/BottomSheet';
import { fmtMoney, fmtMonthName, prevMonth, nextMonth, monthStr, todayStr } from '../utils/format';
import {
  useBills, useSettings, usePayObligation, usePatchObligationPay,
  useUnpayObligation, useAddObligation, usePatchObligation,
} from '../api/queries';
import type { User, BillItem } from '../api/types';

const STATUS_DOT: Record<string, string> = {
  paid: 'var(--ok)',
  due_soon: 'var(--amber)',
  overdue: 'var(--danger)',
  upcoming: 'var(--muted)',
};

const KIND_LABELS: Record<string, string> = {
  credit: 'Кредит', utilities: 'Коммуналка', mobile: 'Связь',
  internet: 'Интернет', other: 'Другое',
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

export function Bills({ user, showToast }: Props) {
  const [month, setMonth] = useState(monthStr);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [payAmt, setPayAmt] = useState('');
  const [payDate, setPayDate] = useState(todayStr());
  const [manageOpen, setManageOpen] = useState(false);
  const [oblFormId, setOblFormId] = useState<number | 'new' | null>(null);

  const [oblName, setOblName] = useState('');
  const [oblKind, setOblKind] = useState('other');
  const [oblAmt, setOblAmt] = useState('');
  const [oblDay, setOblDay] = useState('');
  const [oblOwner, setOblOwner] = useState<User>(user);

  const { data, isLoading, isError, refetch } = useBills(month);
  const { data: settings } = useSettings();
  const currency = settings?.currencySymbol ?? '₽';

  const payMut = usePayObligation();
  const patchPayMut = usePatchObligationPay();
  const unpayMut = useUnpayObligation();
  const addOblMut = useAddObligation(month);
  const patchOblMut = usePatchObligation(month);

  function openPayForm(bill: BillItem) {
    setActiveId(bill.id);
    const existing = bill.payment?.amount ?? bill.default_amount;
    setPayAmt(String(existing / 100));
    setPayDate(todayStr());
  }

  function closePayForm() {
    setActiveId(null);
    setPayAmt('');
  }

  function handlePay(bill: BillItem) {
    const amt = Math.round(parseFloat(payAmt) * 100);
    if (isNaN(amt) || amt <= 0) { showToast('Введите сумму'); return; }
    const body = { month, paidDate: payDate, amount: amt };
    const mut = bill.payment ? patchPayMut : payMut;
    mut.mutate(
      { id: bill.id, body },
      {
        onSuccess: () => { closePayForm(); showToast(bill.payment ? 'Оплата обновлена' : 'Отмечено как оплаченное'); },
        onError: (e) => showToast(e instanceof Error ? e.message : 'Ошибка'),
      },
    );
  }

  function handleUnpay(id: number) {
    if (!confirm('Снять отметку об оплате?')) return;
    unpayMut.mutate(
      { id, month },
      {
        onSuccess: () => { closePayForm(); showToast('Отметка снята'); },
        onError: (e) => showToast(e instanceof Error ? e.message : 'Ошибка'),
      },
    );
  }

  function openOblForm(id: number | 'new') {
    if (id === 'new') {
      setOblName(''); setOblKind('other'); setOblAmt(''); setOblDay(''); setOblOwner(user);
    } else {
      const bill = data?.items.find((b) => b.id === id);
      if (bill) {
        setOblName(bill.name);
        setOblKind(bill.kind);
        setOblAmt(String(bill.default_amount / 100));
        setOblDay(String(bill.due_day));
        setOblOwner(bill.owner);
      }
    }
    setOblFormId(id);
  }

  function handleSaveObl() {
    const amt = Math.round(parseFloat(oblAmt) * 100);
    const day = parseInt(oblDay);
    if (!oblName.trim()) { showToast('Укажите название'); return; }
    if (isNaN(amt) || amt < 0) { showToast('Введите плановую сумму'); return; }
    if (isNaN(day) || day < 1 || day > 28) { showToast('День должен быть от 1 до 28'); return; }

    const body = { name: oblName.trim(), kind: oblKind, defaultAmount: amt, dueDay: day, owner: oblOwner };

    if (oblFormId === 'new') {
      addOblMut.mutate(body, {
        onSuccess: () => { setOblFormId(null); showToast('Платёж добавлен'); },
        onError: (e) => showToast(e instanceof Error ? e.message : 'Ошибка'),
      });
    } else if (typeof oblFormId === 'number') {
      patchOblMut.mutate(
        { id: oblFormId, body },
        {
          onSuccess: () => { setOblFormId(null); showToast('Платёж обновлён'); },
          onError: (e) => showToast(e instanceof Error ? e.message : 'Ошибка'),
        },
      );
    }
  }

  function handleArchiveObl(id: number) {
    if (!confirm('Архивировать этот платёж? Он исчезнет из чек-листа.')) return;
    patchOblMut.mutate(
      { id, body: { isActive: false } },
      {
        onSuccess: () => { setOblFormId(null); showToast('Платёж архивирован'); },
        onError: (e) => showToast(e instanceof Error ? e.message : 'Ошибка'),
      },
    );
  }

  const busy = payMut.isPending || patchPayMut.isPending || unpayMut.isPending;

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24 safe-top">
      <div className="px-4 pt-4 pb-0">
        <h1 className="font-unbounded font-bold text-primary text-[18px]">Платежи</h1>
      </div>

      <MonthSwitcher month={month} onChange={(m) => { setMonth(m); closePayForm(); }} />

      {isLoading ? (
        <div className="mx-4 space-y-3 mt-1">
          <div className="skeleton h-4 w-64 rounded" />
          <div className="bg-surface rounded-card shadow-card">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-4">
                <div className="skeleton w-2.5 h-2.5 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-3 w-16 rounded" />
                </div>
                <div className="skeleton w-8 h-8 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 px-6">
          <p className="text-[15px] text-muted text-center">Нет связи с сервером. Проверьте интернет.</p>
          <button onClick={() => void refetch()} className="h-12 px-6 rounded-btn bg-primary text-surface font-semibold text-[15px]">Повторить</button>
        </div>
      ) : data ? (
        <>
          {/* Summary */}
          {data.summary.totalCount > 0 && (
            <div className="mx-4 mb-3">
              <p className="text-[13px] text-muted leading-relaxed">
                Оплачено {data.summary.paidCount} из {data.summary.totalCount}
                {' · '}{fmtMoney(data.summary.paidSum, currency)} из плановых {fmtMoney(data.summary.plannedSum, currency)}
                {data.summary.reservedSum > 0 && ` · отложено ${fmtMoney(data.summary.reservedSum, currency)}`}
              </p>
            </div>
          )}

          {/* List */}
          {data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 gap-2">
              <p className="text-[15px] text-muted text-center">Добавьте первый платёж</p>
            </div>
          ) : (
            <div className="mx-4 bg-surface rounded-card shadow-card divide-y divide-[#F0EFE9]">
              {data.items.map((bill) => (
                <div key={bill.id}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-bg transition-colors"
                    onClick={() => (activeId === bill.id ? closePayForm() : openPayForm(bill))}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: STATUS_DOT[bill.status] ?? 'var(--muted)' }}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-[15px] font-medium text-ink truncate">{bill.name}</div>
                      <div className="text-[12px] text-muted">до {bill.due_day}-го</div>
                    </div>
                    <span className="text-[14px] font-semibold text-ink tabnum">
                      {fmtMoney(bill.payment?.amount ?? bill.default_amount, currency)}
                    </span>
                    <span className="flex-shrink-0 ml-1">
                      {bill.status === 'paid'
                        ? <CheckCircle2 size={22} style={{ color: 'var(--ok)' }} />
                        : <Circle size={22} className="text-muted" />}
                    </span>
                  </button>

                  {/* Inline pay form */}
                  {activeId === bill.id && (
                    <div className="bg-bg px-4 py-3 space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[12px] text-muted block mb-1">Сумма</label>
                          <input
                            type="number" inputMode="decimal" value={payAmt}
                            onChange={(e) => setPayAmt(e.target.value)}
                            className="w-full h-11 px-3 rounded-btn bg-surface border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
                            placeholder="0"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[12px] text-muted block mb-1">Дата</label>
                          <input
                            type="date" value={payDate}
                            onChange={(e) => setPayDate(e.target.value)}
                            className="w-full h-11 px-3 rounded-btn bg-surface border border-[#E0DDD6] text-[14px] text-ink focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePay(bill)}
                          disabled={busy}
                          className="flex-1 h-11 rounded-btn bg-primary text-surface font-semibold text-[14px] active:opacity-70 disabled:opacity-50"
                        >
                          {bill.payment ? 'Сохранить' : 'Оплатить'}
                        </button>
                        {bill.payment && (
                          <button
                            onClick={() => handleUnpay(bill.id)}
                            disabled={busy}
                            className="h-11 px-3 rounded-btn bg-surface border border-[#E0DDD6] text-danger text-[13px] font-medium active:opacity-70 disabled:opacity-50"
                          >
                            Снять отметку
                          </button>
                        )}
                        <button
                          onClick={closePayForm}
                          className="w-11 h-11 rounded-btn bg-surface border border-[#E0DDD6] flex items-center justify-center text-muted active:opacity-70"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Manage button */}
          <div className="mx-4 mt-4">
            <button
              onClick={() => setManageOpen(true)}
              className="w-full h-12 rounded-btn bg-surface shadow-card text-[14px] font-medium text-ink flex items-center justify-center gap-2 active:opacity-70"
            >
              <Settings2 size={16} className="text-muted" />
              Управлять платежами
            </button>
          </div>
        </>
      ) : null}

      {/* Manage sheet */}
      <BottomSheet open={manageOpen} onClose={() => setManageOpen(false)} title="Управлять платежами">
        <div className="pb-6">
          {!data?.items.length ? (
            <p className="text-[14px] text-muted text-center py-6">Платежи не добавлены</p>
          ) : (
            <div className="divide-y divide-[#F0EFE9]">
              {data.items.map((bill) => (
                <div key={bill.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium text-ink truncate">{bill.name}</div>
                    <div className="text-[12px] text-muted">
                      {KIND_LABELS[bill.kind] ?? bill.kind} · до {bill.due_day}-го · {fmtMoney(bill.default_amount, currency)}
                    </div>
                  </div>
                  <button
                    className="px-3 py-1.5 rounded-btn bg-bg text-[13px] font-medium text-ink active:opacity-70"
                    onClick={() => openOblForm(bill.id)}
                  >
                    Изменить
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="px-4 mt-4">
            <button
              onClick={() => openOblForm('new')}
              className="w-full h-12 rounded-btn bg-primary text-surface font-semibold text-[15px] active:opacity-70"
            >
              + Добавить платёж
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Add / edit obligation form */}
      <BottomSheet
        open={oblFormId !== null}
        onClose={() => setOblFormId(null)}
        title={oblFormId === 'new' ? 'Новый платёж' : 'Редактировать платёж'}
      >
        <div className="px-4 pb-8 space-y-4">
          <div>
            <label className="text-[13px] text-muted block mb-1">Название</label>
            <input
              type="text" value={oblName} onChange={(e) => setOblName(e.target.value)}
              className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
              placeholder="Аренда, МТС, коммуналка…"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[13px] text-muted block mb-1">Тип</label>
              <select
                value={oblKind} onChange={(e) => setOblKind(e.target.value)}
                className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
              >
                {Object.entries(KIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[13px] text-muted block mb-1">Чей</label>
              <select
                value={oblOwner} onChange={(e) => setOblOwner(e.target.value as User)}
                className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
              >
                <option value="him">Он</option>
                <option value="her">Она</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[13px] text-muted block mb-1">Сумма</label>
              <input
                type="number" inputMode="decimal" value={oblAmt} onChange={(e) => setOblAmt(e.target.value)}
                className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
                placeholder="0"
              />
            </div>
            <div className="flex-1">
              <label className="text-[13px] text-muted block mb-1">День (1–28)</label>
              <input
                type="number" inputMode="numeric" value={oblDay} onChange={(e) => setOblDay(e.target.value)}
                min={1} max={28}
                className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
                placeholder="15"
              />
            </div>
          </div>
          <button
            onClick={handleSaveObl}
            disabled={addOblMut.isPending || patchOblMut.isPending}
            className="w-full h-12 rounded-btn bg-primary text-surface font-semibold text-[15px] active:opacity-70 disabled:opacity-50"
          >
            {oblFormId === 'new' ? 'Добавить' : 'Сохранить'}
          </button>
          {typeof oblFormId === 'number' && (
            <button
              onClick={() => handleArchiveObl(oblFormId)}
              className="w-full h-11 rounded-btn bg-bg border border-[#E0DDD6] text-danger text-[14px] font-medium active:opacity-70"
            >
              Архивировать
            </button>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
