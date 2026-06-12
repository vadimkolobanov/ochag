import { useState, useRef } from 'react';
import { PiggyBank, Plus, Minus } from 'lucide-react';
import { BottomSheet } from '../components/BottomSheet';
import { Pinpad, pinpadToKopecks } from '../components/Pinpad';
import { fmtMoney, fmtDateShort, todayStr } from '../utils/format';
import { useSavings, useSettings, useAddSavingsTx, useDeleteSavingsTx } from '../api/queries';
import type { User, SavingsTx, SavingsCurrency, SavingsByn } from '../api/types';

interface Props {
  user: User;
  showToast: (msg: string, action?: { label: string; onClick: () => void }) => void;
}

const CURRENCY_SYMBOLS: Record<SavingsCurrency, string> = {
  RUB: '₽',
  EUR: '€',
  USD: '$',
};

const CURRENCIES: SavingsCurrency[] = ['RUB', 'EUR', 'USD'];

function CurrencyChips({
  value,
  onChange,
}: {
  value: SavingsCurrency;
  onChange: (c: SavingsCurrency) => void;
}) {
  return (
    <div className="flex gap-2 px-4 pb-3">
      {CURRENCIES.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`h-9 px-4 rounded-btn font-semibold text-[15px] transition-colors active:opacity-70
            ${value === c ? 'bg-primary text-surface' : 'bg-bg text-ink'}`}
        >
          {CURRENCY_SYMBOLS[c]}
        </button>
      ))}
    </div>
  );
}

function RatesCard({ byn, mainCurrency }: { byn: SavingsByn; mainCurrency: string }) {
  const d = new Date(byn.updatedAt);
  const dateLabel = Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const cells: [SavingsCurrency, string][] = [
    ['USD', '$'],
    ['EUR', '€'],
    ['RUB', mainCurrency],
  ];
  return (
    <div className="mx-4 mb-5">
      <div className="bg-surface rounded-card shadow-card px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-bold text-muted uppercase tracking-wide">
            Курс покупки · Брест
          </span>
          {dateLabel && (
            <span className="text-[11px] text-muted">
              {dateLabel}
              {byn.stale ? ' · ↻' : ''}
            </span>
          )}
        </div>
        <div className="flex justify-between gap-2">
          {cells.map(([cur, sym]) => {
            const r = byn.rates[cur];
            return (
              <div key={cur} className="flex flex-col items-center flex-1">
                <span className="text-[12px] text-muted">
                  {r.unit === 1 ? '1' : r.unit} {sym}
                </span>
                <span className="tabnum text-[15px] font-semibold text-ink">{r.buy} Br</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TxItem({
  tx,
  onDelete,
}: {
  tx: SavingsTx;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const canDelete = tx.income_id === null;
  const sym = CURRENCY_SYMBOLS[tx.currency] ?? '₽';

  function startPress(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    if (canDelete) {
      timerRef.current = setTimeout(() => { setConfirm(true); timerRef.current = null; }, 500);
    }
  }

  function endPress(e: React.PointerEvent) {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (canDelete && startRef.current) {
      const dx = startRef.current.x - e.clientX;
      const dy = Math.abs(startRef.current.y - e.clientY);
      if (dx > 60 && dy < 30) setConfirm(true);
    }
    startRef.current = null;
  }

  function cancelPress() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    startRef.current = null;
  }

  const isDeposit = tx.type === 'deposit';
  const label = tx.income_id != null
    ? `Из зарплаты ${tx.user === 'him' ? 'Его' : 'Её'}`
    : tx.purpose ?? (isDeposit ? 'Пополнение' : 'Снятие');

  if (confirm) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-bg">
        <span className="flex-1 text-[14px] font-medium text-ink truncate">
          Удалить {isDeposit ? 'пополнение' : 'снятие'}?
        </span>
        <button
          onClick={() => { setConfirm(false); onDelete(); }}
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
      className="flex items-center gap-3 px-4 py-3 active:bg-bg transition-colors select-none"
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerCancel={cancelPress}
      onPointerLeave={cancelPress}
    >
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[18px] font-bold"
        style={{
          backgroundColor: isDeposit ? 'rgba(60,165,92,0.12)' : 'rgba(192,57,43,0.1)',
          color: isDeposit ? 'var(--ok)' : 'var(--danger)',
        }}
      >
        {isDeposit ? '+' : '−'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-ink truncate">{label}</div>
        <div className="text-[12px] text-muted">{fmtDateShort(tx.date)}</div>
      </div>
      <span
        className="text-[15px] font-semibold tabnum"
        style={{ color: isDeposit ? 'var(--ok)' : 'var(--danger)' }}
      >
        {isDeposit ? '+' : '−'}{fmtMoney(tx.amount, sym)}
      </span>
    </div>
  );
}

export function Savings({ user, showToast }: Props) {
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [purpose, setPurpose] = useState('');
  const [currency, setCurrency] = useState<SavingsCurrency>('RUB');

  const { data, isLoading, isError, refetch } = useSavings();
  const { data: settings } = useSettings();
  const mainCurrency = settings?.currencySymbol ?? '₽';
  const addTx = useAddSavingsTx();
  const deleteTx = useDeleteSavingsTx();

  function resetForm() { setPinValue(''); setPurpose(''); setCurrency('RUB'); }

  const activeSym = CURRENCY_SYMBOLS[currency];

  function handleDeposit() {
    const amt = pinpadToKopecks(pinValue);
    if (!amt) { showToast('Введите сумму'); return; }
    addTx.mutate(
      { type: 'deposit', user, date: todayStr(), amount: amt, currency },
      {
        onSuccess: () => { setDepositOpen(false); resetForm(); showToast('Пополнено'); },
        onError: (e) => showToast(e instanceof Error ? e.message : 'Ошибка'),
      },
    );
  }

  function handleWithdraw() {
    const amt = pinpadToKopecks(pinValue);
    if (!amt) { showToast('Введите сумму'); return; }
    if (!purpose.trim()) { showToast('Укажите цель снятия'); return; }
    addTx.mutate(
      { type: 'withdrawal', user, date: todayStr(), amount: amt, currency, purpose: purpose.trim() },
      {
        onSuccess: () => { setWithdrawOpen(false); resetForm(); showToast('Снято'); },
        onError: (e) => showToast(e instanceof Error ? e.message : 'Ошибка'),
      },
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-32 safe-top">
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-unbounded font-bold text-primary text-[18px]">Копилка</h1>
      </div>

      {isLoading ? (
        <div className="mx-4 mt-4 space-y-4">
          <div className="skeleton h-14 w-48 rounded mx-auto" />
          <div className="flex gap-3">
            <div className="skeleton flex-1 h-12 rounded-btn" />
            <div className="skeleton flex-1 h-12 rounded-btn" />
          </div>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 px-6">
          <p className="text-[15px] text-muted text-center">Нет связи с сервером. Проверьте интернет.</p>
          <button onClick={() => void refetch()} className="h-12 px-6 rounded-btn bg-primary text-surface font-semibold text-[15px]">Повторить</button>
        </div>
      ) : data ? (
        <>
          {/* Balances */}
          <div className="flex flex-col items-center py-5 gap-2">
            <div className="flex items-center gap-2">
              <PiggyBank size={18} style={{ color: 'var(--amber)' }} />
              <span className="text-[12px] font-bold text-muted uppercase tracking-wide">Накоплено</span>
            </div>
            {data.byn ? (
              <>
                <span
                  className="tabnum font-bold leading-tight text-[44px]"
                  style={{ color: 'var(--amber)' }}
                >
                  {fmtMoney(data.byn.total, 'Br')}
                </span>
                <div className="flex flex-col items-center gap-0.5 mt-1">
                  {CURRENCIES.map((cur) => {
                    const bal = data.balances[cur];
                    if (bal === 0) return null;
                    const sym = cur === 'RUB' ? 'Br' : CURRENCY_SYMBOLS[cur];
                    return (
                      <span key={cur} className="tabnum text-[18px] font-semibold text-muted">
                        {fmtMoney(bal, sym)}
                      </span>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1">
                {CURRENCIES.map((cur) => {
                  const bal = data.balances[cur];
                  const sym = cur === 'RUB' ? mainCurrency : CURRENCY_SYMBOLS[cur];
                  if (bal === 0 && cur !== 'RUB') return null;
                  return (
                    <span
                      key={cur}
                      className={`tabnum font-bold leading-tight ${cur === 'RUB' ? 'text-[44px]' : 'text-[28px]'}`}
                      style={{ color: 'var(--amber)' }}
                    >
                      {fmtMoney(bal, sym)}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Exchange rates */}
          {data.byn && <RatesCard byn={data.byn} mainCurrency={mainCurrency} />}

          {/* Action buttons */}
          <div className="mx-4 flex gap-3 mb-5">
            <button
              onClick={() => { resetForm(); setDepositOpen(true); }}
              className="flex-1 h-12 rounded-btn bg-primary text-surface font-semibold text-[14px] flex items-center justify-center gap-2 active:opacity-70"
            >
              <Plus size={18} /> Пополнить
            </button>
            <button
              onClick={() => { resetForm(); setWithdrawOpen(true); }}
              className="flex-1 h-12 rounded-btn bg-surface shadow-card text-ink font-semibold text-[14px] flex items-center justify-center gap-2 active:opacity-70"
            >
              <Minus size={18} /> Снять
            </button>
          </div>

          {/* History */}
          {data.items.length === 0 ? (
            <div className="flex flex-col items-center py-12 px-6">
              <p className="text-[15px] text-muted text-center">Пополните копилку, чтобы начать накапливать</p>
            </div>
          ) : (
            <div className="mx-4">
              <h2 className="text-[13px] font-bold text-muted uppercase tracking-wide mb-2">История</h2>
              <div className="bg-surface rounded-card shadow-card divide-y divide-[#F0EFE9]">
                {data.items.map((tx) => (
                  <TxItem
                    key={tx.id}
                    tx={tx}
                    onDelete={() =>
                      deleteTx.mutate(tx.id, {
                        onSuccess: () => showToast('Удалено'),
                        onError: (e) => showToast(e instanceof Error ? e.message : 'Ошибка'),
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Deposit sheet */}
      <BottomSheet open={depositOpen} onClose={() => setDepositOpen(false)} title="Пополнить копилку">
        <CurrencyChips value={currency} onChange={(c) => { setCurrency(c); setPinValue(''); }} />
        <Pinpad value={pinValue} onChange={setPinValue} currency={activeSym} />
        <div className="px-4 pb-8 pt-2">
          <button
            onClick={handleDeposit}
            disabled={!pinValue || addTx.isPending}
            className="w-full h-14 rounded-btn bg-primary text-surface font-semibold text-[16px] active:opacity-70 disabled:opacity-40"
          >
            {addTx.isPending ? 'Сохраняем…' : 'Пополнить'}
          </button>
        </div>
      </BottomSheet>

      {/* Withdraw sheet */}
      <BottomSheet open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title="Снять из копилки">
        <CurrencyChips value={currency} onChange={(c) => { setCurrency(c); setPinValue(''); }} />
        <Pinpad value={pinValue} onChange={setPinValue} currency={activeSym} />
        <div className="px-4 pb-8 pt-2 space-y-3">
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="На что? — например: дача, маме лекарства"
            className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleWithdraw}
            disabled={!pinValue || !purpose.trim() || addTx.isPending}
            className="w-full h-14 rounded-btn bg-primary text-surface font-semibold text-[16px] active:opacity-70 disabled:opacity-40"
          >
            {addTx.isPending ? 'Сохраняем…' : 'Снять'}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
