import { USER_KEY } from '../api/client';

interface Props {
  onSelect: () => void;
}

/**
 * Экран выбора профиля Он/Она (§9).
 * Два крупных варианта, цвета Север/Брусника.
 */
export function ProfileSelect({ onSelect }: Props) {
  function pick(user: 'him' | 'her') {
    localStorage.setItem(USER_KEY, user);
    onSelect();
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center px-6 safe-top safe-bottom gap-4">
      <h1 className="font-unbounded font-bold text-primary mb-2" style={{ fontSize: 28 }}>
        Очаг
      </h1>
      <p className="text-muted text-[15px] mb-4 text-center">
        Кто вы?
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => pick('him')}
          className="h-24 rounded-card text-surface font-bold text-[22px] shadow-card transition-opacity active:opacity-80"
          style={{ backgroundColor: 'var(--him)' }}
        >
          Он
        </button>
        <button
          onClick={() => pick('her')}
          className="h-24 rounded-card text-surface font-bold text-[22px] shadow-card transition-opacity active:opacity-80"
          style={{ backgroundColor: 'var(--her)' }}
        >
          Она
        </button>
      </div>

      <p className="text-muted text-[12px] mt-4 text-center px-4">
        Профиль сохранится на этом устройстве
      </p>
    </div>
  );
}
