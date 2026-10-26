import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ModulesContainer, NestFactory, RouterModule } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { routes } from '../routes.js';
import { createOpenApiDocument } from '../swagger.js';

// Writes the OpenAPI document without starting the app: in preview mode Nest builds the module
// graph but instantiates no providers, so no database or configuration is needed.
// Usage: node dist/openapi/generate.js <output file>
const output = resolve(process.argv[2] ?? 'openapi.json');

const app = await NestFactory.create(AppModule, { preview: true, logger: false });
// RouterModule registers the module paths (/auth, /users) when it is instantiated, which preview
// mode skips.
new RouterModule(app.get(ModulesContainer), routes);
app.setGlobalPrefix('api', { exclude: ['/status'] });
writeFileSync(output, `${JSON.stringify(createOpenApiDocument(app), null, 2)}\n`);
await app.close();
console.log(`Wrote ${output}`);
