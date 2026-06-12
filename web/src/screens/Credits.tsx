import { useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { BottomSheet } from '../components/BottomSheet';
import { fmtMoney, monthStr } from '../utils/format';
import { useCredits, useUpsertCreditData, useSettings, useBills } from '../api/queries';
import type { User, CreditDataItem, CreditItem } from '../api/types';

const MONTHS_LOC = [
  'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
  'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре',
];

function fmtCloseMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `в ${MONTHS_LOC[m - 1]} ${y}`;
}

function fmtOpenedDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const monthDay = new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  return `${monthDay} ${y}`;
}


const STATUS_DOT: Record<string, string> = {
  paid: 'var(--ok)',
  due_soon: 'var(--amber)',
  overdue: 'var(--danger)',
  upcoming: 'var(--muted)',
};

interface Props {
  user: User;
  showToast: (msg: string) => void;
}

export function Credits({ user: _user, showToast }: Props) {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useCredits();
  const { data: settings } = useSettings();
  const { data: billsData } = useBills(monthStr());
  const currency = settings?.currencySymbol ?? '₽';
  const upsertMut = useUpsertCreditData();

  const [editItem, setEditItem] = useState<CreditItem | null>(null);

  const [bank, setBank] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [openedDate, setOpenedDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [principal, setPrincipal] = useState('');
  const [totalPayout, setTotalPayout] = useState('');
  const [monthsTotal, setMonthsTotal] = useState('');
  const [paymentsBefore, setPaymentsBefore] = useState('0');
  const [ratePercent, setRatePercent] = useState('');

  function openForm(item: CreditItem) {
    if (!item.noData) {
      const d = item as CreditDataItem;
      setBank(d.bank);
      setContractNumber(d.contractNumber ?? '');
      setOpenedDate(d.openedDate ?? '');
      setPurpose(d.purpose ?? '');
      setPrincipal(String(d.principal / 100));
      setTotalPayout(String(d.totalPayout / 100));
      setMonthsTotal(String(d.monthsTotal));
      setPaymentsBefore(String(d.paymentsBefore));
      setRatePercent(d.ratePercent != null ? String(d.ratePercent) : '');
    } else {
      setBank('');
      setContractNumber('');
      setOpenedDate('');
      setPurpose('');
      setPrincipal('');
      setTotalPayout('');
      setMonthsTotal('');
      setPaymentsBefore('0');
      setRatePercent('');
    }
    setEditItem(item);
  }

  function handleSave() {
    const p = Math.round(parseFloat(principal) * 100);
    const tp = Math.round(parseFloat(totalPayout) * 100);
    const mt = parseInt(monthsTotal);
    const pb = parseInt(paymentsBefore) || 0;
    const rp = ratePercent ? parseFloat(ratePercent) : undefined;

    if (!bank.trim()) { showToast('Укажите банк'); return; }
    if (isNaN(p) || p <= 0) { showToast('Укажите сумму кредита'); return; }
    if (isNaN(tp) || tp < p) { showToast('Сумма к возврату должна быть не меньше суммы кредита'); return; }
    if (isNaN(mt) || mt <= 0) { showToast('Укажите срок в платежах'); return; }
    if (pb > mt) { showToast('Платежей до учёта больше, чем срок кредита'); return; }

    upsertMut.mutate(
      {
        id: editItem!.id,
        body: {
          bank: bank.trim(),
          contractNumber: contractNumber.trim() || undefined,
          openedDate: openedDate || undefined,
          purpose: purpose.trim() || undefined,
          principal: p,
          totalPayout: tp,
          monthsTotal: mt,
          paymentsBefore: pb,
          ratePercent: rp,
        },
      },
      {
        onSuccess: () => { setEditItem(null); showToast('Данные сохранены'); },
        onError: (e) => showToast(e instanceof Error ? e.message : 'Ошибка'),
      },
    );
  }

  const billStatusMap = new Map(billsData?.items.map((b) => [b.id, b.status]));
  const dataItems = data?.items.filter((i): i is CreditDataItem => !i.noData);
  const noDataItems = data?.items.filter((i) => i.noData);
  const totalAnimated = useCountUp(data?.summary.totalLeftToPay ?? 0, 700);

  return (
    <div className="flex flex-col h-full overflow-y-auto screen-pb safe-top animate-fade">
      {/* Header */}
      <div className="flex items-center gap-1 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate('/bills')}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-bg text-muted -ml-1 flex-shrink-0"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-unbounded font-bold text-primary text-[18px]">Кредиты</h1>
      </div>

      {isLoading ? (
        <div className="mx-4 mt-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-surface rounded-card shadow-card p-4 space-y-3">
              <div className="skeleton h-5 w-40 rounded" />
              <div className="skeleton h-2 w-full rounded-full" />
              <div className="space-y-2">
                <div className="skeleton h-4 w-52 rounded" />
                <div className="skeleton h-4 w-44 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 px-6">
          <p className="text-[15px] text-muted text-center">Нет связи с сервером. Проверьте интернет.</p>
          <button
            onClick={() => void refetch()}
            className="h-12 px-6 rounded-btn bg-primary text-surface font-semibold text-[15px]"
          >
            Повторить
          </button>
        </div>
      ) : data ? (
        <>
          {/* Summary card */}
          {data.summary.count > 0 && (
            <>
              <div className="mx-4 mt-1 mb-3 bg-surface rounded-card shadow-card px-4 py-4">
                <p className="text-[12px] font-bold text-muted uppercase tracking-wide mb-1">Осталось выплатить</p>
                <p className="text-[42px] font-bold text-ink tabnum leading-none">
                  {fmtMoney(totalAnimated, currency)}
                </p>
                <p className="text-[13px] text-muted mt-1">
                  в месяц <span className="tabnum font-semibold text-ink">{fmtMoney(data.summary.monthlyLoad, currency)}</span>
                  {' · '}кредитов {data.summary.count}
                </p>
              </div>

              {/* «Станет легче» — нагрузка после каждого закрытия */}
              {dataItems && dataItems.length > 1 && (() => {
                // закрытия, отсортированные по дате
                const closures = dataItems
                  .filter((c) => c.closeMonth && c.paymentsLeft > 0)
                  .sort((a, b) => (a.closeMonth! < b.closeMonth! ? -1 : 1))
                  .map((c) => {
                    const [y, m] = c.closeMonth!.split('-').map(Number);
                    return {
                      label: `${MONTHS_LOC[m - 1].slice(0, 3)}'${String(y).slice(2)}`,
                      monthly: c.defaultAmount,
                    };
                  });
                if (closures.length === 0) return null;
                let load = data.summary.monthlyLoad;
                const steps: { label: string; value: number }[] = [{ label: 'сейчас', value: load }];
                for (const cl of closures) {
                  load = Math.max(0, load - cl.monthly);
                  steps.push({ label: `после ${cl.label}`, value: load });
                }
                const maxV = steps[0].value;
                return (
                  <div className="mx-4 mb-3 bg-surface rounded-card shadow-card px-4 pt-3 pb-4">
                    <p className="text-[14px] font-semibold text-ink mb-3">Станет легче</p>
                    <div className="flex items-end gap-2.5" style={{ height: 96 }}>
                      {steps.map((s, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                          <span className="tabnum text-[11px] font-semibold" style={{ color: s.value === 0 ? 'var(--ok)' : 'var(--ink)' }}>
                            {s.value === 0 ? 'свобода' : fmtMoney(s.value, currency)}
                          </span>
                          <div
                            className="w-full rounded-t-lg rounded-b animate-grow"
                            style={{
                              height: `${Math.max(6, (s.value / maxV) * 64)}px`,
                              background: i === 0 ? 'var(--amber)' : s.value === 0 ? 'var(--ok)' : 'var(--primary)',
                              opacity: i === 0 ? 1 : 0.9,
                              animationDelay: `${i * 80}ms`,
                            }}
                          />
                          <span className="text-[10px] text-muted text-center leading-tight">{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {/* Empty state */}
          {data.items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 gap-2">
              <p className="text-[15px] text-muted text-center">
                Добавьте кредит на вкладке Платежи — он появится здесь
              </p>
            </div>
          )}

          {/* Credit cards with data */}
          {dataItems && dataItems.length > 0 && (
            <div className="mx-4 space-y-3">
              {dataItems.map((item) => {
                const status = billStatusMap.get(item.id);
                const subtitle = [
                  item.contractNumber ? `№\u00A0${item.contractNumber}` : null,
                  item.openedDate ? `открыт ${fmtOpenedDate(item.openedDate)}` : null,
                  item.purpose || null,
                ]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <div key={item.id} className="bg-surface rounded-card shadow-card px-4 py-4">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        {status && (
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                            style={{ backgroundColor: STATUS_DOT[status] ?? 'var(--muted)' }}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-[16px] font-semibold text-ink truncate">{item.name}</p>
                          <p className="text-[13px] text-muted">{item.bank}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => openForm(item)}
                        className="flex-shrink-0 text-[13px] text-primary font-medium px-2 py-1 rounded-btn active:opacity-70"
                      >
                        Изменить
                      </button>
                    </div>

                    {subtitle ? (
                      <p className="text-[12px] text-muted mt-1 ml-[18px]">{subtitle}</p>
                    ) : null}

                    {/* Лента погашения */}
                    <div className="mt-3" aria-label={`выплачено ${item.paymentsMade} из ${item.monthsTotal}`}>
                      <div className="flex gap-[2px] flex-wrap">
                        {Array.from({ length: item.monthsTotal }, (_, i) => {
                          const isCurrent = i === item.paymentsMade && item.paymentsLeft > 0;
                          const isPaid = i < item.paymentsMade;
                          return (
                            <div
                              key={i}
                              className={isCurrent ? 'animate-ember' : ''}
                              style={{
                                width: `${Math.max(4, Math.min(10, Math.floor(100 / item.monthsTotal) - 1))}%`,
                                minWidth: 4,
                                maxWidth: 14,
                                height: 7,
                                borderRadius: 4,
                                background: isPaid
                                  ? 'var(--primary)'
                                  : isCurrent
                                  ? 'var(--amber)'
                                  : '#E7E5DE',
                              }}
                            />
                          );
                        })}
                      </div>
                      <p className="text-[12px] text-muted mt-1.5">
                        {item.paymentsLeft === 0
                          ? <span style={{ color: 'var(--ok)' }}>выплачен 🎉</span>
                          : <>выплачено <b>{item.paymentsMade}</b> из <b>{item.monthsTotal}</b>{item.closeMonth ? ` · закроется ${fmtCloseMonth(item.closeMonth)}` : ''}</>
                        }
                      </p>
                    </div>

                    {/* Detail rows */}
                    <div className="mt-3 space-y-1.5 text-[14px]">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted">Осталось выплатить</span>
                        <span className="font-semibold text-ink tabnum">{fmtMoney(item.leftToPay, currency)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted">Платежей осталось</span>
                        <span className="text-ink tabnum">{item.paymentsLeft}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted">Платёж</span>
                        <span className="text-ink tabnum">
                          {fmtMoney(item.defaultAmount, currency)} до {item.dueDay}-го
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted">Переплата по договору</span>
                        <span className="text-ink tabnum">{fmtMoney(item.overpay, currency)}</span>
                      </div>
                      {item.ratePercent != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted">Ставка</span>
                          <span className="text-ink">{item.ratePercent}\u00A0%</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* noData block */}
          {noDataItems && noDataItems.length > 0 && (
            <div className="mx-4 mt-3 mb-2">
              <p className="text-[13px] text-muted px-1 mb-2">Без данных договора</p>
              <div className="bg-surface rounded-card shadow-card divide-y divide-[#F0EFE9]">
                {noDataItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-ink truncate">{item.name}</p>
                      <p className="text-[12px] text-muted">
                        {fmtMoney(item.defaultAmount, currency)} до {item.dueDay}-го
                      </p>
                    </div>
                    <button
                      onClick={() => openForm(item)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-btn bg-primary text-surface text-[13px] font-medium active:opacity-70"
                    >
                      Заполнить
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Credit data form */}
      <BottomSheet
        open={editItem !== null}
        onClose={() => setEditItem(null)}
        title={editItem?.noData ? 'Данные договора' : 'Редактировать данные'}
      >
        <div className="px-4 pb-8 space-y-4">
          <div>
            <label className="text-[13px] text-muted block mb-1">Банк *</label>
            <input
              type="text"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
              placeholder="Сбер, Тинькофф…"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[13px] text-muted block mb-1">№ договора</label>
              <input
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
                placeholder="123-456"
              />
            </div>
            <div className="flex-1">
              <label className="text-[13px] text-muted block mb-1">Дата открытия</label>
              <input
                type="date"
                value={openedDate}
                onChange={(e) => setOpenedDate(e.target.value)}
                className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[14px] text-ink focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="text-[13px] text-muted block mb-1">Назначение</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
              placeholder="ремонт, телефон…"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[13px] text-muted block mb-1">Взяли (₽) *</label>
              <input
                type="number"
                inputMode="decimal"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
                placeholder="300 000"
              />
            </div>
            <div className="flex-1">
              <label className="text-[13px] text-muted block mb-1">Вернёте по графику (₽) *</label>
              <input
                type="number"
                inputMode="decimal"
                value={totalPayout}
                onChange={(e) => setTotalPayout(e.target.value)}
                className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
                placeholder="390 000"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[13px] text-muted block mb-1">Срок (платежей) *</label>
              <input
                type="number"
                inputMode="numeric"
                value={monthsTotal}
                onChange={(e) => setMonthsTotal(e.target.value)}
                className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
                placeholder="36"
              />
            </div>
            <div className="flex-1">
              <label className="text-[13px] text-muted block mb-1">Внесено до «Очага»</label>
              <input
                type="number"
                inputMode="numeric"
                value={paymentsBefore}
                onChange={(e) => setPaymentsBefore(e.target.value)}
                className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="text-[13px] text-muted block mb-1">Ставка % (необязательно)</label>
            <input
              type="number"
              inputMode="decimal"
              value={ratePercent}
              onChange={(e) => setRatePercent(e.target.value)}
              className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
              placeholder="14.9"
            />
          </div>
          <p className="text-[12px] text-muted">Эти числа есть в договоре или графике платежей</p>
          <button
            onClick={handleSave}
            disabled={upsertMut.isPending}
            className="w-full h-12 rounded-btn bg-primary text-surface font-semibold text-[15px] active:opacity-70 disabled:opacity-50"
          >
            Сохранить
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
