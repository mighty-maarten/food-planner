import { z } from 'zod';

// At least 32 characters outside local development, so a weak secret is rejected at startup.
export const MIN_JWT_SECRET_LENGTH = 32;

// "true"/"false" (also 1/0, yes/no) instead of z.coerce.boolean(), which turns "false" into true.
const flag = (defaultValue: boolean) => z.stringbool().default(defaultValue);

// Single source of truth for configuration: validation, defaults and the AppConfig type.
// Values come from environment variables (`.env.production` via Docker Compose on the server,
// `.env.local` locally).
const configSchema = z
    .object({
        APP_ENV: z.enum(['local', 'production']).default('local'),
        PORT: z.coerce.number().int().positive().default(3000),
        LOG_LEVEL: z.enum(['verbose', 'debug', 'log', 'warn', 'error', 'fatal']).default('log'),
        // Proxies in front of the app that add themselves to X-Forwarded-For: 0 locally,
        // 1 on the home server (the Caddy reverse proxy). Makes req.ip the real client address.
        TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
        // Origins allowed to call the API cross-origin, comma-separated. Not needed when the
        // client is served by the API or through the Vite proxy.
        ALLOWED_ORIGINS: z
            .string()
            .default('')
            .transform((value) =>
                value
                    .split(',')
                    .map((origin) => origin.trim())
                    .filter((origin) => origin.length > 0),
            ),
        // Swagger UI on /swagger
        ENABLE_SWAGGER: flag(false),
        // Allows the database scripts to drop, recreate and seed the database
        ALLOW_DATABASE_SETUP: flag(false),

        DATABASE_HOST: z.string().min(1),
        DATABASE_PORT: z.coerce.number().int().positive().default(5432),
        DATABASE_USERNAME: z.string().min(1),
        DATABASE_PASSWORD: z.string(),
        DATABASE_NAME: z.string().min(1),
        DATABASE_SSL: flag(false),

        JWT_SECRET: z.string({ error: 'JWT_SECRET is required' }).min(1),
        // Lifetime of the access token, renewed with the refresh cookie
        JWT_EXPIRES_IN: z
            .string()
            .regex(/^\d+[smhd]$/, {
                error: 'JWT_EXPIRES_IN must look like 15m, 1h or 7d',
            })
            .default('15m'),
        // Lifetime of a login session (refresh cookie), extended on every use
        REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).default(90),
        // Secure cookies need HTTPS; only switch off for local development over http
        COOKIE_SECURE: flag(true),
    })
    .refine(
        (config) => config.APP_ENV === 'local' || config.JWT_SECRET.length >= MIN_JWT_SECRET_LENGTH,
        {
            message: `JWT_SECRET needs at least ${String(MIN_JWT_SECRET_LENGTH)} characters outside APP_ENV=local`,
            path: ['JWT_SECRET'],
        },
    )
    .refine((config) => config.APP_ENV === 'local' || config.COOKIE_SECURE, {
        message: 'COOKIE_SECURE can only be disabled with APP_ENV=local',
        path: ['COOKIE_SECURE'],
    });

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
    const result = configSchema.safeParse(env);
    if (!result.success) {
        throw new Error(`Invalid configuration:\n${z.prettifyError(result.error)}`);
    }
    return result.data;
}

/** Local development only: variables already set in the environment take precedence. */
export function loadLocalEnvFile(): void {
    try {
        process.loadEnvFile('.env.local');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
}
