export const CODE_KEY = 'ochag_code';
export const USER_KEY = 'ochag_user';

/** Базовый fetch с заголовком x-ochag-code. При 401 — сбрасывает код и перезагружает. */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const code = localStorage.getItem(CODE_KEY) ?? '';
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      'x-ochag-code': code,
      ...(options.headers as Record<string, string>),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem(CODE_KEY);
    // Перезагрузка вернёт пользователя на экран входа
    window.location.reload();
  }

  return res;
}

/** GET с обработкой ошибок — бросает Error с русским сообщением */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Ошибка ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** POST/PATCH/DELETE с телом */
export async function apiMutate<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await apiFetch(path, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Ошибка ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Проверка семейного кода (POST /api/auth/check) */
export async function checkCode(code: string): Promise<boolean> {
  const res = await fetch('/api/auth/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  return res.ok;
}
