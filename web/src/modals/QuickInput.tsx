import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomSheet } from '../components/BottomSheet';
import { Pinpad, pinpadToKopecks } from '../components/Pinpad';
import { CategoryGrid } from '../components/CategoryGrid';
import { todayStr } from '../utils/format';
import {
  useAddExpense,
  useAddIncome,
  useAddTransfer,
  useCategories,
  useUnpaidBillsSum,
} from '../api/queries';
import type { User, IncomeSource } from '../api/types';

type Tab = 'expense' | 'income' | 'transfer';

interface Props {
  open: boolean;
  onClose: () => void;
  user: User;
  currency: string;
  initialTab?: Tab;
  showToast: (msg: string, action?: { label: string; onClick: () => void }) => void;
}

const SOURCE_LABELS: Record<IncomeSource, string> = {
  salary: 'Зарплата',
  advance: 'Аванс',
  nails: 'Маникюр',
  other: 'Другое',
};

/* ─────────────────────────────────────────────────────────────────
   Вкладка «Трата»
───────────────────────────────────────────────────────────────── */
function ExpenseTab({
  user,
  currency,
  onSuccess,
}: {
  user: User;
  currency: string;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const { data: categories = [] } = useCategories();
  const addExpense = useAddExpense(user);

  function save(categoryId: number) {
    const kopecks = pinpadToKopecks(amount);
    if (kopecks <= 0) return;
    addExpense.mutate(
      { user, date, amount: kopecks, categoryId },
      { onSuccess },
    );
  }

  return (
    <div className="px-0 pb-4">
      {/* Дата (тапабельная) */}
      <div className="flex justify-center mb-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-[13px] text-muted font-medium bg-transparent border-none outline-none text-center cursor-pointer"
        />
      </div>

      <Pinpad value={amount} onChange={setAmount} currency={currency} />

      <div className="mt-4">
        <CategoryGrid
          categories={categories}
          onSelect={(cat) => save(cat.id)}
          disabled={addExpense.isPending || pinpadToKopecks(amount) <= 0}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Вкладка «Доход»
───────────────────────────────────────────────────────────────── */
function IncomeTab({
  user,
  currency,
  onSuccess,
  showToast,
}: {
  user: User;
  currency: string;
  onSuccess: () => void;
  showToast: Props['showToast'];
}) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<IncomeSource>('salary');
  const [date, setDate] = useState(todayStr());
  const [toBills, setToBills] = useState('');
  const [toSavings, setToSavings] = useState('');
  const [toDaily, setToDaily] = useState('');
  const [step, setStep] = useState<'amount' | 'distribute'>('amount');

  const unpaidBillsKopecks = useUnpaidBillsSum();
  const addIncome = useAddIncome(user);

  const totalKopecks = pinpadToKopecks(amount);

  // Автозаполнение при переходе к шагу распределения
  useEffect(() => {
    if (step !== 'distribute') return;
    const bills = Math.min(unpaidBillsKopecks, totalKopecks);
    const billsRub = Math.floor(bills / 100);
    setToBills(billsRub > 0 ? String(billsRub) : '');
    setToSavings('');
    const remaining = totalKopecks - bills;
    setToDaily(String(Math.floor(remaining / 100)));
  }, [step, unpaidBillsKopecks, totalKopecks]);

  // Если Маникюр — всё в повседневные
  useEffect(() => {
    if (source === 'nails' && step === 'distribute') {
      setToBills('');
      setToSavings('');
      setToDaily(String(Math.floor(totalKopecks / 100)));
    }
  }, [source, step, totalKopecks]);

  function setAllToDaily() {
    setToBills('');
    setToSavings('');
    setToDaily(String(Math.floor(totalKopecks / 100)));
  }

  const billsK = pinpadToKopecks(toBills);
  const savingsK = pinpadToKopecks(toSavings);
  const dailyK = pinpadToKopecks(toDaily);
  const sumOk = billsK + savingsK + dailyK === totalKopecks;

  // Пересчёт «Себе» при изменении платежей/копилки
  function updateField(field: 'bills' | 'savings', val: string) {
    const v = pinpadToKopecks(val);
    const other = field === 'bills' ? savingsK : billsK;
    const rest = Math.max(0, totalKopecks - v - other);
    if (field === 'bills') {
      setToBills(val);
      setToDaily(String(Math.floor(rest / 100)));
    } else {
      setToSavings(val);
      setToDaily(String(Math.floor(rest / 100)));
    }
  }

  function distribute() {
    if (!sumOk) return;
    addIncome.mutate(
      {
        user,
        date,
        source,
        amount: totalKopecks,
        toDaily: dailyK,
        toSavings: savingsK,
        toBills: billsK,
      },
      {
        onSuccess: () => {
          onSuccess();
          if (billsK > 0) {
            showToast('Доход записан', {
              label: 'Перейти к платежам →',
              onClick: () => navigate('/bills'),
            });
          }
        },
        onError: (e) =>
          showToast(e instanceof Error ? e.message : 'Ошибка'),
      },
    );
  }

  if (step === 'amount') {
    return (
      <div className="px-0 pb-4">
        {/* Дата */}
        <div className="flex justify-center mb-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-[13px] text-muted font-medium bg-transparent border-none outline-none text-center cursor-pointer"
          />
        </div>

        <Pinpad value={amount} onChange={setAmount} currency={currency} />

        {/* Источник */}
        <div className="px-4 mt-4 flex gap-2 flex-wrap">
          {(Object.keys(SOURCE_LABELS) as IncomeSource[]).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`px-3 py-1.5 rounded-btn text-[13px] font-medium transition-colors ${
                source === s
                  ? 'bg-primary text-surface'
                  : 'bg-bg text-ink'
              }`}
            >
              {SOURCE_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="px-4 mt-4">
          <button
            disabled={totalKopecks <= 0}
            onClick={() => setStep('distribute')}
            className="w-full h-14 rounded-btn bg-primary text-surface font-semibold text-[16px] disabled:opacity-50 active:opacity-80 transition-opacity"
          >
            Далее — распределить
          </button>
        </div>
      </div>
    );
  }

  // Шаг распределения
  return (
    <div className="px-4 pb-4">
      <button
        onClick={() => setStep('amount')}
        className="text-[13px] text-muted mb-3 active:opacity-70"
      >
        ← Назад
      </button>

      <div className="text-center text-[15px] font-medium text-muted mb-4">
        Распределить{' '}
        <span className="text-ink font-bold tabnum">
          {Math.floor(totalKopecks / 100).toLocaleString('ru-RU').replace(/\s/g, '\u202F')}{' '}{currency}
        </span>
      </div>

      {/* Поля распределения — порядок из §9.2: Платежи → Копилка → Себе */}
      <div className="flex flex-col gap-3">
        {[
          {
            label: 'На платежи',
            value: toBills,
            onChange: (v: string) => updateField('bills', v),
          },
          {
            label: 'В копилку',
            value: toSavings,
            onChange: (v: string) => updateField('savings', v),
          },
          {
            label: 'Себе на повседневные',
            value: toDaily,
            onChange: (v: string) => setToDaily(v),
            readOnly: false,
          },
        ].map(({ label, value, onChange }) => (
          <div key={label}>
            <label className="text-[13px] font-medium text-muted mb-1 block">{label}</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-12 px-4 pr-14 rounded-btn bg-bg border border-[#E0DFD9] text-[16px] font-semibold text-ink tabnum outline-none focus:border-primary transition-colors"
                placeholder="0"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-medium text-muted">
                {currency}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Остаток / несходимость */}
      {!sumOk && totalKopecks > 0 && (
        <p className="text-[13px] text-danger font-medium mt-2">
          Сумма распределения не сходится с доходом
        </p>
      )}

      {/* Ярлык «всё в повседневные» */}
      <button
        onClick={setAllToDaily}
        className="text-[13px] text-primary font-semibold mt-3 active:opacity-70"
      >
        Всё в повседневные
      </button>

      <button
        disabled={!sumOk || addIncome.isPending}
        onClick={distribute}
        className="w-full h-14 rounded-btn bg-primary text-surface font-semibold text-[16px] disabled:opacity-50 active:opacity-80 transition-opacity mt-4"
      >
        {addIncome.isPending ? 'Сохраняем…' : 'Распределить'}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Вкладка «Перевод»
───────────────────────────────────────────────────────────────── */
function TransferTab({
  user,
  currency,
  onSuccess,
  showToast,
}: {
  user: User;
  currency: string;
  onSuccess: () => void;
  showToast: Props['showToast'];
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  // По умолчанию направление от текущего пользователя к другому
  const other: User = user === 'him' ? 'her' : 'him';
  const [fromUser, setFromUser] = useState<User>(user);
  const toUser: User = fromUser === 'him' ? 'her' : 'him';

  const addTransfer = useAddTransfer(user);

  function save() {
    const kopecks = pinpadToKopecks(amount);
    if (kopecks <= 0) return;
    addTransfer.mutate(
      { fromUser, toUser, date, amount: kopecks },
      {
        onSuccess,
        onError: (e) => showToast(e instanceof Error ? e.message : 'Ошибка'),
      },
    );
  }

  const fromLabel = fromUser === 'him' ? 'Он' : 'Она';
  const toLabel = toUser === 'him' ? 'Он' : 'Она';

  return (
    <div className="px-4 pb-4">
      {/* Дата */}
      <div className="flex justify-center mb-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-[13px] text-muted font-medium bg-transparent border-none outline-none text-center cursor-pointer"
        />
      </div>

      {/* Направление */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          onClick={() => setFromUser(fromUser === 'him' ? 'her' : 'him')}
          className="flex items-center gap-2 bg-bg rounded-btn px-4 py-2 active:opacity-70 transition-opacity"
        >
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-surface font-bold text-[13px]"
            style={{ backgroundColor: fromUser === 'him' ? 'var(--him)' : 'var(--her)' }}
          >
            {fromLabel}
          </span>
          <span className="text-[14px] font-medium text-ink">→</span>
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-surface font-bold text-[13px]"
            style={{ backgroundColor: toUser === 'him' ? 'var(--him)' : 'var(--her)' }}
          >
            {toLabel}
          </span>
          <span className="text-[12px] text-muted ml-1">поменять</span>
        </button>
      </div>

      <Pinpad value={amount} onChange={setAmount} currency={currency} />

      <button
        disabled={pinpadToKopecks(amount) <= 0 || addTransfer.isPending}
        onClick={save}
        className="w-full h-14 rounded-btn bg-primary text-surface font-semibold text-[16px] disabled:opacity-50 active:opacity-80 transition-opacity mt-4"
      >
        {addTransfer.isPending ? 'Сохраняем…' : 'Перевести'}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   QuickInput — основной компонент
───────────────────────────────────────────────────────────────── */
const TAB_LABELS: Record<Tab, string> = {
  expense: 'Трата',
  income: 'Доход',
  transfer: 'Перевод',
};

export function QuickInput({ open, onClose, user, currency, initialTab = 'expense', showToast }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  // Сброс при открытии
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  function handleSuccess() {
    showToast('Записано');
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* Вкладки */}
      <div className="flex border-b border-[#F0EFE9] mx-4 mb-2">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 pb-2 pt-1 text-[14px] font-semibold transition-colors ${
              tab === t
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'expense' && (
        <ExpenseTab user={user} currency={currency} onSuccess={handleSuccess} />
      )}
      {tab === 'income' && (
        <IncomeTab user={user} currency={currency} onSuccess={handleSuccess} showToast={showToast} />
      )}
      {tab === 'transfer' && (
        <TransferTab user={user} currency={currency} onSuccess={handleSuccess} showToast={showToast} />
      )}
    </BottomSheet>
  );
}
