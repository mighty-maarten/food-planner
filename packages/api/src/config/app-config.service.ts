import type { AppConfig } from './config.js';

export class AppConfigService {
    constructor(private readonly config: AppConfig) {}

    public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
        return this.config[key];
    }
}
