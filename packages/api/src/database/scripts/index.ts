import { NestFactory } from '@nestjs/core';
import { loadLocalEnvFile } from '../../config/config.js';
import { DatabaseScriptModule } from '../database-script.module.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { DatabaseService } from '../services/database.service.js';
import { DatabaseSetupService } from '../services/database-setup.service.js';
import { DatabaseMigrateService } from '../services/database-migrate.service.js';
import { DatabaseSeedService } from '../services/database-seed.service.js';

const options = {
    initialise: false,
    migrate: false,
    seed: false,
};

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
USAGE:
    npm run db:<script> [-- OPTIONS]

OPTIONS:
    -h, --help\t\t prints help information
    -i, --initialize\t drops and creates the database with the initial definitions
    -m, --migrate\t runs all pending migrations
    -s, --seed\t\t seeds the database

EXAMPLES:
    Setup a local database:    npm run db:setup:local
    Migrate a local database:  npm run db:migrate:local
`);
    process.exit(0);
}
options.initialise = args.includes('--initialize') || args.includes('-i');
options.migrate = args.includes('--migrate') || args.includes('-m');
options.seed = args.includes('--seed') || args.includes('-s');

loadLocalEnvFile();
const app = await NestFactory.createApplicationContext(DatabaseScriptModule);
const configService = app.get(AppConfigService);
const setupService = app.get(DatabaseSetupService);
let exitCode = 0;

try {
    if ((options.initialise || options.seed) && !configService.get('ALLOW_DATABASE_SETUP')) {
        throw new Error(
            `Initialising or seeding is not allowed on environment '${configService.get('APP_ENV')}' (ALLOW_DATABASE_SETUP=false)`,
        );
    }

    if (options.initialise) {
        await setupService.setupDatabase();
    } else {
        await setupService.setupDatabaseIfNotExists();
    }

    const dataSource = await app.get(DatabaseService).getDataSource().initialize();
    try {
        if (options.migrate) {
            await app.get(DatabaseMigrateService).migrate(dataSource);
        }
        if (options.seed) {
            await app.get(DatabaseSeedService).seed(dataSource);
        }
    } finally {
        await dataSource.destroy();
    }
    console.log('Done.');
} catch (error) {
    console.error('Errors occurred:', error);
    exitCode = 1;
} finally {
    await app.close();
}
process.exit(exitCode);
