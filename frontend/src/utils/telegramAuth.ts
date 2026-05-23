import { TelegramAuthSession, TelegramLoginWidgetUser } from "../types";

const AUTH_STORAGE_KEY = "yacheyka.telegramAuth";

interface TelegramAuthRequest {
  initData?: string;
  loginWidgetUser?: TelegramLoginWidgetUser;
}

export const getAuthHeaders = (token?: string) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const readStoredTelegramAuth = (): TelegramAuthSession | null => {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const auth = JSON.parse(raw) as TelegramAuthSession;
    if (!auth.token || !auth.user?.id || new Date(auth.expiresAt).getTime() <= Date.now()) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return auth;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const storeTelegramAuth = (auth: TelegramAuthSession) => {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
};

export const clearTelegramAuth = () => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const authenticateTelegram = async (payload: TelegramAuthRequest) => {
  const res = await fetch("/api/auth/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || "Telegram авторизация не прошла.");
  }

  return (await res.json()) as TelegramAuthSession;
};

export const refreshTelegramSession = async (token: string) => {
  const res = await fetch("/api/auth/me", {
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    throw new Error("Сессия Telegram истекла.");
  }

  const data = (await res.json()) as Omit<TelegramAuthSession, "token">;
  return {
    ...data,
    token,
  };
};
