import { Injectable } from '@nestjs/common';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DataSource } from 'typeorm';
import { DatabaseHelper } from '../database.helper.js';

export interface MigrationVersion {
    version: number;
    filePath: string;
}

const MIGRATIONS_PATH = resolve(import.meta.dirname, '../files/migrations');
const MIGRATION_FILE_PATTERN = /^(\d+)\..*\.sql$/;

@Injectable()
export class DatabaseMigrateService {
    public async migrate(dataSource: DataSource): Promise<void> {
        const available = DatabaseMigrateService.getAvailableMigrations(
            existsSync(MIGRATIONS_PATH) ? readdirSync(MIGRATIONS_PATH) : [],
        );
        const currentVersion = await this.getCurrentVersion(dataSource);

        console.log('Following migrations exist:');
        this.printVersions(available, currentVersion);
        console.log('Current version:', currentVersion);

        const migrationsToRun = available.filter((m) => m.version > currentVersion);
        if (migrationsToRun.length === 0) {
            console.log('Already on latest version, nothing to do.');
            return;
        }

        console.log('Following migrations will be executed:');
        this.printVersions(migrationsToRun);

        for (const migration of migrationsToRun) {
            console.log(`Migrating to version ${String(migration.version)}:`);
            await DatabaseHelper.processMigrationFile(migration.filePath, dataSource);
            await dataSource.query(
                'INSERT INTO versions (version, updated_on) VALUES ($1, CURRENT_TIMESTAMP)',
                [migration.version],
            );
            console.log(`Successfully migrated to version ${String(migration.version)}.`);
        }
    }

    /** Parses `NNN.description.sql` files and checks they form an unbroken sequence starting at 1 */
    public static getAvailableMigrations(files: string[]): MigrationVersion[] {
        const versions = files
            .flatMap((file) => {
                const version = MIGRATION_FILE_PATTERN.exec(file)?.[1];
                return version
                    ? [{ version: Number(version), filePath: resolve(MIGRATIONS_PATH, file) }]
                    : [];
            })
            .sort((a, b) => a.version - b.version);

        versions.forEach((migration, index) => {
            if (migration.version !== index + 1) {
                throw new Error(
                    `Migrations must be numbered sequentially from 1 without gaps or duplicates (found ${migration.filePath} at position ${String(index + 1)})`,
                );
            }
        });
        return versions;
    }

    private async getCurrentVersion(dataSource: DataSource): Promise<number> {
        // pg returns INT as a number, but be safe with older drivers returning strings
        const rows: { version: number | string }[] = await dataSource.query(
            'SELECT version FROM versions ORDER BY version DESC LIMIT 1;',
        );
        return Number(rows[0]?.version ?? 0);
    }

    private printVersions(data: MigrationVersion[], currentVersion?: number) {
        for (const row of data) {
            console.log(
                `${currentVersion === row.version ? '*' : '-'} Version ${String(row.version)} \t=>\t ${row.filePath}`,
            );
        }
        console.log();
    }
}
