import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { NestFactory } from '@nestjs/core';
import { loadLocalEnvFile } from '../../config/config.js';
import { DatabaseScriptModule } from '../../database/database-script.module.js';
import { DatabaseService } from '../../database/services/database.service.js';
import { UserEntity } from '../../database/entities/user.entity.js';
import { SessionEntity } from '../../database/entities/session.entity.js';
import { MIN_PASSWORD_LENGTH, PasswordHelper } from '../password.helper.js';

// Accounts are managed from the command line only, the app has no sign-up.
const USAGE = `
USAGE:
    npm run user -- <command> [options]

COMMANDS:
    list                                  lists all users
    create --email <email> --name <name>  creates a user (asks for the password)
    set-password --email <email>          sets a new password and logs out all devices
    delete --email <email>                deletes a user

EXAMPLES:
    Locally:        npm run user:local -- create --email jane@example.com --name Jane
    In production:  docker compose exec app npm run user -- list
`;

const [command, ...rest] = process.argv.slice(2);
const option = (name: string): string | undefined => {
    const index = rest.indexOf(`--${name}`);
    return index === -1 ? undefined : rest[index + 1];
};

if (!command || command === '--help' || command === '-h') {
    console.log(USAGE);
    process.exit(0);
}

async function askPassword(): Promise<string> {
    // Mutes the echo of the typed characters
    let muted = false;
    const output = new Writable({
        write(chunk: Buffer, _encoding, callback) {
            if (!muted) process.stdout.write(chunk);
            callback();
        },
    });
    const rl = createInterface({
        input: process.stdin,
        output,
        terminal: true,
    });
    try {
        const ask = async (question: string) => {
            process.stdout.write(question);
            muted = true;
            const answer = await rl.question('');
            muted = false;
            process.stdout.write('\n');
            return answer;
        };
        const password = await ask('Password: ');
        if (password.length < MIN_PASSWORD_LENGTH) {
            throw new Error(`Password must be at least ${String(MIN_PASSWORD_LENGTH)} characters`);
        }
        if ((await ask('Repeat password: ')) !== password) {
            throw new Error('Passwords do not match');
        }
        return password;
    } finally {
        rl.close();
    }
}

function requireOption(name: string): string {
    const value = option(name)?.trim();
    if (!value) throw new Error(`Missing --${name}`);
    return value;
}

loadLocalEnvFile();
const app = await NestFactory.createApplicationContext(DatabaseScriptModule, {
    logger: ['error', 'warn'],
});
const dataSource = await app
    .get(DatabaseService)
    .getDataSource([UserEntity, SessionEntity])
    .initialize();
const users = dataSource.getRepository(UserEntity);
let exitCode = 0;

try {
    switch (command) {
        case 'list': {
            const all = await users.find({ order: { name: 'ASC' } });
            console.table(
                all.map((u) => ({
                    name: u.name,
                    email: u.email,
                    lastLoginAt: u.lastLoginAt?.toISOString() ?? '-',
                })),
            );
            break;
        }
        case 'create': {
            const email = requireOption('email').toLowerCase();
            const name = requireOption('name');
            if (await users.existsBy({ email })) {
                throw new Error(`User ${email} already exists`);
            }
            const passwordHash = await PasswordHelper.hash(await askPassword());
            await users.insert({ email, name, passwordHash });
            console.log(`Created user ${name} <${email}>`);
            break;
        }
        case 'set-password': {
            const user = await users.findOneByOrFail({
                email: requireOption('email').toLowerCase(),
            });
            user.passwordHash = await PasswordHelper.hash(await askPassword());
            await users.save(user);
            await dataSource.getRepository(SessionEntity).delete({ userId: user.id });
            console.log(`Updated the password of ${user.email}`);
            break;
        }
        case 'delete': {
            const email = requireOption('email').toLowerCase();
            const result = await users.delete({ email });
            console.log(result.affected ? `Deleted ${email}` : `No user ${email}`);
            break;
        }
        default:
            console.log(USAGE);
            exitCode = 1;
    }
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    exitCode = 1;
} finally {
    await dataSource.destroy();
    await app.close();
}
process.exit(exitCode);
