# Food Planner

Vue 3 PWA (`packages/client/`) + NestJS API (`packages/api/`), npm workspaces. See README.md.

## Commands

- Root: `npm run check` (format, lint, typecheck, tests, build), `npm run api:types` (after API contract changes)
- API: `npm run start:local`, `npm test`, `npm run test:e2e`, `npm run db:setup:local`, `npm run db:migrate:local`, `npm run user:local -- <command>`, `npm run typecheck`
- Client: `npm run dev`, `npm run test:unit`, `npm run type-check`
- Local DB: `docker compose up -d` in `packages/api/` (PostgreSQL 18 on port 5434); API on port 3000, client on 5173 (proxies `/api`)

## Conventions

- The UI is Dutch only. All UI text lives in `packages/client/src/assets/locales/nl.json`. Code, comments and docs are English.
- The API is ESM (`"type": "module"`): relative imports end in `.js`, use `import.meta.dirname` (no `__dirname`).
- TypeScript in strict mode with typescript-eslint `strictTypeChecked`; no `any`, no non-null assertions.
- Feature modules register routes via a `route-tree.ts`, collected in `packages/api/src/routes.ts`. Every route needs a valid access token (global `JwtAuthGuard`) unless marked `@Public()`.
- Errors use the shared envelope (`{ error: { code, message, requestId, details } }`); throw `ApiException` for expected errors. Log with Nest's `Logger`, pass extra fields as an object (`logger.log('message', { dishId })`).
- After any API contract change (controllers, request/response classes, Swagger decorators), run `npm run api:types` in the root and commit the regenerated `packages/client/src/api/generated/schema.ts`. Every response type needs `@ApiOkResponse({ type })` and `@ApiProperty` on its fields. No `Dto` or `Contract` in class names.
- Configuration only through the zod schema in `packages/api/src/config/config.ts`, read via `AppConfigService.get('NAME')`. Never read `process.env` elsewhere. Document new variables in the README table and `.env.example`.
- Database changes: add `packages/api/src/database/files/migrations/NNN.description.sql` (sequential, no gaps, wrapped in `BEGIN; ... COMMIT;`) and update the entities. Migrations also run on API startup.
- Client: API calls via static `*Api` classes in `src/api/services`, types re-exported from the generated schema in `src/api/services/types`, state in Pinia setup stores using `useStoreCreationUtils`.
- The client is used one-handed on a phone in the store: mobile first, touch targets of at least `$touch-target` (48px), light and dark scheme (follows the system, use the PrimeVue tokens or `--app-*` variables, never hard-coded colors).
- Offline: the access token is only kept in memory; never store it in localStorage. Shop mode must keep working without a connection.
- PrimeVue stays on the MIT-licensed 4.x line (PrimeVue 5 requires a commercial PrimeUI license).
