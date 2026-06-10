import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BottomNav } from './components/BottomNav';
import { useToast, ToastContainer } from './components/Toast';
import { Auth } from './screens/Auth';
import { ProfileSelect } from './screens/ProfileSelect';
import { Today } from './screens/Today';
import { Bills } from './screens/Bills';
import { Savings } from './screens/Savings';
import { History } from './screens/History';
import { Settings } from './screens/Settings';
import { QuickInput } from './modals/QuickInput';
import { CODE_KEY, USER_KEY } from './api/client';
import type { User } from './api/types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 20_000 },
  },
});

type QuickTab = 'expense' | 'income' | 'transfer';

function AppShell() {
  const [code, setCode] = useState(() => localStorage.getItem(CODE_KEY));
  const [user, setUser] = useState<User | null>(() => {
    const u = localStorage.getItem(USER_KEY);
    return u === 'him' || u === 'her' ? u : null;
  });
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickTab, setQuickTab] = useState<QuickTab>('expense');
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();

  const handleAuthSuccess = useCallback(() => {
    setCode(localStorage.getItem(CODE_KEY));
  }, []);

  const handleProfileSelect = useCallback(() => {
    const u = localStorage.getItem(USER_KEY) as User;
    setUser(u);
  }, []);

  const openQuick = useCallback((tab: QuickTab = 'expense') => {
    setQuickTab(tab);
    setQuickOpen(true);
  }, []);

  function switchUser() {
    const next: User = user === 'him' ? 'her' : 'him';
    localStorage.setItem(USER_KEY, next);
    setUser(next);
    void queryClient.invalidateQueries();
  }

  // Экран входа
  if (!code) {
    return <Auth onSuccess={handleAuthSuccess} />;
  }

  // Экран выбора профиля
  if (!user) {
    return <ProfileSelect onSelect={handleProfileSelect} />;
  }

  return (
    <BrowserRouter>
      {/* Обёртка по центру, max-width 480px */}
      <div className="relative h-full bg-bg mx-auto overflow-hidden" style={{ maxWidth: '480px' }}>
        {/* Контент экранов */}
        <div className="h-full">
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
            <Route path="/bills" element={<Bills />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* Нижняя навигация */}
        <BottomNav />

        {/* FAB «+» — фиксирован над нижней навигацией §9 */}
        <button
          onClick={() => openQuick('expense')}
          className="fixed bottom-[72px] z-40 w-14 h-14 rounded-full bg-primary text-surface shadow-lg flex items-center justify-center text-[28px] font-light active:opacity-80 transition-opacity"
          style={{
            left: '50%',
            transform: 'translateX(calc(-50% + 120px))', // смещён вправо от центра навигации
          }}
          aria-label="Добавить"
        >
          +
        </button>

        {/* Quick Input */}
        <QuickInput
          open={quickOpen}
          onClose={() => setQuickOpen(false)}
          user={user}
          currency="₽"
          initialTab={quickTab}
          showToast={showToast}
        />

        {/* Тосты */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
