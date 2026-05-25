import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios'; // <-- Добавлено
import { firstValueFrom } from 'rxjs'; // <-- Добавлено
import { createHmac, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

export interface TelegramSession {
  userId: string;
  telegramId: string;
  username?: string;
  isAdmin: boolean;
  exp: number;
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
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};

@Injectable()
export class AuthService {
  private readonly adminTelegramId = process.env.ADMIN_TELEGRAM_ID || '1859857121';
  private readonly adminTelegramUsername = (process.env.ADMIN_TELEGRAM_USERNAME || 'nick_luzhkov')
    .replace(/^@/, '')
    .toLowerCase();
  private readonly sessionTtlSeconds = Number(process.env.AUTH_SESSION_TTL_SECONDS || 604800);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly httpService: HttpService, // <-- ВНЕДРЕНИЕ HTTP-КЛИЕНТА
  ) {}

  private get sessionSecret() {
    return process.env.AUTH_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN;
  }

  private assertSessionConfigured() {
    if (!this.sessionSecret) {
      throw new ServiceUnavailableException('Auth session signing is not configured');
    }
  }

  private isAdminUser(user: { telegramId: string; username?: string | null }) {
    if (!user.telegramId) return false;
  
    const username = user.username?.replace(/^@/, '').toLowerCase().trim();
    const adminUsername = this.adminTelegramUsername.replace(/^@/, '').toLowerCase().trim();
    
    // Принудительно кастим к строке и отрезаем пробелы, чтобы '123' точно было равно 123
    const currentTgId = String(user.telegramId).trim();
    const targetAdminId = String(this.adminTelegramId).trim();
  
    return currentTgId === targetAdminId || username === adminUsername;
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
    if (!token) throw new UnauthorizedException('Missing auth token');

    const [payload, signature] = token.split('.');
    if (!payload || !signature) throw new UnauthorizedException('Invalid auth token');

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

  // --- НОВЫЙ МЕТОД АВТОРИЗАЦИИ ЧЕРЕЗ OPENID CONNECT ---
  async authenticateOidc(code: string) {
    const tokenUrl = 'https://oauth.telegram.org/token';
    
    const urlParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: process.env.TELEGRAM_CLIENT_ID || '',
      client_secret: process.env.TELEGRAM_CLIENT_SECRET || '',
      redirect_uri: process.env.TELEGRAM_REDIRECT_URI || '',
    });
  
    try {
      const response = await firstValueFrom(
        this.httpService.post(tokenUrl, urlParams.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
  
      const { id_token } = response.data;
      if (!id_token) throw new UnauthorizedException('No id_token received from Telegram');
  
      // Безопасно декодируем JWT payload
      const [jwtPayload] = id_token.split('.').slice(1, 2);
      const decoded: any = JSON.parse(Buffer.from(jwtPayload, 'base64').toString('utf8'));
  
      // Принудительно делаем ID строкой БЕЗ лишних символов
      const telegramId = String(decoded.sub).trim();
      const username = decoded.nickname || `user_${telegramId}`;
      const firstName = decoded.given_name || 'User';
      const lastName = decoded.family_name || null;
      const avatarUrl = decoded.picture || null;
  
      // Пытаемся найти вас в базе по telegramId
      let existingUser = await this.userRepository.findOne({ where: { telegramId } });
  
      // Если по строковому id не нашлось, пробуем найти старую запись, где id мог быть сохранен как число
      if (!existingUser) {
        existingUser = await this.userRepository.findOne({ 
          where: { telegramId: telegramId as any } 
        });
      }
  
      // Формируем внутренний ID для сущности в вашем проекте (например: tg-1859857121)
      const systemId = `tg-${telegramId}`;
  
      const user = existingUser
        ? this.userRepository.merge(existingUser, { 
            username, 
            firstName, 
            lastName, 
            avatarUrl 
          })
        : this.userRepository.create({ 
            id: systemId, 
            telegramId, 
            username, 
            firstName, 
            lastName, 
            avatarUrl 
          });
  
      const savedUser = await this.userRepository.save(user);
      const now = Math.floor(Date.now() / 1000);
      
      // Проверяем статус админа
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
    } catch (error) {
      console.error('OIDC Auth Error:', error?.response?.data || error.message);
      throw new UnauthorizedException('Telegram OIDC auth payload is invalid or expired');
    }
  }

  async resolveSessionUser(session: TelegramSession) {
    const user = await this.userRepository.findOne({ where: { id: session.userId } });
    if (!user) throw new UnauthorizedException('Session user does not exist');
    const isAdmin = this.isAdminUser(user);

    return {
      user,
      isAdmin,
      expiresAt: new Date(session.exp * 1000).toISOString(),
    };
  }
}