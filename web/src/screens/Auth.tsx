import { useState } from 'react';
import { checkCode, CODE_KEY } from '../api/client';

interface Props {
  onSuccess: () => void;
}

/**
 * Экран первого входа: одно поле кода + кнопка «Войти» (§9).
 * При 401 — «Код не подходит».
 */
export function Auth({ onSuccess }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    const ok = await checkCode(code.trim());
    setLoading(false);
    if (ok) {
      localStorage.setItem(CODE_KEY, code.trim());
      onSuccess();
    } else {
      setError('Код не подходит');
    }
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center px-6 safe-top safe-bottom">
      <h1 className="font-unbounded font-bold text-primary mb-2" style={{ fontSize: 36 }}>
        Очаг
      </h1>
      <p className="text-muted text-[15px] mb-10 text-center">
        Семейный бюджет для двоих
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-3">
        <div>
          <input
            type="password"
            inputMode="text"
            autoComplete="current-password"
            placeholder="Семейный код"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(''); }}
            className={`
              w-full h-14 px-4 rounded-btn text-[16px] font-medium bg-surface border-2
              outline-none transition-colors text-ink placeholder:text-muted
              ${error ? 'border-danger' : 'border-[#E0DFD9] focus:border-primary'}
            `}
          />
          {error && (
            <p className="text-danger text-[13px] font-medium mt-1 pl-1">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="h-14 rounded-btn bg-primary text-surface font-semibold text-[16px] transition-opacity disabled:opacity-50 active:opacity-80"
        >
          {loading ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
