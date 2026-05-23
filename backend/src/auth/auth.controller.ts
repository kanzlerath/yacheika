import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TelegramLoginWidgetPayload } from './telegram-auth.utils';

interface TelegramAuthRequestBody {
  initData?: string;
  loginWidgetUser?: TelegramLoginWidgetPayload;
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('telegram')
  async authenticateTelegram(@Body() body: TelegramAuthRequestBody) {
    return this.authService.authenticate(body);
  }

  @Get('me')
  async getMe(@Headers('authorization') authHeader?: string) {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const session = this.authService.verifySessionToken(token);
    return this.authService.resolveSessionUser(session);
  }
}
