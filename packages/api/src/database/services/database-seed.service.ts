import { Injectable } from '@nestjs/common';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { DatabaseHelper } from '../database.helper.js';

const SEED_FILES = ['seed.sql'];

@Injectable()
export class DatabaseSeedService {
    public async seed(dataSource: DataSource): Promise<void> {
        console.log('Seeding data:');
        for (const file of SEED_FILES) {
            await DatabaseHelper.processSqlFile(
                join(import.meta.dirname, '../files/data', file),
                dataSource,
            );
        }
        console.log('Seeded successfully\n');
    }
}
