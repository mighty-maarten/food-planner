import { readFileSync } from 'node:fs';
import type { DataSource } from 'typeorm';

export const DatabaseHelper = {
    async processSqlFile(fileName: string, dataSource: DataSource): Promise<void> {
        console.log(`Processing file: ${fileName}`);
        const query = readFileSync(fileName).toString();
        await dataSource.query(query);
    },

    async processMigrationFile(fileName: string, dataSource: DataSource): Promise<void> {
        console.log(`Processing file: ${fileName}`);
        const fileContent = readFileSync(fileName).toString().trim();
        const upper = fileContent.toUpperCase();
        if (!upper.startsWith('BEGIN;') || !upper.endsWith('COMMIT;')) {
            throw new Error(
                `Migration ${fileName} does not include a transaction. Please start your file with BEGIN; and end with COMMIT;`,
            );
        }
        await dataSource.query(fileContent);
    },

    quoteIdentifier(identifier: string): string {
        return `"${identifier.replace(/"/g, '""')}"`;
    },
};
