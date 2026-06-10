import { useState, useCallback, useRef } from 'react';

export interface ToastItem {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
}

let nextId = 0;

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, action?: ToastItem['action']) => void;
  dismiss: (id: number) => void;
}

/** Хук управления тостами */
export function useToast(): ToastState {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const show = useCallback((message: string, action?: ToastItem['action']) => {
    const id = ++nextId;
    setToasts((prev) => [...prev.slice(-2), { id, message, action }]);
    const t = setTimeout(() => dismiss(id), action ? 5000 : 2500);
    timers.current.set(id, t);
  }, [dismiss]);

  return { toasts, show, dismiss };
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

/** Контейнер тостов — размещается над нижней навигацией */
export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center px-4 pointer-events-none w-full max-w-[480px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-ink text-surface rounded-[14px] px-4 py-3 flex items-center gap-3 shadow-lg w-full max-w-sm"
          onClick={() => onDismiss(t.id)}
        >
          <span className="flex-1 text-[14px] font-medium">{t.message}</span>
          {t.action && (
            <button
              className="text-amber text-[14px] font-semibold whitespace-nowrap"
              onClick={(e) => { e.stopPropagation(); t.action!.onClick(); onDismiss(t.id); }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
