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
  fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
}

export function getAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function refreshTelegramSession(token?: string): Promise<TelegramAuthSession> {
  const res = await fetch("/api/auth/me", {
    headers: token ? getAuthHeaders(token) : undefined,
  });

  if (!res.ok) {
    throw new Error("Session expired or invalid");
  }

  const data = await res.json();
  
  const freshSession: TelegramAuthSession = {
    token: data.token || token,
    expiresAt: data.expiresAt,
    user: data.user,
  };

  return freshSession;
}
