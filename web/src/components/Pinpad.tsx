import { Delete } from 'lucide-react';

interface Props {
  value: string;           // строка цифр, напр. «320» или «320,50»
  onChange: (v: string) => void;
  currency: string;
}

/**
 * Крупная экранная клавиатура-пинпад (§9.2).
 * value — строка в рублях: «320» → 32000 копеек; «320,50» → 32050 копеек.
 */
export function Pinpad({ value, onChange, currency }: Props) {
  const hasFrac = value.includes(',');

  function press(key: string) {
    if (key === 'del') {
      if (value.length <= 1) { onChange(''); return; }
      // Убрать запятую вместе с дробью если стираем с конца дроби до запятой
      const next = value.slice(0, -1);
      onChange(next.endsWith(',') ? next.slice(0, -1) : next);
      return;
    }
    if (key === ',') {
      if (!hasFrac && value.length > 0) onChange(value + ',');
      return;
    }
    // Цифра
    if (hasFrac) {
      const [, frac = ''] = value.split(',');
      if (frac.length >= 2) return; // макс 2 знака после запятой
      onChange(value + key);
    } else {
      if (value === '' && key === '0') return; // ведущий ноль запрещён
      if (value.length >= 8) return;           // не больше 99 999 999 руб
      onChange(value + key);
    }
  }

  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [',', '0', 'del'],
  ] as const;

  const display = value || '0';
  const parts = display.split(',');
  const whole = Number(parts[0]).toLocaleString('ru-RU').replace(/\s/g, '\u202F');
  const frac = parts[1] ?? null;
  const hasValue = value !== '';

  return (
    <div className="flex flex-col gap-3 px-2">
      {/* Дисплей суммы */}
      <div className="flex items-baseline justify-center gap-1 min-h-[56px]">
        <span
          className="tabnum font-bold leading-none"
          style={{ fontSize: 44, color: hasValue ? 'var(--ink)' : 'var(--muted)' }}
        >
          {whole}
        </span>
        {frac !== null && (
          <span
            className="tabnum font-bold"
            style={{ fontSize: 26, color: 'var(--muted)' }}
          >
            ,{frac}
          </span>
        )}
        <span
          className="font-medium ml-1"
          style={{ fontSize: 22, color: 'var(--muted)' }}
        >
          {currency}
        </span>
      </div>

      {/* Кнопки */}
      <div className="grid grid-cols-3 gap-2">
        {rows.flat().map((key) => {
          const isDel = key === 'del';
          const isComa = key === ',';
          return (
            <button
              key={key}
              onPointerDown={(e) => { e.preventDefault(); press(key); }}
              className={`
                h-14 rounded-btn text-[22px] font-semibold transition-colors
                active:opacity-70 select-none
                ${isDel ? 'bg-bg text-muted' : isComa ? 'bg-bg text-ink' : 'bg-bg text-ink hover:bg-[#E8E7E2]'}
              `}
              style={{ fontFamily: '"Golos Text", sans-serif' }}
              aria-label={isDel ? 'Удалить' : key}
            >
              {isDel ? <Delete size={22} className="mx-auto" /> : key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Конвертирует строку пинпада в копейки */
export function pinpadToKopecks(value: string): number {
  if (!value) return 0;
  const [rubles, cents = '0'] = value.split(',');
  const r = parseInt(rubles || '0', 10);
  const c = parseInt(cents.padEnd(2, '0').slice(0, 2), 10);
  return r * 100 + c;
}
