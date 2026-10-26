import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { AppConfigService } from './config/app-config.service.js';
import { loadLocalEnvFile } from './config/config.js';
import { configureHttp, configureHttpServer } from './http-server.js';
import { AppLogger } from './logger.js';
import { setupSwagger } from './swagger.js';

loadLocalEnvFile();

const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
const configService = app.get(AppConfigService);

app.useLogger(app.get(AppLogger));
app.enableShutdownHooks();
configureHttp(app, configService.get('TRUST_PROXY_HOPS'));
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                // PrimeVue injects its theme as inline styles
                'style-src': ["'self'", "'unsafe-inline'"],
            },
        },
    }),
);
app.use(cookieParser());
if (configService.get('ALLOWED_ORIGINS').length > 0) {
    app.enableCors({
        origin: configService.get('ALLOWED_ORIGINS'),
        methods: 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
        credentials: true,
    });
}
app.setGlobalPrefix('api', { exclude: ['/status'] });
if (configService.get('ENABLE_SWAGGER')) {
    setupSwagger(app);
}

await app.listen(configService.get('PORT'));
configureHttpServer(app);
