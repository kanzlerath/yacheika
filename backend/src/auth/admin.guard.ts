import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';

export const ADMIN_COOKIE_NAME = 'admin_session';

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
export class AdminGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const cookies = parseCookieHeader(request.headers.cookie);
    const session = this.adminAuthService.verifySessionToken(cookies[ADMIN_COOKIE_NAME]);

    if (!session.role) {
      throw new ForbiddenException('Admin access is restricted');
    }

    request.adminSession = session;
    return true;
  }
}
