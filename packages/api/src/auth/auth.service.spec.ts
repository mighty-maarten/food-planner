import { Logger, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { UsersService } from '../users/users.service.js';
import { PasswordHelper } from '../users/password.helper.js';
import type { SessionsService } from './sessions.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
    let service: AuthService;
    const mockUsersService = {
        findByEmail: vi.fn(),
        findById: vi.fn(),
        updateLastLogin: vi.fn(),
    };
    const mockSessionsService = { create: vi.fn(), use: vi.fn(), revoke: vi.fn() };
    const mockJwtService = { signAsync: vi.fn() };
    const verify = vi.spyOn(PasswordHelper, 'verify');
    const expiresAt = new Date('2027-01-01T00:00:00Z');

    const existingUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Jane',
        passwordHash: 'hashed-password',
    };

    beforeEach(() => {
        verify.mockReset();
        vi.clearAllMocks();
        mockUsersService.findByEmail.mockResolvedValue(existingUser);
        mockUsersService.findById.mockResolvedValue(existingUser);
        mockUsersService.updateLastLogin.mockResolvedValue(undefined);
        mockSessionsService.create.mockResolvedValue({ token: 'refresh-token', expiresAt });
        mockSessionsService.revoke.mockResolvedValue(undefined);
        mockJwtService.signAsync.mockResolvedValue('signed-token');
        service = new AuthService(
            mockUsersService as unknown as UsersService,
            mockSessionsService as unknown as SessionsService,
            mockJwtService as unknown as JwtService,
        );
    });

    describe('login', () => {
        it('returns an access token and starts a session', async () => {
            verify.mockResolvedValue(true);

            const result = await service.login('user@example.com', 'correct-password', 'Safari');

            expect(result.response.accessToken).toBe('signed-token');
            expect(result.response.user).toEqual({
                id: 'user-123',
                email: 'user@example.com',
                name: 'Jane',
            });
            expect(result.refreshToken).toBe('refresh-token');
            expect(result.refreshExpiresAt).toBe(expiresAt);
            expect(mockJwtService.signAsync).toHaveBeenCalledWith({
                sub: 'user-123',
                email: 'user@example.com',
                name: 'Jane',
            });
            expect(mockSessionsService.create).toHaveBeenCalledWith('user-123', 'Safari');
            expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(
                'user-123',
                expect.any(Date),
            );
        });

        it('rejects an unknown user', async () => {
            mockUsersService.findByEmail.mockResolvedValue(null);

            await expect(service.login('nobody@example.com', 'x', null)).rejects.toThrow(
                UnauthorizedException,
            );
            expect(mockSessionsService.create).not.toHaveBeenCalled();
        });

        it('rejects an invalid password without starting a session', async () => {
            verify.mockResolvedValue(false);

            await expect(service.login('user@example.com', 'wrong-password', null)).rejects.toThrow(
                UnauthorizedException,
            );
            expect(mockUsersService.updateLastLogin).not.toHaveBeenCalled();
            expect(mockSessionsService.create).not.toHaveBeenCalled();
        });

        it('still logs in if updating last login fails', async () => {
            verify.mockResolvedValue(true);
            mockUsersService.updateLastLogin.mockRejectedValue(new Error('database unavailable'));
            const loggerErrorSpy = vi
                .spyOn(Logger.prototype, 'error')
                .mockImplementation(() => undefined);

            const result = await service.login('user@example.com', 'correct-password', null);

            expect(result.response.accessToken).toBe('signed-token');
            expect(loggerErrorSpy).toHaveBeenCalled();
            loggerErrorSpy.mockRestore();
        });
    });

    describe('refresh', () => {
        it('issues a new access token for a valid session', async () => {
            mockSessionsService.use.mockResolvedValue({
                user: existingUser,
                expiresAt,
            });

            const result = await service.refresh('refresh-token');

            expect(result.response.accessToken).toBe('signed-token');
            expect(result.refreshToken).toBe('refresh-token');
            expect(result.refreshExpiresAt).toBe(expiresAt);
        });

        it('rejects an unknown or expired session', async () => {
            mockSessionsService.use.mockResolvedValue(null);

            await expect(service.refresh('old-token')).rejects.toThrow(UnauthorizedException);
        });
    });

    it('revokes the session on logout', async () => {
        await service.logout('refresh-token');
        expect(mockSessionsService.revoke).toHaveBeenCalledWith('refresh-token');
    });
});
