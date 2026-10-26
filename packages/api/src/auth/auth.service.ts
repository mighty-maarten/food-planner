import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import { User } from '../users/types.js';
import { PasswordHelper } from '../users/password.helper.js';
import type { UserEntity } from '../database/entities/user.entity.js';
import { SessionsService } from './sessions.service.js';
import { AuthResponse, type AuthResult, type JwtPayload } from './types.js';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private sessionsService: SessionsService,
        private jwtService: JwtService,
    ) {}

    public async login(
        email: string,
        password: string,
        userAgent: string | null,
    ): Promise<AuthResult> {
        const user = await this.usersService.findByEmail(email);
        const isPasswordValid =
            !!user && (await PasswordHelper.verify(password, user.passwordHash));

        if (!user || !isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        try {
            await this.usersService.updateLastLogin(user.id, new Date());
        } catch (error) {
            this.logger.error(
                `Failed to update last login for user ${user.id}`,
                error instanceof Error ? error.stack : String(error),
            );
        }

        const session = await this.sessionsService.create(user.id, userAgent);
        return this.buildResult(user, session.token, session.expiresAt);
    }

    public async refresh(refreshToken: string): Promise<AuthResult> {
        const session = await this.sessionsService.use(refreshToken);
        if (!session) {
            throw new UnauthorizedException('Session expired');
        }
        return this.buildResult(session.user, refreshToken, session.expiresAt);
    }

    public async logout(refreshToken: string | undefined): Promise<void> {
        if (refreshToken) {
            await this.sessionsService.revoke(refreshToken);
        }
    }

    public async validateUser(userId: string): Promise<boolean> {
        return !!(await this.usersService.findById(userId));
    }

    private async buildResult(
        user: UserEntity,
        refreshToken: string,
        refreshExpiresAt: Date,
    ): Promise<AuthResult> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            name: user.name,
        };
        const accessToken = await this.jwtService.signAsync(payload);
        return {
            response: new AuthResponse(accessToken, new User(user)),
            refreshToken,
            refreshExpiresAt,
        };
    }
}
