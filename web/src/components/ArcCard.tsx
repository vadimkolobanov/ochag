import { fmtMoney, fmtDateShort } from '../utils/format';
import type { StateResponse } from '../api/types';

interface Props {
  data: StateResponse;
}

/** Конвертирует угол в градусах (по часовой от 12) в координаты SVG */
function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** SVG path для дуги (clockwise) */
function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const [sx, sy] = polar(cx, cy, r, startDeg);
  const [ex, ey] = polar(cx, cy, r, endDeg);
  const sweep = ((endDeg - startDeg) + 360) % 360;
  if (sweep < 0.5) return '';
  const large = sweep > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

const CX = 110;
const CY = 100;
const R = 80;
const STROKE = 14;
const START = 225; // 7:30
const TOTAL = 270;  // градусов дуги

export function ArcCard({ data }: Props) {
  const fill = Math.max(0, Math.min(1, data.arcFill));
  const fillEnd = (START + fill * TOTAL) % 360;
  const isLow = fill < 0.2;
  const arcColor = isLow ? 'var(--danger)' : 'var(--amber)';

  const trackPath = arcPath(CX, CY, R, START, (START + TOTAL) % 360);
  const fillPath = fill > 0.002 ? arcPath(CX, CY, R, START, fillEnd) : '';

  return (
    <div className="bg-surface rounded-card shadow-card mx-4 mt-3 px-4 pb-4 pt-2">
      {/* SVG дуга 270° */}
      <svg
        viewBox={`0 0 220 165`}
        className="w-full"
        aria-hidden="true"
      >
        {/* Подложка (Лён) */}
        <path
          d={trackPath}
          fill="none"
          stroke="var(--bg)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        {/* Заливка */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={arcColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        )}
        {/* «в день» внутри дуги */}
        <text
          x={CX}
          y={CY - 10}
          textAnchor="middle"
          dominantBaseline="middle"
          className="tabnum"
          style={{
            fontFamily: '"Golos Text", sans-serif',
            fontSize: 13,
            fontWeight: 500,
            fill: 'var(--muted)',
          }}
        >
          в день
        </text>
        <text
          x={CX}
          y={CY + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          className="tabnum"
          style={{
            fontFamily: '"Golos Text", sans-serif',
            fontSize: 38,
            fontWeight: 700,
            fill: isLow ? 'var(--danger)' : 'var(--ink)',
          }}
        >
          {(() => {
            const { whole, frac } = {
              whole: Math.floor(Math.max(0, data.perDay) / 100)
                .toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F'),
              frac: Math.max(0, data.perDay) % 100 > 0
                ? (Math.max(0, data.perDay) % 100).toString().padStart(2, '0')
                : undefined,
            };
            return frac ? `${whole},${frac}` : whole;
          })()}
        </text>
        <text
          x={CX}
          y={CY + 44}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontFamily: '"Golos Text", sans-serif',
            fontSize: 13,
            fontWeight: 500,
            fill: 'var(--muted)',
          }}
        >
          {data.currency}
        </text>
      </svg>

      {/* Строка «Осталось · до зарплаты» */}
      <div className="mt-1 flex flex-col items-center gap-0.5">
        <div className="text-[15px] font-medium text-ink tabnum">
          Осталось{' '}
          <span className={isLow ? 'text-danger' : 'text-primary'}>
            {fmtMoney(data.dailyBalance, data.currency)}
          </span>
        </div>
        <div className="text-[13px] text-muted">
          до зарплаты{' '}
          <span className="font-medium text-ink">
            {data.payday.daysLeft} дн
          </span>
          {' '}({fmtDateShort(data.payday.date)})
        </div>
      </div>
    </div>
  );
}

/* Скелетон */
export function ArcCardSkeleton() {
  return (
    <div className="bg-surface rounded-card shadow-card mx-4 mt-3 px-4 pb-4 pt-2">
      <div className="skeleton h-40 rounded-xl" />
      <div className="mt-3 flex flex-col items-center gap-2">
        <div className="skeleton h-5 w-48 rounded" />
        <div className="skeleton h-4 w-36 rounded" />
      </div>
    </div>
  );
}
