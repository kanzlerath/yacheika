import { TelegramAuthSession } from "../types";

// Ключ для хранения сессии в localStorage
const STORAGE_KEY = "yacheyka_auth_session";

export function readStoredTelegramAuth(): TelegramAuthSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error("Failed to read auth from storage", e);
    return null;
  }
}

export function storeTelegramAuth(session: TelegramAuthSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearTelegramAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Поскольку авторизация теперь происходит через редирект, 
 * старый метод POST-запроса на бэкенд больше не выполняет валидацию.
 * Изменим его так, чтобы он не ломал существующий код в модалках, если они его вызывают.
 */
export async function authenticateTelegram(payload: any): Promise<TelegramAuthSession> {
  // Этот метод больше не должен вызываться, так как вход идёт через window.location.href.
  // Но если где-то остался вызов, выбросим понятную ошибку для отладки.
  throw new Error("authenticateTelegram is deprecated. Use OIDC redirect flow instead.");
}

/**
 * Метод обновления сессии (refresh)
 */
export async function refreshTelegramSession(token: string): Promise<TelegramAuthSession> {
  const res = await fetch("/api/auth/me", {
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    throw new Error("Session expired or invalid");
  }

  const data = await res.json();
  
  // Формируем обновленный объект сессии, сохраняя текущий токен
  const freshSession: TelegramAuthSession = {
    token: token,
    isAdmin: data.isAdmin,
    expiresAt: data.expiresAt,
    user: data.user,
  };

  return freshSession;
}