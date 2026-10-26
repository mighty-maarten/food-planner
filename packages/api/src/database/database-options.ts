import type { DataSourceOptions } from 'typeorm';
import type { AppConfigService } from '../config/app-config.service.js';
import { SnakeNamingStrategy } from './snake-naming.strategy.js';

// Self-hosted PostgreSQL runs next to the API on a private Docker network, so SSL is optional.
export function postgresOptions(config: AppConfigService, database = config.get('DATABASE_NAME')) {
    return {
        type: 'postgres',
        host: config.get('DATABASE_HOST'),
        port: config.get('DATABASE_PORT'),
        username: config.get('DATABASE_USERNAME'),
        password: config.get('DATABASE_PASSWORD'),
        database,
        ssl: config.get('DATABASE_SSL'),
        namingStrategy: new SnakeNamingStrategy(),
        logging: false,
    } satisfies DataSourceOptions;
}
