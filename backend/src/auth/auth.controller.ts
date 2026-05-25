import { Controller, Get, Query, Res, BadRequestException, Headers } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Новый GET эндпоинт, куда Telegram возвращает пользователя с временным кодом (?code=...)
  @Get('telegram/callback')
  async handleTelegramCallback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      throw new BadRequestException('Authorization code is missing');
    }

    try {
      // Обмениваем код на сессию приложения
      const authSession = await this.authService.authenticateOidc(code);
      
      // Кодируем объект сессии в Base64, чтобы безопасно передать через строку URL на фронтенд
      const sessionDataEncoded = encodeURIComponent(Buffer.from(JSON.stringify(authSession)).toString('base64'));
      
      // Перенаправляем пользователя на фронтенд
      const domain = process.env.DOMAIN_NAME ? `https://${process.env.DOMAIN_NAME}` : 'http://localhost:5173';
      return res.redirect(`${domain}?tg_auth_session=${sessionDataEncoded}`);
    } catch (err) {
      const domain = process.env.DOMAIN_NAME ? `https://${process.env.DOMAIN_NAME}` : 'http://localhost:5173';
      return res.redirect(`${domain}?auth_error=failed`);
    }
  }

  @Get('me')
  async getMe(@Headers('authorization') authHeader?: string) {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const session = this.authService.verifySessionToken(token);
    return this.authService.resolveSessionUser(session);
  }
}