import pg from 'pg';
import type { DataSourceOptions } from 'typeorm';
import type { AppConfigService } from '../config/app-config.service.js';
import { SnakeNamingStrategy } from './snake-naming.strategy.js';

// DATE columns stay 'YYYY-MM-DD' strings. By default pg turns them into a Date at local midnight,
// which shifts the day depending on the server's timezone.
pg.types.setTypeParser(pg.types.builtins.DATE, (value: string) => value);

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
