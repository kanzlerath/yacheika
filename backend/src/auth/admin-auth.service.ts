import {
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { AdminRole, AdminUserEntity } from '../entities/admin-user.entity';

export interface AdminSession {
  adminId: string;
  email: string;
  role: AdminRole;
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
export class AdminAuthService implements OnModuleInit {
  private readonly logger = new Logger(AdminAuthService.name);
  private readonly sessionTtlSeconds = Number(process.env.ADMIN_SESSION_TTL_SECONDS || 604800);

  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: Repository<AdminUserEntity>,
  ) {}

  async onModuleInit() {
    await this.ensureOwnerAccount();
  }

  private get sessionSecret() {
    return process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SESSION_SECRET;
  }

  private decodePasswordHash(rawHash: string) {
    const trimmed = rawHash.trim();
    if (trimmed.startsWith('$2a$') || trimmed.startsWith('$2b$') || trimmed.startsWith('$2y$')) {
      return trimmed;
    }

    const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim();
    if (decoded.startsWith('$2a$') || decoded.startsWith('$2b$') || decoded.startsWith('$2y$')) {
      return decoded;
    }

    throw new ServiceUnavailableException('Admin owner password hash is invalid');
  }

  private assertSessionConfigured() {
    if (!this.sessionSecret) {
      throw new ServiceUnavailableException('Admin session signing is not configured');
    }
  }

  private createSessionToken(session: AdminSession) {
    this.assertSessionConfigured();
    const payload = toBase64Url(JSON.stringify(session));
    const signature = toBase64Url(
      createHmac('sha256', this.sessionSecret).update(payload).digest(),
    );
    return `${payload}.${signature}`;
  }

  async ensureOwnerAccount() {
    const email = process.env.ADMIN_OWNER_EMAIL?.trim().toLowerCase();
    const rawPasswordHash = process.env.ADMIN_OWNER_PASSWORD_HASH?.trim();

    if (!email || !rawPasswordHash) {
      this.logger.warn('Admin owner bootstrap skipped: ADMIN_OWNER_EMAIL or ADMIN_OWNER_PASSWORD_HASH is missing');
      return;
    }

    const passwordHash = this.decodePasswordHash(rawPasswordHash);

    const existing = await this.adminRepository.findOne({ where: { email } });
    if (existing) {
      if (existing.role !== 'owner' || existing.passwordHash !== passwordHash || existing.status !== 'active') {
        this.adminRepository.merge(existing, {
          role: 'owner',
          status: 'active',
          passwordHash,
        });
        await this.adminRepository.save(existing);
        this.logger.log(`Admin owner account updated for ${email}`);
      } else {
        this.logger.log(`Admin owner account already configured for ${email}`);
      }
      return;
    }

    await this.adminRepository.save(
      this.adminRepository.create({
        email,
        passwordHash,
        role: 'owner',
        status: 'active',
      }),
    );
    this.logger.log(`Admin owner account created for ${email}`);
  }

  verifySessionToken(token?: string): AdminSession {
    this.assertSessionConfigured();
    if (!token) throw new UnauthorizedException('Missing admin token');

    const [payload, signature] = token.split('.');
    if (!payload || !signature) throw new UnauthorizedException('Invalid admin token');

    const expectedSignature = toBase64Url(
      createHmac('sha256', this.sessionSecret).update(payload).digest(),
    );

    if (!secureTextEquals(signature, expectedSignature)) {
      throw new UnauthorizedException('Invalid admin token');
    }

    const session = JSON.parse(fromBase64Url(payload)) as AdminSession;
    const now = Math.floor(Date.now() / 1000);

    if (!session.adminId || !session.email || !session.role || !session.exp || session.exp <= now) {
      throw new UnauthorizedException('Admin token expired');
    }

    return session;
  }

  async login(emailInput: string, password: string) {
    const email = emailInput?.trim().toLowerCase();
    if (!email || !password) {
      this.logger.warn('Admin login rejected: email or password is empty');
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin || admin.status !== 'active') {
      this.logger.warn(
        `Admin login rejected for ${email}: ${admin ? `status is ${admin.status}` : 'admin user not found'}`,
      );
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const passwordMatches = await compare(password, admin.passwordHash);
    if (!passwordMatches) {
      this.logger.warn(`Admin login rejected for ${email}: password hash did not match`);
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const now = Math.floor(Date.now() / 1000);
    admin.lastLoginAt = new Date();
    await this.adminRepository.save(admin);

    const token = this.createSessionToken({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      exp: now + this.sessionTtlSeconds,
    });

    return {
      token,
      admin: this.toPublicAdmin(admin),
      expiresAt: new Date((now + this.sessionTtlSeconds) * 1000).toISOString(),
    };
  }

  async resolveSessionAdmin(session: AdminSession) {
    const admin = await this.adminRepository.findOne({ where: { id: session.adminId } });
    if (!admin || admin.status !== 'active') {
      throw new UnauthorizedException('Admin session user does not exist');
    }

    return {
      admin: this.toPublicAdmin(admin),
      expiresAt: new Date(session.exp * 1000).toISOString(),
    };
  }

  requireOwner(session: AdminSession) {
    if (session.role !== 'owner') {
      throw new ForbiddenException('Owner access is required');
    }
  }

  private toPublicAdmin(admin: AdminUserEntity) {
    return {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  }
}
