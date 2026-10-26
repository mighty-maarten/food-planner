import type { LoggerService, LogLevel, OnApplicationShutdown } from '@nestjs/common';
import { pino } from 'pino';
import type { AppConfigService } from './config/app-config.service.js';

// Nest's log levels, used as pino's own levels: LOG_LEVEL and the `level` field in the output
// use the same names.
const LEVELS: Record<LogLevel, number> = {
    verbose: 10,
    debug: 20,
    log: 30,
    warn: 40,
    error: 50,
    fatal: 60,
};

// Same check as Nest's ConsoleLogger: error(message, stack) without a context.
const STACK_FORMAT = /^(.)+\n\s+at .+:\d+:\d+/;

export type PinoLogger = pino.Logger<LogLevel, true>;

interface Flushable {
    flushSync(): void;
}

export function createPino(level: LogLevel, destination: pino.DestinationStream): PinoLogger {
    return pino<LogLevel, true>(
        {
            level,
            customLevels: LEVELS,
            useOnlyCustomLevels: true,
            messageKey: 'message',
            base: undefined,
            timestamp: pino.stdTimeFunctions.isoTime,
            formatters: { level: (label) => ({ level: label }) },
        },
        destination,
    );
}

// Nest LoggerService on top of pino. Follows Nest's calling convention: the last string param is
// the context, an earlier string on error() is the stack, and plain objects become top-level
// fields: logger.log('message', { requestId }) logs {"message":"message","requestId":…}.
export class AppLogger implements LoggerService, OnApplicationShutdown {
    constructor(
        private readonly logger: PinoLogger,
        private readonly destination?: Flushable,
    ) {}

    verbose(message: unknown, ...params: unknown[]) {
        this.write('verbose', message, params);
    }

    debug(message: unknown, ...params: unknown[]) {
        this.write('debug', message, params);
    }

    log(message: unknown, ...params: unknown[]) {
        this.write('log', message, params);
    }

    warn(message: unknown, ...params: unknown[]) {
        this.write('warn', message, params);
    }

    error(message: unknown, ...params: unknown[]) {
        this.write('error', message, params);
    }

    fatal(message: unknown, ...params: unknown[]) {
        this.write('fatal', message, params);
        // The process is likely about to stop: don't leave this line in the buffer.
        this.flush();
    }

    setLogLevels(levels: LogLevel[]) {
        const lowest = levels.reduce<LogLevel>(
            (min, level) => (LEVELS[level] < LEVELS[min] ? level : min),
            'fatal',
        );
        this.logger.level = lowest;
    }

    // Writes are asynchronous; flush what is still buffered before the process exits.
    onApplicationShutdown() {
        this.flush();
    }

    flush() {
        this.destination?.flushSync();
    }

    private write(level: LogLevel, message: unknown, params: unknown[]) {
        if (!this.logger.isLevelEnabled(level)) return;

        const fields: Record<string, unknown> = {};
        const rest = [...params];
        const last = rest.at(-1);
        if (typeof last === 'string' && !(level === 'error' && STACK_FORMAT.test(last))) {
            fields.context = last;
            rest.pop();
        }
        for (const param of rest) {
            if (typeof param === 'string') fields.stack = param;
            else if (param instanceof Error) fields.err = param;
            else if (typeof param === 'object' && param !== null) Object.assign(fields, param);
        }

        if (message instanceof Error) {
            fields.err = message;
            this.logger[level](fields, message.message);
        } else if (typeof message === 'string') {
            this.logger[level](fields, message);
        } else {
            this.logger[level]({ ...fields, value: message });
        }
    }
}

// JSON lines on stdout on the server (docker compose logs), written asynchronously so logging
// never blocks a request. Locally, pretty-printed (pino-pretty is a dev dependency, so it's only
// loaded here).
export async function createLogger(configService: AppConfigService): Promise<AppLogger> {
    const level = configService.get('LOG_LEVEL');

    if (configService.get('APP_ENV') === 'local') {
        const { PinoPretty } = await import('pino-pretty');
        const pretty = PinoPretty({
            customLevels: LEVELS,
            useOnlyCustomProps: true,
            messageKey: 'message',
            messageFormat: '[{context}] {message}',
            ignore: 'context',
            singleLine: true,
            translateTime: 'SYS:HH:MM:ss.l',
            sync: true,
        });
        return new AppLogger(createPino(level, pretty));
    }

    const destination = pino.destination({ dest: 1, sync: false });
    return new AppLogger(createPino(level, destination), destination);
}
