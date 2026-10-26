import type { Repository } from 'typeorm';
import type { AppConfigService } from '../config/app-config.service.js';
import type { SessionEntity } from '../database/entities/session.entity.js';
import { SessionsService } from './sessions.service.js';

describe('SessionsService', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const repository = {
        insert: vi.fn(),
        delete: vi.fn(),
        findOne: vi.fn(),
        update: vi.fn(),
    };
    let service: SessionsService;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
        vi.clearAllMocks();
        const config = {
            get: () => 90,
        } as unknown as AppConfigService;
        service = new SessionsService(repository as unknown as Repository<SessionEntity>, config);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('stores only the hash of a new token', async () => {
        const { token, expiresAt } = await service.create('user-1', 'Safari');

        expect(token).toMatch(/^[\w-]{43}$/);
        expect(expiresAt.getTime()).toBe(Date.now() + 90 * DAY_MS);
        expect(repository.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'user-1',
                tokenHash: SessionsService.hash(token),
                userAgent: 'Safari',
            }),
        );
    });

    it('slides the expiry of a valid session', async () => {
        repository.findOne.mockResolvedValue({
            id: 'session-1',
            expiresAt: new Date(Date.now() + DAY_MS),
        });

        const session = await service.use('token');

        expect(session?.expiresAt.getTime()).toBe(Date.now() + 90 * DAY_MS);
        expect(repository.update).toHaveBeenCalledWith(
            'session-1',
            expect.objectContaining({ expiresAt: session?.expiresAt }),
        );
    });

    it('rejects an expired session', async () => {
        repository.findOne.mockResolvedValue({
            id: 'session-1',
            expiresAt: new Date(Date.now() - 1),
        });

        expect(await service.use('token')).toBeNull();
        expect(repository.update).not.toHaveBeenCalled();
    });
});
