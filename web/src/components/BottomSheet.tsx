import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

/**
 * Bottom-sheet модальное окно.
 * Закрывается по тапу на оверлей или свайпу вниз.
 */
export function BottomSheet({ open, onClose, children, title }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const dragRef = useRef(0);

  // Блокировка скролла body пока открыт
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY;
    dragRef.current = 0;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startYRef.current === null) return;
    const dy = e.touches[0].clientY - startYRef.current;
    dragRef.current = dy;
    if (dy > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  }

  function handleTouchEnd() {
    if (dragRef.current > 80) {
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    startYRef.current = null;
    dragRef.current = 0;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:items-center lg:justify-center">
      {/* Оверлей */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Лист */}
      <div
        ref={sheetRef}
        className="relative bg-surface rounded-t-[24px] shadow-2xl transition-transform duration-200 safe-bottom w-full max-w-[480px] mx-auto lg:rounded-[24px] lg:max-w-[460px] lg:max-h-[88vh]"
        style={{ maxHeight: '92dvh', overflowY: 'auto' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#D0CFC9]" />
        </div>

        {title && (
          <div className="px-4 pb-3 pt-1 text-[17px] font-bold text-ink border-b border-[#F0EFE9]">
            {title}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
