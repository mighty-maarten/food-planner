import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { type AuthServiceMock, createApp } from './create-app.js';

describe('App (e2e)', () => {
    let app: NestExpressApplication;
    const authService: AuthServiceMock = {
        login: vi.fn(),
        refresh: vi.fn(),
        logout: vi.fn(),
        validateUser: vi.fn(),
    };

    beforeEach(async () => {
        ({ app } = await createApp(authService));
    });

    afterEach(async () => {
        await app.close();
    });

    it('GET /status is public', async () => {
        const response = await request(app.getHttpServer()).get('/status').expect(200);
        expect(response.body).toEqual({ status: 'ok' });
    });

    it('adds a request id, or reuses a well-formed incoming one', async () => {
        const generated = await request(app.getHttpServer()).get('/status');
        expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);

        const reused = await request(app.getHttpServer())
            .get('/status')
            .set('X-Request-Id', 'proxy-123');
        expect(reused.headers['x-request-id']).toBe('proxy-123');

        const replaced = await request(app.getHttpServer())
            .get('/status')
            .set('X-Request-Id', 'not valid!');
        expect(replaced.headers['x-request-id']).not.toBe('not valid!');
    });

    it('returns NOT_FOUND for unknown routes without echoing the URL', async () => {
        const response = await request(app.getHttpServer())
            .get('/api/unknown?secret=1')
            .expect(404);

        expect(response.body.error).toMatchObject({
            code: 'NOT_FOUND',
            message: 'Route not found.',
        });
        expect(JSON.stringify(response.body)).not.toContain('secret');
    });

    it('does not reveal the framework', async () => {
        const response = await request(app.getHttpServer()).get('/status');
        expect(response.headers['x-powered-by']).toBeUndefined();
    });
});
