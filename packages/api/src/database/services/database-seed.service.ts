import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { DatabaseHelper } from '../database.helper.js';

const DATA_PATH = join(import.meta.dirname, '../files/data');

@Injectable()
export class DatabaseSeedService {
    /**
     * The users of a local setup, part of every database setup: the real accounts from the
     * git-ignored users.local.sql when present, else the development user of users.sql.
     */
    public async seedUsers(dataSource: DataSource): Promise<void> {
        const local = existsSync(join(DATA_PATH, 'users.local.sql'));
        await this.apply(local ? 'users.local.sql' : 'users.sql', dataSource);
    }

    /** Stores, ingredients and dishes to try the app with, applied by hand */
    public async seedSampleLibrary(dataSource: DataSource): Promise<void> {
        await this.apply('sample-library.sql', dataSource);
    }

    private async apply(file: string, dataSource: DataSource): Promise<void> {
        console.log('Seeding data:');
        await DatabaseHelper.processSqlFile(join(DATA_PATH, file), dataSource);
        console.log('Seeded successfully\n');
    }
}
