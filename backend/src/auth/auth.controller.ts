import { Controller, Get, Post, Query, Res, BadRequestException, Headers, Req } from '@nestjs/common';
import { Request, Response } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { AuthService } from './auth.service';

const OIDC_COOKIE_NAME = 'tg_oidc_state';
const AUTH_COOKIE_NAME = 'tg_auth_token';
const OIDC_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

const toBase64Url = (input: string | Buffer) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const parseCookieHeader = (cookieHeader?: string) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, cookie) => {
    const [rawName, ...rawValue] = cookie.trim().split('=');
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join('='));
    return cookies;
  }, {});
};

const secureTextEquals = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('telegram/start')
  startTelegramLogin(@Res() res: Response) {
    this.authService.assertOidcConfigured();

    const state = toBase64Url(randomBytes(32));
    const codeVerifier = toBase64Url(randomBytes(64));
    const codeChallenge = toBase64Url(createHash('sha256').update(codeVerifier).digest());
    const authUrl = new URL('https://oauth.telegram.org/auth');
    authUrl.searchParams.set('client_id', process.env.TELEGRAM_CLIENT_ID || '');
    authUrl.searchParams.set('redirect_uri', process.env.TELEGRAM_REDIRECT_URI || '');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    res.cookie(OIDC_COOKIE_NAME, `${state}.${codeVerifier}`, {
      httpOnly: true,
      secure: Boolean(process.env.DOMAIN_NAME),
      sameSite: 'lax',
      maxAge: OIDC_COOKIE_MAX_AGE_MS,
      path: '/api/auth/telegram',
    });

    return res.redirect(authUrl.toString());
  }

  @Get('telegram/callback')
  async handleTelegramCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.DOMAIN_NAME ? `https://${process.env.DOMAIN_NAME}` : 'http://localhost:5173';
    const cookies = parseCookieHeader(req.headers.cookie);
    const [storedState, codeVerifier] = (cookies[OIDC_COOKIE_NAME] || '').split('.');

    res.clearCookie(OIDC_COOKIE_NAME, { path: '/api/auth/telegram' });

    if (!code || !state) {
      throw new BadRequestException('Authorization code is missing');
    }

    try {
      if (!storedState || !codeVerifier || !secureTextEquals(state, storedState)) {
        throw new BadRequestException('Authorization state is invalid');
      }

      const authSession = await this.authService.authenticateOidc(code, codeVerifier);

      res.cookie(AUTH_COOKIE_NAME, authSession.token, {
        httpOnly: true,
        secure: Boolean(process.env.DOMAIN_NAME),
        sameSite: 'lax',
        maxAge: Math.max(0, new Date(authSession.expiresAt).getTime() - Date.now()),
        path: '/',
      });

      return res.redirect(`${frontendUrl}?auth=success`);
    } catch (err) {
      return res.redirect(`${frontendUrl}?auth_error=failed`);
    }
  }

  @Get('me')
  async getMe(@Headers('authorization') authHeader?: string, @Req() req?: Request) {
    const cookies = parseCookieHeader(req?.headers.cookie);
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const token = bearerToken || cookies[AUTH_COOKIE_NAME];
    const session = this.authService.verifySessionToken(token);
    const resolvedSession = await this.authService.resolveSessionUser(session);
    return {
      token,
      ...resolvedSession,
    };
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    return res.status(204).send();
  }
}
