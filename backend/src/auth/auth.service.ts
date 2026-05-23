import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import {
  TelegramLoginWidgetPayload,
  VerifiedTelegramUser,
  verifyTelegramLoginWidgetPayload,
  verifyTelegramWebAppInitData,
} from './telegram-auth.utils';

export interface TelegramSession {
  userId: string;
  telegramId: string;
  username?: string;
  isAdmin: boolean;
  exp: number;
}

interface TelegramAuthInput {
  initData?: string;
  loginWidgetUser?: TelegramLoginWidgetPayload;
}

const toBase64Url = (input: string | Buffer) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const fromBase64Url = (input: string) => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
};

const secureTextEquals = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

@Injectable()
export class AuthService {
  private readonly adminTelegramId = process.env.ADMIN_TELEGRAM_ID || '1859857121';
  private readonly adminTelegramUsername = (process.env.ADMIN_TELEGRAM_USERNAME || 'nick_luzhkov')
    .replace(/^@/, '')
    .toLowerCase();
  private readonly authMaxAgeSeconds = Number(process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS || 86400);
  private readonly sessionTtlSeconds = Number(process.env.AUTH_SESSION_TTL_SECONDS || 604800);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  private get botToken() {
    return process.env.TELEGRAM_BOT_TOKEN;
  }

  private get sessionSecret() {
    return process.env.AUTH_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN;
  }

  private assertTelegramConfigured() {
    if (!this.botToken) {
      throw new ServiceUnavailableException('Telegram auth is not configured');
    }
  }

  private assertSessionConfigured() {
    if (!this.sessionSecret) {
      throw new ServiceUnavailableException('Auth session signing is not configured');
    }
  }

  private isAdminUser(user: { telegramId: string; username?: string | null }) {
    const username = user.username?.replace(/^@/, '').toLowerCase();
    return user.telegramId === this.adminTelegramId || username === this.adminTelegramUsername;
  }

  private createSessionToken(session: TelegramSession) {
    this.assertSessionConfigured();

    const payload = toBase64Url(JSON.stringify(session));
    const signature = toBase64Url(
      createHmac('sha256', this.sessionSecret).update(payload).digest(),
    );

    return `${payload}.${signature}`;
  }

  verifySessionToken(token?: string): TelegramSession {
    this.assertSessionConfigured();

    if (!token) {
      throw new UnauthorizedException('Missing auth token');
    }

    const [payload, signature] = token.split('.');
    if (!payload || !signature) {
      throw new UnauthorizedException('Invalid auth token');
    }

    const expectedSignature = toBase64Url(
      createHmac('sha256', this.sessionSecret).update(payload).digest(),
    );

    if (!secureTextEquals(signature, expectedSignature)) {
      throw new UnauthorizedException('Invalid auth token');
    }

    const session = JSON.parse(fromBase64Url(payload)) as TelegramSession;
    const now = Math.floor(Date.now() / 1000);

    if (!session.userId || !session.telegramId || !session.exp || session.exp <= now) {
      throw new UnauthorizedException('Auth token expired');
    }

    return session;
  }

  async authenticate(input: TelegramAuthInput) {
    this.assertTelegramConfigured();

    let telegramUser: VerifiedTelegramUser | null = null;

    if (input.initData) {
      telegramUser = verifyTelegramWebAppInitData(
        input.initData,
        this.botToken,
        this.authMaxAgeSeconds,
      );
    } else if (input.loginWidgetUser) {
      telegramUser = verifyTelegramLoginWidgetPayload(
        input.loginWidgetUser,
        this.botToken,
        this.authMaxAgeSeconds,
      );
    }

    if (!telegramUser) {
      throw new UnauthorizedException('Telegram auth payload is invalid or expired');
    }

    const id = `tg-${telegramUser.telegramId}`;
    const username = telegramUser.username || `user_${telegramUser.telegramId}`;
    const existingUser = await this.userRepository.findOne({ where: { telegramId: telegramUser.telegramId } });

    const user = existingUser
      ? this.userRepository.merge(existingUser, {
          username,
          firstName: telegramUser.firstName,
          lastName: telegramUser.lastName || null,
          avatarUrl: telegramUser.avatarUrl || null,
        })
      : this.userRepository.create({
          id,
          telegramId: telegramUser.telegramId,
          username,
          firstName: telegramUser.firstName,
          lastName: telegramUser.lastName || null,
          avatarUrl: telegramUser.avatarUrl || null,
        });

    const savedUser = await this.userRepository.save(user);
    const now = Math.floor(Date.now() / 1000);
    const isAdmin = this.isAdminUser(savedUser);
    const token = this.createSessionToken({
      userId: savedUser.id,
      telegramId: savedUser.telegramId,
      username: savedUser.username,
      isAdmin,
      exp: now + this.sessionTtlSeconds,
    });

    return {
      token,
      isAdmin,
      expiresAt: new Date((now + this.sessionTtlSeconds) * 1000).toISOString(),
      user: savedUser,
    };
  }

  async resolveSessionUser(session: TelegramSession) {
    const user = await this.userRepository.findOne({ where: { id: session.userId } });

    if (!user) {
      throw new UnauthorizedException('Session user does not exist');
    }

    const isAdmin = this.isAdminUser(user);

    return {
      user,
      isAdmin,
      expiresAt: new Date(session.exp * 1000).toISOString(),
    };
  }
}
