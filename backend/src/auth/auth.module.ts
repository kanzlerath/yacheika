import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AdminUserEntity } from '../entities/admin-user.entity';
import { UserEntity } from '../entities/user.entity';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminGuard } from './admin.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TelegramAuthGuard } from './telegram-auth.guard';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, AdminUserEntity]),
    HttpModule,
  ],
  controllers: [AuthController, AdminAuthController],
  providers: [AuthService, AdminAuthService, TelegramAuthGuard, AdminGuard],
  exports: [AuthService, AdminAuthService, TelegramAuthGuard, AdminGuard],
})
export class AuthModule {}
