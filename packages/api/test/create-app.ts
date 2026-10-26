import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { AppController } from '../src/app.controller.js';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { JwtStrategy } from '../src/auth/jwt.strategy.js';
import type { JwtPayload } from '../src/auth/types.js';
import { RequestIdMiddleware } from '../src/common/request-id.middleware.js';
import { createValidationPipe } from '../src/common/validation.pipe.js';
import { AppConfigService } from '../src/config/app-config.service.js';
import { loadConfig } from '../src/config/config.js';
import { GlobalErrorFilter } from '../src/error-filters/global.error-filter.js';
import { configureHttp } from '../src/http-server.js';

const config = loadConfig({
    APP_ENV: 'production',
    DATABASE_HOST: 'unused',
    DATABASE_USERNAME: 'unused',
    DATABASE_PASSWORD: 'unused',
    DATABASE_NAME: 'unused',
    JWT_SECRET: 'e2e-secret-0123456789abcdef0123456789abcdef',
});

export const testUser = { id: 'user-1', email: 'jane@example.com', name: 'Jane' };

export type AuthServiceMock = Record<
    'login' | 'refresh' | 'logout' | 'validateUser',
    ReturnType<typeof vi.fn>
>;

// The HTTP pipeline as main.ts and AppModule build it (global JWT guard, validation pipe, error
// envelope, request id, headers), with the auth endpoints and a mocked AuthService instead of
// the database. Routes are not prefixed with the module path: /api/login instead of
// /api/auth/login.
export async function createApp(
    authService: AuthServiceMock,
): Promise<{ app: NestExpressApplication; accessToken: string }> {
    const moduleRef = await Test.createTestingModule({
        imports: [
            PassportModule,
            JwtModule.register({ secret: config.JWT_SECRET }),
            ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
        ],
        controllers: [AppController, AuthController],
        providers: [
            { provide: AppConfigService, useValue: new AppConfigService(config) },
            { provide: AuthService, useValue: authService },
            JwtStrategy,
            { provide: APP_FILTER, useClass: GlobalErrorFilter },
            { provide: APP_GUARD, useClass: JwtAuthGuard },
            { provide: APP_PIPE, useFactory: createValidationPipe },
        ],
    }).compile();

    const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    configureHttp(app, config.TRUST_PROXY_HOPS);
    const requestId = new RequestIdMiddleware();
    app.use((req: Request, res: Response, next: NextFunction) => {
        requestId.use(req, res, next);
    });
    app.use(cookieParser());
    app.setGlobalPrefix('api', { exclude: ['/status'] });
    await app.init();

    const payload: JwtPayload = { sub: testUser.id, email: testUser.email, name: testUser.name };
    const accessToken = await app.get(JwtService).signAsync(payload);
    return { app, accessToken };
}
