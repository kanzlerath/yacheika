import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

const AUTH_COOKIE_NAME = 'tg_auth_token';

const parseCookieHeader = (cookieHeader?: string) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, cookie) => {
    const [rawName, ...rawValue] = cookie.trim().split('=');
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join('='));
    return cookies;
  }, {});
};

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const cookies = parseCookieHeader(request.headers.cookie);
    const token = cookies[AUTH_COOKIE_NAME];

    request.telegramSession = this.authService.verifySessionToken(token);
    return true;
  }
}
