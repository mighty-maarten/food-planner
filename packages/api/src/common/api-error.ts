import { HttpException, HttpStatus } from '@nestjs/common';

export const ApiErrorCode = {
    INVALID_REQUEST: 'INVALID_REQUEST',
    UNAUTHENTICATED: 'UNAUTHENTICATED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    RATE_LIMITED: 'RATE_LIMITED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export interface ApiErrorBody {
    error: {
        code: ApiErrorCode;
        message: string;
        requestId: string;
        details?: Record<string, unknown>;
    };
}

// Throw this for expected errors the client can act on. Anything else becomes INTERNAL_ERROR
// (or a code derived from the HTTP status for Nest's own HttpExceptions).
export class ApiException extends HttpException {
    constructor(
        status: HttpStatus,
        readonly code: ApiErrorCode,
        message: string,
        readonly details?: Record<string, unknown>,
    ) {
        super(message, status);
    }

    static notFound(message: string): ApiException {
        return new ApiException(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, message);
    }

    static conflict(message: string, details?: Record<string, unknown>): ApiException {
        return new ApiException(HttpStatus.CONFLICT, ApiErrorCode.CONFLICT, message, details);
    }
}
