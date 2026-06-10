/** Экран «Настройки» — реализуется в Этапе D */
import { USER_KEY, CODE_KEY } from '../api/client';

export function Settings() {
  function logout() {
    if (confirm('Выйти? Код и профиль будут удалены с этого устройства.')) {
      localStorage.removeItem(CODE_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.reload();
    }
  }

  return (
    <div className="flex flex-col h-full pb-24 safe-top">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-[20px] font-bold text-ink">Настройки</h1>
      </div>

      <div className="flex-1 px-4 py-4">
        <p className="text-[14px] text-muted mb-6">
          Полные настройки (валюта, дни зарплат, категории, экспорт/импорт) появятся в следующем обновлении.
        </p>

        <div className="bg-surface rounded-card shadow-card">
          <button
            onClick={logout}
            className="w-full px-4 py-4 text-left text-[15px] font-medium text-danger active:bg-bg transition-colors rounded-card"
          >
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}
