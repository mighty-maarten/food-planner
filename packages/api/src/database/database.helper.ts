import { readFileSync } from 'node:fs';
import { type DataSource, QueryFailedError } from 'typeorm';

// PostgreSQL error codes, see https://www.postgresql.org/docs/current/errcodes-appendix.html
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

const hasErrorCode = (error: unknown, code: string): boolean =>
    error instanceof QueryFailedError &&
    (error.driverError as { code?: unknown } | undefined)?.code === code;

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

    isUniqueViolation(error: unknown): boolean {
        return hasErrorCode(error, UNIQUE_VIOLATION);
    },

    isForeignKeyViolation(error: unknown): boolean {
        return hasErrorCode(error, FOREIGN_KEY_VIOLATION);
    },

    quoteIdentifier(identifier: string): string {
        return `"${identifier.replace(/"/g, '""')}"`;
    },
};
