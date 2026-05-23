import { createHash, createHmac, timingSafeEqual } from 'crypto';

export interface TelegramLoginWidgetPayload {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
}

export interface VerifiedTelegramUser {
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  authDate: number;
}

const secureHexEquals = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

const assertFreshAuthDate = (authDate: number, maxAgeSeconds: number) => {
  const now = Math.floor(Date.now() / 1000);
  return Number.isFinite(authDate) && authDate > 0 && now - authDate <= maxAgeSeconds;
};

const buildDataCheckString = (entries: Array<[string, string]>) =>
  entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

export const verifyTelegramWebAppInitData = (
  initData: string,
  botToken: string,
  maxAgeSeconds: number,
): VerifiedTelegramUser | null => {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');

  if (!receivedHash) {
    return null;
  }

  params.delete('hash');
  const authDate = Number(params.get('auth_date'));

  if (!assertFreshAuthDate(authDate, maxAgeSeconds)) {
    return null;
  }

  const dataCheckString = buildDataCheckString(Array.from(params.entries()));
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (!secureHexEquals(calculatedHash, receivedHash)) {
    return null;
  }

  const rawUser = params.get('user');
  if (!rawUser) {
    return null;
  }

  const user = JSON.parse(rawUser) as {
    id?: number | string;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  };

  if (!user.id || !user.first_name) {
    return null;
  }

  return {
    telegramId: String(user.id),
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    avatarUrl: user.photo_url,
    authDate,
  };
};

export const verifyTelegramLoginWidgetPayload = (
  payload: TelegramLoginWidgetPayload,
  botToken: string,
  maxAgeSeconds: number,
): VerifiedTelegramUser | null => {
  if (!payload.hash || !payload.id || !payload.first_name || !payload.auth_date) {
    return null;
  }

  const authDate = Number(payload.auth_date);
  if (!assertFreshAuthDate(authDate, maxAgeSeconds)) {
    return null;
  }

  const dataEntries = Object.entries(payload)
    .filter(([key, value]) => key !== 'hash' && value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)] as [string, string]);

  const dataCheckString = buildDataCheckString(dataEntries);
  const secretKey = createHash('sha256').update(botToken).digest();
  const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (!secureHexEquals(calculatedHash, payload.hash)) {
    return null;
  }

  return {
    telegramId: String(payload.id),
    firstName: payload.first_name,
    lastName: payload.last_name,
    username: payload.username,
    avatarUrl: payload.photo_url,
    authDate,
  };
};
