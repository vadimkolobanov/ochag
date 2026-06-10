import { NavLink } from 'react-router-dom';
import { Home, ListChecks, PiggyBank, BarChart2 } from 'lucide-react';

const tabs = [
  { to: '/', icon: Home, label: 'Сегодня' },
  { to: '/bills', icon: ListChecks, label: 'Платежи' },
  { to: '/savings', icon: PiggyBank, label: 'Копилка' },
  { to: '/history', icon: BarChart2, label: 'Итоги' },
] as const;

export function BottomNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-[#E8E7E2] safe-bottom"
      style={{ maxWidth: '480px', margin: '0 auto', left: '50%', transform: 'translateX(-50%)', right: 'auto', width: '100%' }}
    >
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                isActive ? 'text-primary' : 'text-muted'
              }`
            }
          >
            <Icon size={22} strokeWidth={1.8} />
            <span className="text-[11px] font-medium leading-none">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
