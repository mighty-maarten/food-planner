import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE, RouterModule } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { AppController } from './app.controller.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { RequestIdMiddleware } from './common/request-id.middleware.js';
import { RequestLoggingMiddleware } from './common/request-logging.middleware.js';
import { createValidationPipe } from './common/validation.pipe.js';
import { AppConfigModule } from './config/app-config.module.js';
import { AppConfigService } from './config/app-config.service.js';
import { DatabaseScriptModule } from './database/database-script.module.js';
import { postgresOptions } from './database/database-options.js';
import { DatabaseMigrateService } from './database/services/database-migrate.service.js';
import { DatabaseService } from './database/services/database.service.js';
import { DatabaseSetupService } from './database/services/database-setup.service.js';
import { GlobalErrorFilter } from './error-filters/global.error-filter.js';
import { AppLogger, createLogger } from './logger.js';
import { getModulesFromRoutes, routes } from './routes.js';

@Module({
    imports: [
        AppConfigModule,
        TypeOrmModule.forRootAsync({
            imports: [DatabaseScriptModule],
            inject: [
                AppConfigService,
                DatabaseService,
                DatabaseSetupService,
                DatabaseMigrateService,
            ],
            useFactory: async (
                configService: AppConfigService,
                databaseService: DatabaseService,
                setupService: DatabaseSetupService,
                migrateService: DatabaseMigrateService,
            ) => {
                // Creates the database on first start and applies pending migrations,
                // so a deploy is just building and restarting the container
                await setupService.setupDatabaseIfNotExists();
                const dataSource = await databaseService.getDataSource().initialize();
                try {
                    await migrateService.migrate(dataSource);
                } finally {
                    await dataSource.destroy();
                }
                return {
                    ...postgresOptions(configService),
                    autoLoadEntities: true,
                };
            },
        }),
        // Serves the built client from the same origin (client/dist), SPA fallback to index.html
        ServeStaticModule.forRoot({
            rootPath: resolve(import.meta.dirname, '../../client/dist'),
            exclude: ['/api/{*path}', '/status', '/swagger/{*path}'],
            serveStaticOptions: {
                // Built assets have a content hash in their name. Everything else (index.html,
                // the service worker, the manifest) is revalidated so updates reach the PWA.
                setHeaders: (response: ServerResponse, path: string) => {
                    if (path.includes('/assets/')) {
                        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                    }
                },
            },
        }),
        RouterModule.register(routes),
        ...getModulesFromRoutes(routes),
    ],
    controllers: [AppController],
    providers: [
        { provide: APP_FILTER, useClass: GlobalErrorFilter },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_PIPE, useFactory: createValidationPipe },
        // A provider, so Nest calls its shutdown hook (flush) when the app stops.
        { provide: AppLogger, useFactory: createLogger, inject: [AppConfigService] },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestIdMiddleware, RequestLoggingMiddleware).forRoutes('{*path}');
    }
}
