import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { AdminGuard } from './admin.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TelegramAuthGuard } from './telegram-auth.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [AuthController],
  providers: [AuthService, TelegramAuthGuard, AdminGuard],
  exports: [AuthService, TelegramAuthGuard, AdminGuard],
})
export class AuthModule {}
