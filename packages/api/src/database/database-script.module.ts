import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module.js';
import { DatabaseService } from './services/database.service.js';
import { DatabaseSetupService } from './services/database-setup.service.js';
import { DatabaseMigrateService } from './services/database-migrate.service.js';
import { DatabaseSeedService } from './services/database-seed.service.js';

@Module({
    imports: [AppConfigModule],
    providers: [DatabaseService, DatabaseSetupService, DatabaseMigrateService, DatabaseSeedService],
    exports: [DatabaseService, DatabaseSetupService, DatabaseMigrateService],
})
export class DatabaseScriptModule {}
