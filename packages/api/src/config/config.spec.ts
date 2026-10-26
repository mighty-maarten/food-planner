import { loadConfig } from './config.js';

const SECRET = 'a'.repeat(32);
const DATABASE = {
    DATABASE_HOST: 'localhost',
    DATABASE_USERNAME: 'admin',
    DATABASE_PASSWORD: 'admin',
    DATABASE_NAME: 'food_planner_db',
};

describe('loadConfig', () => {
    it('applies defaults when only the required values are set', () => {
        expect(loadConfig({ ...DATABASE, JWT_SECRET: 'local' })).toEqual({
            APP_ENV: 'local',
            PORT: 3000,
            LOG_LEVEL: 'log',
            TRUST_PROXY_HOPS: 0,
            ALLOWED_ORIGINS: [],
            ENABLE_SWAGGER: false,
            ALLOW_DATABASE_SETUP: false,
            ...DATABASE,
            DATABASE_PORT: 5432,
            DATABASE_SSL: false,
            JWT_SECRET: 'local',
            JWT_EXPIRES_IN: '15m',
            REFRESH_TOKEN_TTL_DAYS: 90,
            COOKIE_SECURE: true,
        });
    });

    it('parses values from the environment', () => {
        expect(
            loadConfig({
                ...DATABASE,
                APP_ENV: 'production',
                PORT: '8080',
                TRUST_PROXY_HOPS: '1',
                ALLOWED_ORIGINS: ' https://a.example ,, https://b.example',
                ENABLE_SWAGGER: 'true',
                ALLOW_DATABASE_SETUP: 'false',
                DATABASE_PORT: '5434',
                JWT_SECRET: SECRET,
                JWT_EXPIRES_IN: '1h',
                REFRESH_TOKEN_TTL_DAYS: '30',
                COOKIE_SECURE: 'true',
            }),
        ).toMatchObject({
            APP_ENV: 'production',
            PORT: 8080,
            TRUST_PROXY_HOPS: 1,
            ALLOWED_ORIGINS: ['https://a.example', 'https://b.example'],
            ENABLE_SWAGGER: true,
            ALLOW_DATABASE_SETUP: false,
            DATABASE_PORT: 5434,
            JWT_EXPIRES_IN: '1h',
            REFRESH_TOKEN_TTL_DAYS: 30,
            COOKIE_SECURE: true,
        });
    });

    it('reads "false" as false', () => {
        expect(
            loadConfig({
                ...DATABASE,
                JWT_SECRET: 'local',
                COOKIE_SECURE: 'false',
            }).COOKIE_SECURE,
        ).toBe(false);
    });

    it('rejects missing and invalid values', () => {
        expect(() => loadConfig({ JWT_SECRET: 'local' })).toThrow(/DATABASE_HOST/);
        expect(() => loadConfig({ ...DATABASE })).toThrow(/JWT_SECRET is required/);
        expect(() => loadConfig({ ...DATABASE, JWT_SECRET: 'x', APP_ENV: 'staging' })).toThrow(
            /Invalid configuration/,
        );
        expect(() => loadConfig({ ...DATABASE, JWT_SECRET: 'x', JWT_EXPIRES_IN: '15' })).toThrow(
            /JWT_EXPIRES_IN/,
        );
    });

    it('requires a strong JWT secret outside local development', () => {
        expect(() =>
            loadConfig({
                ...DATABASE,
                APP_ENV: 'production',
                JWT_SECRET: 'short',
            }),
        ).toThrow(/at least 32 characters/);
    });

    it('only allows insecure cookies locally', () => {
        expect(() =>
            loadConfig({
                ...DATABASE,
                APP_ENV: 'production',
                JWT_SECRET: SECRET,
                COOKIE_SECURE: 'false',
            }),
        ).toThrow(/COOKIE_SECURE/);
    });
});
