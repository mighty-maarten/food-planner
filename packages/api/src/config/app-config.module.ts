import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service.js';
import { loadConfig } from './config.js';

@Global()
@Module({
    providers: [
        {
            provide: AppConfigService,
            useFactory: () => new AppConfigService(loadConfig()),
        },
    ],
    exports: [AppConfigService],
})
export class AppConfigModule {}
