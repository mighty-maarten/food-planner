import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { type AuthServiceMock, createApp, testUser } from './create-app.js';

describe('Auth (e2e)', () => {
    let app: NestExpressApplication;
    let accessToken: string;
    const result = {
        response: { accessToken: 'access-token', user: testUser },
        refreshToken: 'refresh-token',
        refreshExpiresAt: new Date('2027-01-01T00:00:00Z'),
    };
    const authService: AuthServiceMock = {
        login: vi.fn(),
        refresh: vi.fn(),
        logout: vi.fn(),
        validateUser: vi.fn(),
    };

    const firstCookie = (response: request.Response): string =>
        [response.headers['set-cookie']].flat()[0] ?? '';

    beforeEach(async () => {
        vi.clearAllMocks();
        authService.login.mockResolvedValue(result);
        authService.refresh.mockResolvedValue(result);
        authService.logout.mockResolvedValue(undefined);
        authService.validateUser.mockResolvedValue(true);
        ({ app, accessToken } = await createApp(authService));
    });

    afterEach(async () => {
        await app.close();
    });

    describe('POST /login', () => {
        it('sets an httpOnly refresh cookie', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/login')
                .set('User-Agent', 'Safari')
                .send({ email: 'jane@example.com', password: 'secret' })
                .expect(200);

            expect(response.body).toEqual({ accessToken: 'access-token', user: testUser });
            const cookie = firstCookie(response);
            expect(cookie).toMatch(/^fp_refresh=refresh-token;/);
            expect(cookie).toMatch(/HttpOnly/);
            expect(cookie).toMatch(/Secure/);
            expect(cookie).toMatch(/SameSite=Strict/);
            expect(cookie).toMatch(/Path=\/api\/auth/);
            expect(authService.login).toHaveBeenCalledWith('jane@example.com', 'secret', 'Safari');
        });

        it('returns field errors in the error envelope', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/login')
                .send({ email: 'not-an-email', password: '' })
                .expect(400);

            expect(response.body).toEqual({
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'email must be an email',
                    requestId: response.headers['x-request-id'],
                    details: {
                        fields: [
                            { field: 'email', message: 'email must be an email' },
                            { field: 'password', message: 'password should not be empty' },
                        ],
                    },
                },
            });
        });

        it('returns UNAUTHENTICATED for invalid credentials', async () => {
            const { UnauthorizedException } = await import('@nestjs/common');
            authService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

            const response = await request(app.getHttpServer())
                .post('/api/login')
                .send({ email: 'jane@example.com', password: 'wrong' })
                .expect(401);

            expect(response.body.error).toMatchObject({
                code: 'UNAUTHENTICATED',
                message: 'Invalid credentials',
            });
        });
    });

    describe('POST /refresh', () => {
        it('uses the cookie', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/refresh')
                .set('Cookie', 'fp_refresh=refresh-token')
                .expect(200);

            expect(response.body.accessToken).toBe('access-token');
            expect(authService.refresh).toHaveBeenCalledWith('refresh-token');
        });

        it('is unauthorized without a cookie', async () => {
            await request(app.getHttpServer()).post('/api/refresh').expect(401);
            expect(authService.refresh).not.toHaveBeenCalled();
        });
    });

    it('POST /logout revokes the session and clears the cookie', async () => {
        const response = await request(app.getHttpServer())
            .post('/api/logout')
            .set('Cookie', 'fp_refresh=refresh-token')
            .expect(204);

        expect(authService.logout).toHaveBeenCalledWith('refresh-token');
        expect(firstCookie(response)).toMatch(/^fp_refresh=;.*Expires=Thu, 01 Jan 1970/);
    });

    describe('GET /current-user (protected by the global guard)', () => {
        it('returns the user for a valid access token', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/current-user')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toEqual(testUser);
            expect(response.headers['cache-control']).toBe('no-store');
        });

        it('rejects a missing token', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/current-user')
                .expect(401);
            expect(response.body.error.code).toBe('UNAUTHENTICATED');
        });

        it('rejects a token of a user that no longer exists', async () => {
            authService.validateUser.mockResolvedValue(false);
            await request(app.getHttpServer())
                .get('/api/current-user')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(401);
        });
    });
});
