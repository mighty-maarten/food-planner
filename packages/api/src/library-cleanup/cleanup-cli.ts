import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { loadLocalEnvFile } from '../config/config.js';
import { DatabaseScriptModule } from '../database/database-script.module.js';
import { DatabaseService } from '../database/services/database.service.js';
import { applyCleanup, type CleanupReport } from './cleanup-apply.js';
import { readCleanup } from './cleanup-file.js';

// The cleanup file lives in the repository root, outside git (import/)
const ROOT = resolve(import.meta.dirname, '../../../..');

const USAGE = `
USAGE:
    npm run library-cleanup -- apply [--file <file>] [--dry-run]

    Applies the reviewed library cleanup (categories, merged ingredients and dishes, ingredients
    of dishes) to the database, by name, in one transaction. Safe to run again.

DEFAULTS:
    --file   ${resolve(ROOT, 'import/cleanup.txt')}

EXAMPLES:
    npm run library-cleanup:local -- apply --dry-run
    docker compose exec app npm run library-cleanup -- apply --file /tmp/cleanup.txt --dry-run
`;

const [command, ...rest] = process.argv.slice(2);
const option = (name: string): string | undefined => {
    const index = rest.indexOf(`--${name}`);
    return index === -1 ? undefined : rest[index + 1];
};

function print(report: CleanupReport, dryRun: boolean): void {
    console.log(dryRun ? 'Dry run, nothing was saved. It would:' : 'Applied:');
    console.log(
        `  ingredients: ${String(report.ingredientsMerged)} merged, ${String(report.ingredientsRenamed)} renamed, ` +
            `${String(report.ingredientsCreated)} created, ${String(report.ingredientsCategorised)} given a category, ` +
            `${String(report.ingredientsRemoved)} removed`,
    );
    console.log(
        `  dishes: ${String(report.dishesMerged)} merged, ${String(report.dishesRenamed)} renamed, ` +
            `${String(report.dishIngredientsSet)} got their ingredients, ${String(report.dishesRemoved)} removed`,
    );
    if (report.ingredientsKeptForLists.length) {
        console.log(`  kept (on a shopping list): ${report.ingredientsKeptForLists.join(', ')}`);
    }
    if (report.dishesKeptForPlans.length) {
        console.log(`  kept (planned): ${report.dishesKeptForPlans.join(', ')}`);
    }
    if (report.notFound.length) {
        console.log(`  not in the database: ${report.notFound.join(', ')}`);
    }
}

async function apply(): Promise<void> {
    const file = resolve(option('file') ?? resolve(ROOT, 'import/cleanup.txt'));
    const cleanup = readCleanup(readFileSync(file, 'utf8'));
    const dryRun = rest.includes('--dry-run');

    loadLocalEnvFile();
    const app = await NestFactory.createApplicationContext(DatabaseScriptModule, {
        logger: ['error', 'warn'],
    });
    const dataSource = await app.get(DatabaseService).getDataSource().initialize();
    try {
        print(await applyCleanup(dataSource, cleanup, dryRun), dryRun);
    } finally {
        await dataSource.destroy();
        await app.close();
    }
}

try {
    if (command === 'apply') {
        await apply();
    } else {
        console.log(USAGE);
        process.exit(command && !['--help', '-h'].includes(command) ? 1 : 0);
    }
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
}
