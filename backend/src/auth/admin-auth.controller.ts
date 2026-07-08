import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { ADMIN_COOKIE_NAME } from './admin.guard';

const parseCookieHeader = (cookieHeader?: string) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, cookie) => {
    const [rawName, ...rawValue] = cookie.trim().split('=');
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join('='));
    return cookies;
  }, {});
};

@Controller('api/admin')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.adminAuthService.login(email, password, req.ip);

    res.cookie(ADMIN_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: Boolean(process.env.DOMAIN_NAME),
      sameSite: 'strict',
      maxAge: Math.max(0, new Date(session.expiresAt).getTime() - Date.now()),
      path: '/',
    });

    return {
      admin: session.admin,
      expiresAt: session.expiresAt,
    };
  }

  @Get('me')
  async getMe(@Req() req: Request) {
    const cookies = parseCookieHeader(req.headers.cookie);
    const token = cookies[ADMIN_COOKIE_NAME];
    if (!token) {
      throw new UnauthorizedException('Missing admin session');
    }

    const session = this.adminAuthService.verifySessionToken(token);
    return this.adminAuthService.resolveSessionAdmin(session);
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie(ADMIN_COOKIE_NAME, { path: '/' });
    return res.status(204).send();
  }
}
