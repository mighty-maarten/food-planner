import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { HEALTH_CHECK_PATH } from '../app.controller.js';
import type { JwtPayload } from '../auth/types.js';
import { getRequestId } from './request-id.middleware.js';

export interface RequestLogFields {
    method: string;
    path: string;
    status: number;
    durationMs: number;
    requestId?: string;
    userId?: string;
    clientIp?: string;
    userAgent?: string;
    aborted?: true;
}

// One line per API request, once the response is done (or the client hung up), whatever the
// outcome. Successful health checks and static files of the client are skipped. The query string
// is never logged.
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
    private readonly logger = new Logger('Request');

    use(request: Request, response: Response, next: NextFunction) {
        const start = process.hrtime.bigint();

        response.once('close', () => {
            const path = request.originalUrl.split('?', 1)[0] ?? '/';
            const status = response.statusCode;
            if (status < 400 && (path === HEALTH_CHECK_PATH || !path.startsWith('/api/'))) return;

            const durationMs = Math.round(Number(process.hrtime.bigint() - start) / 1e5) / 10;
            const fields: RequestLogFields = {
                method: request.method,
                path,
                status,
                durationMs,
                requestId: getRequestId(response),
                // Set by the JWT guard on authenticated routes
                userId: (request.user as JwtPayload | undefined)?.sub,
                clientIp: request.ip,
                userAgent: request.header('User-Agent'),
                ...(!response.writableFinished && { aborted: true as const }),
            };
            this.logger.log([request.method, path, status, durationMs, 'ms'].join(' '), fields);
        });

        next();
    }
}
