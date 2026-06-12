import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CategoryIcon, ICON_NAMES } from '../components/CategoryGrid';
import {
  useSettings, useUpdateSettings,
  useCategories, useAddCategory, usePatchCategory,
} from '../api/queries';
import { CODE_KEY, USER_KEY } from '../api/client';
import type { Category } from '../api/types';

const CURRENCY_PRESETS = ['₽', '€', '$'];

interface Props {
  showToast: (msg: string) => void;
}

function DayChips({ days, onChange }: { days: number[]; onChange: (d: number[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => {
        const active = days.includes(d);
        return (
          <button
            key={d}
            onClick={() => onChange(active ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b))}
            className={`w-9 h-9 rounded-full text-[13px] font-semibold transition-colors active:opacity-70
              ${active ? 'bg-primary text-surface' : 'bg-bg text-muted'}`}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

export function Settings({ showToast }: Props) {
  const navigate = useNavigate();
  const { data: serverSettings } = useSettings();
  const { data: categories } = useCategories();
  const updateSettings = useUpdateSettings();
  const addCategory = useAddCategory();
  const patchCategory = usePatchCategory();

  const [currency, setCurrency] = useState('₽');
  const [customCurrency, setCustomCurrency] = useState('');
  const [paydayHim, setPaydayHim] = useState<number[]>([19]);
  const [paydayHer, setPaydayHer] = useState<number[]>([10, 25]);
  const [dirty, setDirty] = useState(false);

  const [addCatName, setAddCatName] = useState('');
  const [addCatIcon, setAddCatIcon] = useState('circle-ellipsis');
  const [addCatOpen, setAddCatOpen] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!serverSettings) return;
    const sym = serverSettings.currencySymbol;
    if (CURRENCY_PRESETS.includes(sym)) {
      setCurrency(sym);
      setCustomCurrency('');
    } else {
      setCurrency('custom');
      setCustomCurrency(sym);
    }
    setPaydayHim(serverSettings.paydayHim);
    setPaydayHer(serverSettings.paydayHer);
    setDirty(false);
  }, [serverSettings]);

  function effectiveCurrency() {
    return currency === 'custom' ? customCurrency : currency;
  }

  function handleSave() {
    const sym = effectiveCurrency().trim();
    if (!sym) { showToast('Укажите символ валюты'); return; }
    if (paydayHim.length === 0) { showToast('Укажите хотя бы один день зарплаты (Он)'); return; }
    if (paydayHer.length === 0) { showToast('Укажите хотя бы один день зарплаты (Она)'); return; }
    updateSettings.mutate(
      { currencySymbol: sym, paydayHim, paydayHer },
      {
        onSuccess: () => { showToast('Сохранено'); setDirty(false); },
        onError: (e) => showToast(e instanceof Error ? e.message : 'Ошибка'),
      },
    );
  }

  function handleAddCategory() {
    if (!addCatName.trim()) { showToast('Укажите название'); return; }
    addCategory.mutate(
      { name: addCatName.trim(), icon: addCatIcon },
      {
        onSuccess: () => {
          setAddCatName('');
          setAddCatIcon('circle-ellipsis');
          setAddCatOpen(false);
          showToast('Категория добавлена');
        },
        onError: (e) => showToast(e instanceof Error ? e.message : 'Ошибка'),
      },
    );
  }

  function handleArchiveCat(cat: Category) {
    if (!confirm(`Архивировать «${cat.name}»? Она не будет показана в форме трат.`)) return;
    patchCategory.mutate(
      { id: cat.id, body: { isActive: false } },
      {
        onSuccess: () => showToast('Архивировано'),
        onError: (e) => showToast(e instanceof Error ? e.message : 'Ошибка'),
      },
    );
  }

  async function handleExport() {
    try {
      const res = await fetch('/api/export', {
        headers: { 'x-ochag-code': localStorage.getItem(CODE_KEY) ?? '' },
      });
      if (!res.ok) { showToast('Ошибка экспорта'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const disp = res.headers.get('Content-Disposition') ?? '';
      const m = disp.match(/filename="([^"]+)"/);
      a.href = url;
      a.download = m?.[1] ?? 'ochag-backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Резервная копия скачана');
    } catch {
      showToast('Ошибка при скачивании');
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Текущие данные будут полностью заменены резервной копией. Продолжить?')) {
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ochag-code': localStorage.getItem(CODE_KEY) ?? '',
          },
          body: JSON.stringify(json),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          showToast(body.error ?? 'Ошибка импорта');
        } else {
          showToast('Данные восстановлены');
          window.location.reload();
        }
      } catch {
        showToast('Неверный формат файла');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function logout() {
    if (confirm('Выйти? Код и профиль будут удалены с этого устройства.')) {
      localStorage.removeItem(CODE_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.reload();
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-32 safe-top">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-bg text-muted"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-unbounded font-bold text-primary text-[18px]">Настройки</h1>
      </div>

      <div className="space-y-6 px-4 py-2">
        {/* Currency */}
        <section>
          <h2 className="text-[13px] font-bold text-muted uppercase tracking-wide mb-2">Валюта</h2>
          <div className="flex gap-2 flex-wrap">
            {CURRENCY_PRESETS.map((sym) => (
              <button
                key={sym}
                onClick={() => { setCurrency(sym); setDirty(true); }}
                className={`h-10 px-5 rounded-btn font-semibold text-[16px] transition-colors active:opacity-70
                  ${currency === sym ? 'bg-primary text-surface' : 'bg-surface shadow-card text-ink'}`}
              >
                {sym}
              </button>
            ))}
            <button
              onClick={() => { setCurrency('custom'); setDirty(true); }}
              className={`h-10 px-4 rounded-btn font-semibold text-[14px] transition-colors active:opacity-70
                ${currency === 'custom' ? 'bg-primary text-surface' : 'bg-surface shadow-card text-ink'}`}
            >
              Своя
            </button>
          </div>
          {currency === 'custom' && (
            <input
              type="text" value={customCurrency} maxLength={3}
              onChange={(e) => { setCustomCurrency(e.target.value); setDirty(true); }}
              className="mt-2 h-11 px-3 w-28 rounded-btn bg-surface border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
              placeholder="₿"
            />
          )}
        </section>

        {/* Payday Him */}
        <section>
          <h2 className="text-[13px] font-bold text-muted uppercase tracking-wide">Дни зарплаты — Он</h2>
          <DayChips days={paydayHim} onChange={(d) => { setPaydayHim(d); setDirty(true); }} />
        </section>

        {/* Payday Her */}
        <section>
          <h2 className="text-[13px] font-bold text-muted uppercase tracking-wide">Дни зарплаты — Она</h2>
          <DayChips days={paydayHer} onChange={(d) => { setPaydayHer(d); setDirty(true); }} />
        </section>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!dirty || updateSettings.isPending}
          className="w-full h-12 rounded-btn bg-primary text-surface font-semibold text-[15px] active:opacity-70 disabled:opacity-40"
        >
          {updateSettings.isPending ? 'Сохраняем…' : 'Сохранить'}
        </button>

        {/* Categories */}
        <section>
          <h2 className="text-[13px] font-bold text-muted uppercase tracking-wide mb-2">Категории трат</h2>
          <div className="bg-surface rounded-card shadow-card divide-y divide-[#F0EFE9]">
            {categories?.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-primary flex-shrink-0">
                  <CategoryIcon name={cat.icon} size={20} />
                </span>
                <span className="flex-1 text-[15px] font-medium text-ink">{cat.name}</span>
                <button
                  onClick={() => handleArchiveCat(cat)}
                  className="w-8 h-8 flex items-center justify-center rounded-full active:bg-bg text-muted"
                  aria-label={`Архивировать ${cat.name}`}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          {addCatOpen ? (
            <div className="bg-surface rounded-card shadow-card mt-2 px-4 py-4 space-y-3">
              <input
                type="text" value={addCatName} onChange={(e) => setAddCatName(e.target.value)}
                className="w-full h-11 px-3 rounded-btn bg-bg border border-[#E0DDD6] text-[15px] text-ink focus:outline-none focus:border-primary"
                placeholder="Название категории"
              />
              <div className="flex flex-wrap gap-2">
                {ICON_NAMES.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setAddCatIcon(icon)}
                    className={`w-10 h-10 rounded-btn flex items-center justify-center transition-colors active:opacity-70
                      ${addCatIcon === icon ? 'bg-primary text-surface' : 'bg-bg text-ink'}`}
                  >
                    <CategoryIcon name={icon} size={20} />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddCategory}
                  disabled={addCategory.isPending}
                  className="flex-1 h-11 rounded-btn bg-primary text-surface font-semibold text-[14px] active:opacity-70 disabled:opacity-50"
                >
                  Добавить
                </button>
                <button
                  onClick={() => setAddCatOpen(false)}
                  className="h-11 px-4 rounded-btn bg-bg text-muted font-medium text-[14px] active:opacity-70"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddCatOpen(true)}
              className="mt-2 w-full h-11 rounded-btn bg-bg border border-dashed border-[#C0BDB5] text-muted text-[14px] font-medium flex items-center justify-center gap-2 active:opacity-70"
            >
              <Plus size={16} /> Добавить категорию
            </button>
          )}
        </section>

        {/* Export / Import */}
        <section className="bg-surface rounded-card shadow-card divide-y divide-[#F0EFE9]">
          <button
            onClick={() => void handleExport()}
            className="w-full px-4 py-4 text-left text-[15px] font-medium text-ink active:bg-bg transition-colors rounded-t-card"
          >
            Скачать резервную копию (JSON)
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="w-full px-4 py-4 text-left text-[15px] font-medium text-ink active:bg-bg transition-colors rounded-b-card"
          >
            Восстановить из копии…
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
        </section>

        {/* Code note */}
        <p className="text-[12px] text-muted text-center leading-relaxed">
          Семейный код можно изменить только через переменную окружения{' '}
          <span className="font-mono">OCHAG_CODE</span> на сервере.
        </p>

        {/* Logout */}
        <div className="bg-surface rounded-card shadow-card">
          <button
            onClick={logout}
            className="w-full px-4 py-4 text-left text-[15px] font-medium text-danger active:bg-bg transition-colors rounded-card"
          >
            Выйти
          </button>
        </div>

        {/* Version */}
        <p className="text-[12px] text-muted text-center pb-2">Очаг v1.0.0</p>
      </div>
    </div>
  );
}
