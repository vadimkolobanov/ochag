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
      className="lg:hidden fixed z-40 flex"
      style={{
        bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(min(480px, 100%) - 28px)',
        background: '#FFFFFF',
        borderRadius: 26,
        boxShadow: '0 8px 28px rgb(38 40 43 / 0.18), 0 1px 0 rgb(255 255 255 / 0.6) inset',
      }}
    >
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors ${
              isActive ? 'text-primary' : 'text-muted'
            }`
          }
          style={{ padding: '9px 0 11px', borderRadius: 26 }}
        >
          <Icon size={20} strokeWidth={1.8} />
          <span className="text-[10.5px] font-medium leading-none">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
