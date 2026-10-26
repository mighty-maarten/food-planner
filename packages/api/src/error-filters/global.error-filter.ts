import {
    type ArgumentsHost,
    Catch,
    type ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { type ApiErrorBody, ApiErrorCode, ApiException } from '../common/api-error.js';
import { getRequestId } from '../common/request-id.middleware.js';

const CODE_BY_STATUS: Partial<Record<number, ApiErrorCode>> = {
    [HttpStatus.BAD_REQUEST]: ApiErrorCode.INVALID_REQUEST,
    [HttpStatus.UNAUTHORIZED]: ApiErrorCode.UNAUTHENTICATED,
    [HttpStatus.FORBIDDEN]: ApiErrorCode.FORBIDDEN,
    [HttpStatus.NOT_FOUND]: ApiErrorCode.NOT_FOUND,
    [HttpStatus.CONFLICT]: ApiErrorCode.CONFLICT,
    [HttpStatus.TOO_MANY_REQUESTS]: ApiErrorCode.RATE_LIMITED,
};

// Maps any thrown value to the API error envelope. 5xx responses never expose internals.
export function toErrorResponse(
    exception: unknown,
    requestId: string,
): { status: number; body: ApiErrorBody } {
    const status =
        exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
        return {
            status,
            body: {
                error: {
                    code: ApiErrorCode.INTERNAL_ERROR,
                    message: 'An unexpected error occurred.',
                    requestId,
                },
            },
        };
    }

    if (exception instanceof ApiException) {
        return {
            status,
            body: {
                error: {
                    code: exception.code,
                    message: exception.message,
                    requestId,
                    ...(exception.details && { details: exception.details }),
                },
            },
        };
    }

    const code = CODE_BY_STATUS[status] ?? ApiErrorCode.INVALID_REQUEST;
    // Nest's route-not-found message echoes the full URL, query string included.
    const message =
        code === ApiErrorCode.NOT_FOUND ? 'Route not found.' : (exception as HttpException).message;

    return { status, body: { error: { code, message, requestId } } };
}

@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalErrorFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse<Response>();
        const requestId = getRequestId(response) ?? randomUUID();
        const { status, body } = toErrorResponse(exception, requestId);

        if (status >= 500) {
            const stack = exception instanceof Error ? exception.stack : String(exception);
            this.logger.error('Unhandled error', { requestId }, stack);
        }

        response.status(status).json(body);
    }
}
