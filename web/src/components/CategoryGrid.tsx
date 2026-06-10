import {
  ShoppingBasket, Bus, Coffee, Home, HeartPulse, Shirt, Paintbrush, CircleEllipsis,
  type LucideIcon,
} from 'lucide-react';
import type { Category } from '../api/types';

const ICON_MAP: Record<string, LucideIcon> = {
  'shopping-basket': ShoppingBasket,
  'bus': Bus,
  'coffee': Coffee,
  'home': Home,
  'heart-pulse': HeartPulse,
  'shirt': Shirt,
  'paintbrush': Paintbrush,
  'circle-ellipsis': CircleEllipsis,
};

function CategoryIcon({ name, size = 22 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? CircleEllipsis;
  return <Icon size={size} strokeWidth={1.8} />;
}

interface Props {
  categories: Category[];
  onSelect: (cat: Category) => void;
  disabled?: boolean;
}

/** Сетка категорий 4×2 — касание = мгновенное сохранение (§9.2) */
export function CategoryGrid({ categories, onSelect, disabled }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2 px-2">
      {categories.slice(0, 8).map((cat) => (
        <button
          key={cat.id}
          onPointerDown={(e) => { e.preventDefault(); if (!disabled) onSelect(cat); }}
          disabled={disabled}
          className={`
            flex flex-col items-center gap-1 py-3 rounded-card
            transition-colors active:scale-95 select-none
            ${disabled ? 'opacity-50' : 'hover:bg-bg active:bg-[#E8E7E2]'}
            bg-bg
          `}
        >
          <span className="text-primary">
            <CategoryIcon name={cat.icon} size={24} />
          </span>
          <span className="text-[11px] font-medium text-ink leading-tight text-center">
            {cat.name}
          </span>
        </button>
      ))}
    </div>
  );
}

export { CategoryIcon };
