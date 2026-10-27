# Food Planner

Plan het weekmenu (bv. donderdag tot woensdag), stel op basis daarvan een boodschappenlijst samen
en vink die in de winkel af. A Dutch-only PWA for one household, self-hosted on the home server.

| Part              | Stack                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| `packages/client` | Vue 3.5, Vite 8, TypeScript 6, PrimeVue 4, Pinia 4, Vue Router 5, vue-i18n, PWA  |
| `packages/api`    | NestJS 12 (ESM), TypeORM 1, PostgreSQL 18, JWT + refresh cookie, Swagger, Vitest |

Node.js 26 is used everywhere (pinned with Volta). npm workspaces, one `package-lock.json` at the root.

## Local development

```sh
npm install
cp packages/api/.env.example packages/api/.env.local
cp packages/client/.env.example packages/client/.env.local

cd packages/api
docker compose up -d          # PostgreSQL 18 on localhost:5434
npm run db:setup:local        # drop + create the database, migrate and seed the users (see "Users")
npm run db:seed-sample:local  # optional: sample stores (Lidl, Carrefour, ...), ingredients and dishes
npm run start:local           # http://localhost:3000/api, Swagger on http://localhost:3000/swagger

cd ../client
npm run dev                   # http://localhost:5173, proxies /api to the API
```

The API also applies pending migrations on startup.

## Users

A database setup seeds `packages/api/src/database/files/data/users.local.sql` when it exists
(real accounts, git-ignored like every `*.local.sql`), otherwise the development user of
`users.sql` (`dev@example.com` / `ChangeMe123!`).

There is no sign-up. Accounts are managed with the user CLI:

```sh
cd packages/api
npm run user:local -- create --email jane@example.com --name Jane   # asks for the password
npm run user:local -- list
npm run user:local -- set-password --email jane@example.com         # also logs out all devices
npm run user -- list                                                # without rebuilding (also on the server)
```

## Deployment

Production runs with Docker Compose (`Dockerfile`, `docker-compose.yml`) on the home server,
behind a shared Caddy reverse proxy: see [DEPLOYMENT.md](DEPLOYMENT.md).

## Importing old menus

The old week menus from Apple Notes become the start of the dish library, with how often each
dish was planned (the dish picker suggests favourites first). Both files stay out of git: they
are personal data.

```sh
# 1. Export the note to export.txt in the repository root, then write the review file
cd packages/api
npm run import:local -- review          # writes ../../import/review.txt

# 2. Review import/review.txt: rename dishes, fix their ingredients, merge or skip dishes,
#    merge ingredient spellings (the instructions are at the top of the file)

# 3. Import (safe to run again: existing dishes only get their count updated)
npm run import:local -- load --dry-run
npm run import:local -- load
```

The export is one line per day (`Do: risotto met pompoen`): `/` or an empty day is no cooking,
eating out and the like go under `[skip]`, URLs become the recipe's source, and spellings of the
same dish are grouped (word order, filler words and small typos don't matter).

## Configuration

All API configuration comes from environment variables, defined in one place:
`packages/api/src/config/config.ts`. That zod schema provides validation, defaults and the
`AppConfig` type; read values with `AppConfigService.get('NAME')`. The API (and the database and
user scripts) refuse to start when a value is invalid.

Locally, `packages/api/.env.local` is loaded if present; variables already set in the shell take
precedence. On the server, Docker Compose passes `.env.production`.

| Variable                 | Values                                                     | Default  |
| ------------------------ | ---------------------------------------------------------- | -------- |
| `APP_ENV`                | `local`, `production`                                      | `local`  |
| `PORT`                   | port number                                                | `3000`   |
| `LOG_LEVEL`              | `verbose`, `debug`, `log`, `warn`, `error`, `fatal`        | `log`    |
| `TRUST_PROXY_HOPS`       | proxies in front of the app (server: 1, Caddy)             | `0`      |
| `ALLOWED_ORIGINS`        | CORS origins, comma-separated (not needed same-origin)     | none     |
| `ENABLE_SWAGGER`         | `true`/`false`, Swagger UI on `/swagger`                   | `false`  |
| `ALLOW_DATABASE_SETUP`   | `true`/`false`, allows the scripts to drop/create and seed | `false`  |
| `DATABASE_HOST`          | host                                                       | required |
| `DATABASE_PORT`          | port                                                       | `5432`   |
| `DATABASE_USERNAME`      | user                                                       | required |
| `DATABASE_PASSWORD`      | password                                                   | required |
| `DATABASE_NAME`          | database name                                              | required |
| `DATABASE_SSL`           | `true`/`false`                                             | `false`  |
| `JWT_SECRET`             | access token secret, ≥ 32 characters outside `local`       | required |
| `JWT_EXPIRES_IN`         | access token lifetime, e.g. `15m`, `1h`                    | `15m`    |
| `REFRESH_TOKEN_TTL_DAYS` | login session lifetime, extended on every use              | `90`     |
| `COOKIE_SECURE`          | `true`/`false`, `false` only allowed with `APP_ENV=local`  | `true`   |

## API

### Authentication

- Login returns a short-lived access token (15 min, kept in memory only) and sets an httpOnly
  `fp_refresh` cookie (`SameSite=Strict`, path `/api/auth`).
- The cookie is backed by a row in `sessions` (SHA-256 of the token). Its expiry slides on every
  refresh (90 days), so the installed app stays logged in.
- The client refreshes silently on start and on a 401. Without a connection it starts with the
  cached user (offline session) and refreshes as soon as it is back online.
- `JwtAuthGuard` is registered globally: every route needs a valid access token unless it is
  marked `@Public()` (login, refresh, logout, `/status`). New endpoints are protected by default.

### Errors

Every error uses one envelope:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "email must be an email",
    "requestId": "0f9c2a4e-7d3b-4f0e-9b1a-2c6d8e4f1a3b",
    "details": {
      "fields": [{ "field": "email", "message": "email must be an email" }]
    }
  }
}
```

Codes: `INVALID_REQUEST` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404),
`CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (5xx). Throw `ApiException` (e.g.
`ApiException.notFound(...)`) for expected errors. Validation errors list every field in
`details.fields`. Anything unexpected becomes `INTERNAL_ERROR` without internal details; the stack
trace is only logged. Unknown routes don't echo the URL.

### Logging

pino through Nest's logger (`new Logger(Context)` as usual): JSON lines on stdout in production
(`docker compose logs`), pretty-printed locally. Every API request gets one log line when it is
done (method, path, status, duration, request id, user id, client IP), without the query string.
Successful `/status` checks and static files are not logged. Every response carries an
`X-Request-Id` header; a well-formed incoming one (e.g. from the proxy) is reused.

### HTTP

- API responses carry `Cache-Control: no-store`, so neither the browser nor the service worker
  caches them. Hashed client assets (`/assets/*`) are cached for a year; `index.html`, `sw.js` and
  the manifest are revalidated, so updates reach the installed app.
- Idle connections stay open for 125 s, longer than Caddy keeps idle upstream connections (2 min),
  to avoid sporadic 502s when Caddy reuses a connection Node just closed.
- `req.ip` is the real client address (used for rate limiting): the app trusts exactly
  `TRUST_PROXY_HOPS` proxies in `X-Forwarded-For`.

### Client API types

The client's request and response types are generated from the API's OpenAPI document (generated
from the controllers and their Swagger decorators, without a database):

```sh
npm run api:types   # root: builds the API, writes packages/client/src/api/generated/schema.ts
```

Run it after every API contract change and commit the regenerated `schema.ts`. Client code imports
the types through `src/api/services/types/*.ts`. Name request and response classes after what they
are (`LoginRequest`, `User`), never `*Dto` or `*Contract`: the names show up in the client.

## Checks

All from the root (each also works inside a package):

| Command                | What                                          |
| ---------------------- | --------------------------------------------- |
| `npm run check`        | everything below, as before a commit          |
| `npm run format:check` | Prettier (`npm run format` to fix)            |
| `npm run lint`         | ESLint, typescript-eslint `strictTypeChecked` |
| `npm run typecheck`    | `tsc` / `vue-tsc`                             |
| `npm test`             | API unit + e2e tests, client unit tests       |
| `npm run build`        | client, then API                              |

`.npmrc` has `engine-strict=true`: npm refuses to install on another Node major than 26.

## Notes

- PrimeVue stays on the MIT-licensed 4.x line (PrimeVue 5 requires a commercial PrimeUI license).
- TypeScript stays on 6.0.x until the Nest CLI and typescript-eslint support TypeScript 7.
- Root `overrides`: `multer` ^2.5.0 (advisory in the version pinned by `@nestjs/platform-express`);
  `openapi-typescript` gets TypeScript 6 although it declares a peer of `^5` (it only uses the
  printer API, the output is checked by `vue-tsc`).
  The `typescript-eslint` pins to 8.72.0 are temporary: the 8.72.1 tarballs returned 404 on
  2026-10-26. Remove them once `npm install` works without.
