import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { LessThan, Repository } from 'typeorm';
import { AppConfigService } from '../config/app-config.service.js';
import { SessionEntity } from '../database/entities/session.entity.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Long-lived device sessions behind the refresh cookie. The expiry slides on every refresh,
 * so an installed PWA that is opened regularly stays logged in.
 */
@Injectable()
export class SessionsService {
    constructor(
        @InjectRepository(SessionEntity)
        private sessionRepository: Repository<SessionEntity>,
        private configService: AppConfigService,
    ) {}

    public async create(
        userId: string,
        userAgent: string | null,
    ): Promise<{ token: string; expiresAt: Date }> {
        const token = randomBytes(32).toString('base64url');
        const now = new Date();
        const expiresAt = this.getExpiry(now);
        await this.sessionRepository.insert({
            userId,
            tokenHash: SessionsService.hash(token),
            userAgent: userAgent?.slice(0, 500) ?? null,
            expiresAt,
            lastUsedAt: now,
        });
        // Opportunistic cleanup, there are only a handful of sessions per user
        await this.sessionRepository.delete({ expiresAt: LessThan(now) });
        return { token, expiresAt };
    }

    /** Returns the session for a valid token and extends its expiry, or null */
    public async use(token: string): Promise<SessionEntity | null> {
        const session = await this.sessionRepository.findOne({
            where: { tokenHash: SessionsService.hash(token) },
            relations: { user: true },
        });
        const now = new Date();
        if (!session || session.expiresAt < now) {
            return null;
        }
        session.lastUsedAt = now;
        session.expiresAt = this.getExpiry(now);
        await this.sessionRepository.update(session.id, {
            lastUsedAt: session.lastUsedAt,
            expiresAt: session.expiresAt,
        });
        return session;
    }

    public async revoke(token: string): Promise<void> {
        await this.sessionRepository.delete({
            tokenHash: SessionsService.hash(token),
        });
    }

    public static hash(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private getExpiry(from: Date): Date {
        return new Date(from.getTime() + this.configService.get('REFRESH_TOKEN_TTL_DAYS') * DAY_MS);
    }
}
