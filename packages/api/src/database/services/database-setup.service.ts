import { Injectable } from '@nestjs/common';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { AppConfigService } from '../../config/app-config.service.js';
import { DatabaseHelper } from '../database.helper.js';
import { DatabaseService } from './database.service.js';

@Injectable()
export class DatabaseSetupService {
    constructor(
        private readonly configService: AppConfigService,
        private readonly databaseService: DatabaseService,
    ) {}

    /**
     * Creates the database on first start. An empty database (as the postgres Docker image
     * creates it from POSTGRES_DB) only gets the initial definitions.
     */
    public async setupDatabaseIfNotExists(): Promise<void> {
        const postgresDataSource = await this.databaseService.getPostgresDataSource().initialize();
        let exists: boolean;
        try {
            exists = await this.databaseExists(postgresDataSource);
        } finally {
            await postgresDataSource.destroy();
        }
        if (!exists) {
            console.log('Database does not exist yet, creating...');
            await this.setupDatabase();
            return;
        }

        const dataSource = await this.databaseService.getDataSource().initialize();
        try {
            const [row] = await dataSource.query<{ table: string | null }[]>(
                "SELECT to_regclass('public.versions')::text AS table",
            );
            if (!row?.table) {
                console.log('Database is empty, adding the initial definitions...');
                await this.applyDefinitions(dataSource);
            }
        } finally {
            await dataSource.destroy();
        }
    }

    /** Drops (if it exists) and recreates the app database with the initial definitions */
    public async setupDatabase(): Promise<void> {
        const databaseName = this.configService.get('DATABASE_NAME');
        const quotedName = DatabaseHelper.quoteIdentifier(databaseName);

        const postgresDataSource = await this.databaseService.getPostgresDataSource().initialize();
        try {
            if (await this.databaseExists(postgresDataSource)) {
                console.log(`Dropping database ${databaseName}`);
                await postgresDataSource.query(
                    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid();',
                    [databaseName],
                );
                await postgresDataSource.query(`DROP DATABASE IF EXISTS ${quotedName}`);
            }
            await postgresDataSource.query(`CREATE DATABASE ${quotedName}`);
        } finally {
            await postgresDataSource.destroy();
        }

        const dataSource = await this.databaseService.getDataSource().initialize();
        try {
            await this.applyDefinitions(dataSource);
        } finally {
            await dataSource.destroy();
        }
        console.log('Created database and initial definitions successfully\n');
    }

    /** The tables the migrations build on (the migration version table) */
    private async applyDefinitions(dataSource: DataSource): Promise<void> {
        await DatabaseHelper.processSqlFile(
            join(import.meta.dirname, '../files/definitions/public.sql'),
            dataSource,
        );
    }

    private async databaseExists(postgresDataSource: DataSource): Promise<boolean> {
        const result: { exists: boolean }[] = await postgresDataSource.query(
            'SELECT exists(SELECT datname FROM pg_catalog.pg_database WHERE datname = $1);',
            [this.configService.get('DATABASE_NAME')],
        );
        return !!result[0]?.exists;
    }
}
