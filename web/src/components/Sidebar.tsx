import { NavLink } from 'react-router-dom';
import { Home, ListChecks, PiggyBank, BarChart2, Plus, Settings } from 'lucide-react';
import type { User } from '../api/types';

const tabs = [
  { to: '/', icon: Home, label: 'Сегодня' },
  { to: '/bills', icon: ListChecks, label: 'Платежи' },
  { to: '/savings', icon: PiggyBank, label: 'Копилка' },
  { to: '/history', icon: BarChart2, label: 'Итоги' },
] as const;

interface Props {
  user: User;
  onSwitchUser: () => void;
  onOpenQuickInput: (tab?: 'expense' | 'income' | 'transfer') => void;
}

/** Боковая навигация — видна только на десктопе (lg+) */
export function Sidebar({ user, onSwitchUser, onOpenQuickInput }: Props) {
  return (
    <aside className="hidden lg:flex lg:flex-col w-60 shrink-0 h-full bg-surface border-r border-[#E8E7E2] px-4 py-6">
      <div className="px-2 mb-8">
        <span className="font-unbounded font-bold text-primary text-2xl">Очаг</span>
      </div>

      <nav className="flex flex-col gap-1">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-btn text-[15px] font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-bg hover:text-ink'
              }`
            }
          >
            <Icon size={20} strokeWidth={1.9} />
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={() => onOpenQuickInput('expense')}
        className="mt-6 flex items-center justify-center gap-2 h-11 rounded-btn bg-primary text-surface font-semibold text-[15px] hover:opacity-90 transition-opacity"
      >
        <Plus size={20} strokeWidth={2.2} />
        Добавить
      </button>

      <div className="mt-auto flex items-center gap-3 pt-6">
        <button
          onClick={onSwitchUser}
          className="w-10 h-10 rounded-full flex items-center justify-center text-surface font-bold text-[15px] hover:opacity-80 transition-opacity shrink-0"
          style={{ backgroundColor: user === 'him' ? 'var(--him)' : 'var(--her)' }}
          title="Сменить профиль"
        >
          {user === 'him' ? 'Он' : 'Она'}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-ink truncate">
            {user === 'him' ? 'Он' : 'Она'}
          </div>
          <button
            onClick={onSwitchUser}
            className="text-[12px] text-muted hover:text-ink transition-colors"
          >
            сменить
          </button>
        </div>
        <NavLink
          to="/settings"
          className="w-9 h-9 flex items-center justify-center rounded-btn text-muted hover:bg-bg hover:text-ink transition-colors shrink-0"
          title="Настройки"
        >
          <Settings size={20} />
        </NavLink>
      </div>
    </aside>
  );
}
