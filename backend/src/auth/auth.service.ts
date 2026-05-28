import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createHmac, createPublicKey, timingSafeEqual, verify } from 'crypto';
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

const fromBase64UrlBuffer = (input: string) => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64');
};

const secureTextEquals = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};

const stripLeadingZeroes = (buffer: Buffer) => {
  let offset = 0;
  while (offset < buffer.length - 1 && buffer[offset] === 0) offset += 1;
  return buffer.subarray(offset);
};

const toDerInteger = (buffer: Buffer) => {
  const stripped = stripLeadingZeroes(buffer);
  const needsPadding = (stripped[0] & 0x80) !== 0;
  const value = needsPadding ? Buffer.concat([Buffer.from([0]), stripped]) : stripped;
  return Buffer.concat([Buffer.from([0x02, value.length]), value]);
};

const toDerLength = (length: number) => {
  if (length < 128) return Buffer.from([length]);
  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
};

const rawEcdsaSignatureToDer = (signature: Buffer) => {
  const size = signature.length / 2;
  const r = toDerInteger(signature.subarray(0, size));
  const s = toDerInteger(signature.subarray(size));
  const sequence = Buffer.concat([r, s]);
  return Buffer.concat([Buffer.from([0x30]), toDerLength(sequence.length), sequence]);
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
    private readonly httpService: HttpService,
  ) {}

  private get telegramClientId() {
    return process.env.TELEGRAM_CLIENT_ID || '';
  }

  private get telegramClientSecret() {
    return process.env.TELEGRAM_CLIENT_SECRET || '';
  }

  private get telegramRedirectUri() {
    return process.env.TELEGRAM_REDIRECT_URI || '';
  }

  private get sessionSecret() {
    return process.env.AUTH_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN;
  }

  private assertSessionConfigured() {
    if (!this.sessionSecret) {
      throw new ServiceUnavailableException('Auth session signing is not configured');
    }
  }

  assertOidcConfigured() {
    if (!this.telegramClientId || !this.telegramClientSecret || !this.telegramRedirectUri) {
      throw new ServiceUnavailableException('Telegram OIDC is not configured');
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

  private async verifyTelegramIdToken(idToken: string) {
    this.assertOidcConfigured();

    const [headerRaw, payloadRaw, signatureRaw] = idToken.split('.');
    if (!headerRaw || !payloadRaw || !signatureRaw) {
      throw new UnauthorizedException('Invalid Telegram id_token');
    }

    const header = JSON.parse(fromBase64Url(headerRaw)) as { alg?: string; kid?: string };
    const supportedAlgorithms = ['RS256', 'ES256', 'ES256K', 'EdDSA'];
    if (!header.alg || !supportedAlgorithms.includes(header.alg) || !header.kid) {
      throw new UnauthorizedException('Unsupported Telegram id_token signature');
    }

    const jwksResponse = await firstValueFrom(
      this.httpService.get('https://oauth.telegram.org/.well-known/jwks.json'),
    );
    const key = jwksResponse.data?.keys?.find(
      (candidate: { kid?: string; alg?: string }) =>
        candidate.kid === header.kid && candidate.alg === header.alg,
    );

    if (!key) {
      throw new UnauthorizedException('Telegram signing key was not found');
    }

    const publicKey = createPublicKey({ key, format: 'jwk' });
    const signingInput = Buffer.from(`${headerRaw}.${payloadRaw}`);
    const signature = fromBase64UrlBuffer(signatureRaw);
    const isValidSignature =
      header.alg === 'RS256'
        ? verify('RSA-SHA256', signingInput, publicKey, signature)
        : header.alg === 'EdDSA'
          ? verify(null, signingInput, publicKey, signature)
          : verify('sha256', signingInput, publicKey, rawEcdsaSignatureToDer(signature));

    if (!isValidSignature) {
      throw new UnauthorizedException('Invalid Telegram id_token signature');
    }

    const decoded = JSON.parse(fromBase64Url(payloadRaw)) as {
      iss?: string;
      aud?: string;
      sub?: string;
      exp?: number;
      id?: number | string;
      name?: string;
      preferred_username?: string;
      picture?: string;
    };
    const now = Math.floor(Date.now() / 1000);

    if (
      decoded.iss !== 'https://oauth.telegram.org' ||
      String(decoded.aud) !== String(this.telegramClientId) ||
      !decoded.exp ||
      decoded.exp <= now ||
      !decoded.sub ||
      !decoded.id
    ) {
      throw new UnauthorizedException('Telegram id_token claims are invalid');
    }

    return decoded;
  }

  async authenticateOidc(code: string, codeVerifier: string) {
    const tokenUrl = 'https://oauth.telegram.org/token';
    this.assertOidcConfigured();

    const urlParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.telegramRedirectUri,
      client_id: this.telegramClientId,
      code_verifier: codeVerifier,
    });

    const basicAuth = Buffer.from(`${this.telegramClientId}:${this.telegramClientSecret}`).toString(
      'base64',
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(tokenUrl, urlParams.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
        }),
      );

      const { id_token } = response.data;
      if (!id_token) throw new UnauthorizedException('No id_token received from Telegram');

      const decoded = await this.verifyTelegramIdToken(id_token);
      const telegramId = String(decoded.id).trim();
      const fullName = decoded.name || 'User';
      const username = decoded.preferred_username || `user_${telegramId}`;
      const avatarUrl = decoded.picture || null;
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || null;
      const existingUser = await this.userRepository.findOne({ where: { telegramId } });
      const systemId = `tg-${telegramId}`;
      const user = existingUser
        ? this.userRepository.merge(existingUser, {
            username,
            firstName,
            lastName,
            avatarUrl,
          })
        : this.userRepository.create({
            id: systemId,
            telegramId,
            username,
            firstName,
            lastName,
            avatarUrl,
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
