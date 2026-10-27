import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { loadLocalEnvFile } from '../config/config.js';
import { DatabaseScriptModule } from '../database/database-script.module.js';
import { DatabaseService } from '../database/services/database.service.js';
import { clusterDishes, clusterIngredients } from './clustering.js';
import { importReview, validateReview } from './import-loader.js';
import { parseExport } from './notes-parser.js';
import { readReview, ReviewFileError, toReviewDish, writeReview } from './review-file.js';

// The Apple Notes export and the review file live in the repository root, outside git
const ROOT = resolve(import.meta.dirname, '../../../..');

const USAGE = `
USAGE:
    npm run import -- <command> [options]

COMMANDS:
    review [--input <export>] [--output <file>]   reads the Apple Notes export and writes the
                                                  review file (no database needed)
    load [--review <file>] [--dry-run]            imports the reviewed dishes; with --dry-run
                                                  only reports what it would do

DEFAULTS:
    --input   ${resolve(ROOT, 'export.txt')}
    --output, --review   ${resolve(ROOT, 'import/review.txt')}

EXAMPLES:
    npm run import:local -- review
    npm run import:local -- load --dry-run
    npm run import:local -- load
`;

const [command, ...rest] = process.argv.slice(2);
const option = (name: string): string | undefined => {
    const index = rest.indexOf(`--${name}`);
    return index === -1 ? undefined : rest[index + 1];
};
const defaultReview = resolve(ROOT, 'import/review.txt');

function review(): void {
    const input = resolve(option('input') ?? resolve(ROOT, 'export.txt'));
    const output = resolve(option('output') ?? defaultReview);
    if (existsSync(output) && !rest.includes('--force')) {
        throw new Error(`${output} exists (it may hold your review), add --force to replace it`);
    }
    const entries = parseExport(readFileSync(input, 'utf8'));
    const dishes = clusterDishes(entries);
    const skipped = clusterDishes(
        entries
            .filter((entry) => entry.kind === 'not-a-dish')
            .map((entry) => ({ ...entry, kind: 'dish' as const })),
    );
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(
        output,
        writeReview(
            dishes.map(toReviewDish),
            skipped.map(toReviewDish),
            clusterIngredients(dishes),
        ),
    );
    const count = (kind: string) => entries.filter((e) => e.kind === kind).length;
    console.log(`Read ${String(entries.length)} days from ${input}:`);
    console.log(`  ${String(count('dish'))} dishes, grouped into ${String(dishes.length)} dishes`);
    console.log(`  ${String(count('no-cooking'))} days without cooking (left out)`);
    console.log(
        `  ${String(count('not-a-dish'))} other plans (eating out, work, ...) under [skip]`,
    );
    console.log(`Wrote ${output}, review it and then run: npm run import:local -- load`);
}

async function load(): Promise<void> {
    const file = resolve(option('review') ?? defaultReview);
    const reviewed = readReview(readFileSync(file, 'utf8'));
    const errors = validateReview(reviewed);
    if (errors.length) {
        throw new ReviewFileError(`The review file has errors:\n- ${errors.join('\n- ')}`);
    }
    const dryRun = rest.includes('--dry-run');

    loadLocalEnvFile();
    const app = await NestFactory.createApplicationContext(DatabaseScriptModule, {
        logger: ['error', 'warn'],
    });
    const dataSource = await app.get(DatabaseService).getDataSource().initialize();
    try {
        const result = await importReview(dataSource, reviewed, dryRun);
        console.log(
            `${dryRun ? 'Would import' : 'Imported'} ${String(reviewed.dishes.length)} dishes: ` +
                `${String(result.created)} new, ${String(result.updated)} existing (count updated), ` +
                `${String(result.ingredientsCreated)} new ingredients.`,
        );
        if (dryRun) console.log('Dry run: nothing was saved.');
    } finally {
        await dataSource.destroy();
        await app.close();
    }
}

try {
    if (command === 'review') {
        review();
    } else if (command === 'load') {
        await load();
    } else {
        console.log(USAGE);
        process.exit(command && !['--help', '-h'].includes(command) ? 1 : 0);
    }
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
}
