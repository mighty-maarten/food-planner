import { Injectable } from '@nestjs/common';
import { DataSource, type EntitySchema } from 'typeorm';
import { AppConfigService } from '../../config/app-config.service.js';
import { postgresOptions } from '../database-options.js';
import { VersionEntity } from '../entities/version.entity.js';

@Injectable()
export class DatabaseService {
    constructor(private readonly configService: AppConfigService) {}

    /** Connection to the default `postgres` database, used to create/drop the app database */
    public getPostgresDataSource(): DataSource {
        return this.createDataSource('postgres');
    }

    /** Connection to the app database, optionally with extra entities for scripts */
    public getDataSource(entities: EntityClass[] = []): DataSource {
        return this.createDataSource(this.configService.get('DATABASE_NAME'), entities);
    }

    private createDataSource(database: string, entities: EntityClass[] = []): DataSource {
        return new DataSource({
            ...postgresOptions(this.configService, database),
            entities: [VersionEntity, ...entities],
            connectTimeoutMS: 5000,
        });
    }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type EntityClass = Function | EntitySchema;
