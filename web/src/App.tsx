import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { useToast, ToastContainer } from './components/Toast';
import { Auth } from './screens/Auth';
import { ProfileSelect } from './screens/ProfileSelect';
import { Today } from './screens/Today';
import { Bills } from './screens/Bills';
import { Credits } from './screens/Credits';
import { Savings } from './screens/Savings';
import { History } from './screens/History';
import { Settings } from './screens/Settings';
import { QuickInput } from './modals/QuickInput';
import { CODE_KEY, USER_KEY } from './api/client';
import { useSettings } from './api/queries';
import type { User } from './api/types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 20_000 },
  },
});

type QuickTab = 'expense' | 'income' | 'transfer';

/** Рендерится только когда пользователь авторизован — безопасно вызывает useSettings() */
function LoggedInApp({
  user,
  switchUser,
  showToast,
  dismissToast,
  toasts,
}: {
  user: User;
  switchUser: () => void;
  showToast: (msg: string, action?: { label: string; onClick: () => void }) => void;
  dismissToast: (id: number) => void;
  toasts: Array<{ id: number; message: string; action?: { label: string; onClick: () => void } }>;
}) {
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickTab, setQuickTab] = useState<QuickTab>('expense');

  const { data: settings } = useSettings();
  const currency = settings?.currencySymbol ?? '₽';

  const openQuick = useCallback((tab: QuickTab = 'expense') => {
    setQuickTab(tab);
    setQuickOpen(true);
  }, []);

  return (
    <BrowserRouter>
      <div className="h-full bg-bg flex">
        <Sidebar user={user} onSwitchUser={switchUser} onOpenQuickInput={openQuick} />

        <main className="relative flex-1 h-full overflow-hidden">
          <div className="h-full w-full max-w-[480px] mx-auto lg:max-w-[860px]">
          <Routes>
            <Route
              path="/"
              element={
                <Today
                  user={user}
                  onSwitchUser={switchUser}
                  onOpenQuickInput={openQuick}
                  showToast={showToast}
                />
              }
            />
            <Route path="/bills" element={<Bills user={user} showToast={showToast} />} />
            <Route path="/credits" element={<Credits user={user} showToast={showToast} />} />
            <Route path="/savings" element={<Savings user={user} showToast={showToast} />} />
            <Route path="/history" element={<History user={user} showToast={showToast} />} />
            <Route path="/settings" element={<Settings showToast={showToast} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </div>

          <BottomNav />

          <button
            onClick={() => openQuick('expense')}
            className="lg:hidden fixed z-40 w-14 h-14 rounded-full bg-primary text-surface flex items-center justify-center text-[30px] font-light active:opacity-80 transition-opacity"
            style={{
              bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
              left: '50%',
              transform: 'translateX(calc(-50% + 120px))',
              boxShadow: '0 6px 16px rgb(30 92 70 / 0.4)',
            }}
            aria-label="Добавить"
          >
            +
          </button>
        </main>

        <QuickInput
          open={quickOpen}
          onClose={() => setQuickOpen(false)}
          user={user}
          currency={currency}
          initialTab={quickTab}
          showToast={showToast}
        />

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </BrowserRouter>
  );
}

function AppShell() {
  const [code, setCode] = useState(() => localStorage.getItem(CODE_KEY));
  const [user, setUser] = useState<User | null>(() => {
    const u = localStorage.getItem(USER_KEY);
    return u === 'him' || u === 'her' ? u : null;
  });
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();

  const handleAuthSuccess = useCallback(() => {
    setCode(localStorage.getItem(CODE_KEY));
  }, []);

  const handleProfileSelect = useCallback(() => {
    const u = localStorage.getItem(USER_KEY) as User;
    setUser(u);
  }, []);

  function switchUser() {
    const next: User = user === 'him' ? 'her' : 'him';
    localStorage.setItem(USER_KEY, next);
    setUser(next);
    void queryClient.invalidateQueries();
  }

  if (!code) {
    return <Auth onSuccess={handleAuthSuccess} />;
  }

  if (!user) {
    return <ProfileSelect onSelect={handleProfileSelect} />;
  }

  return (
    <LoggedInApp
      user={user}
      switchUser={switchUser}
      showToast={showToast}
      dismissToast={dismissToast}
      toasts={toasts}
    />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
