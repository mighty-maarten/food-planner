import { BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ApiErrorCode, ApiException } from '../common/api-error.js';
import { toErrorResponse } from './global.error-filter.js';

describe('toErrorResponse', () => {
    it('keeps the code, message and details of an ApiException', () => {
        const exception = ApiException.conflict('Dish already exists.', { name: 'Risotto' });

        expect(toErrorResponse(exception, 'req-1')).toEqual({
            status: HttpStatus.CONFLICT,
            body: {
                error: {
                    code: ApiErrorCode.CONFLICT,
                    message: 'Dish already exists.',
                    requestId: 'req-1',
                    details: { name: 'Risotto' },
                },
            },
        });
    });

    it('derives the code from the status of Nest exceptions', () => {
        expect(toErrorResponse(new BadRequestException('Bad'), 'r').body.error.code).toBe(
            ApiErrorCode.INVALID_REQUEST,
        );
        expect(toErrorResponse(new ThrottlerException(), 'r').body.error.code).toBe(
            ApiErrorCode.RATE_LIMITED,
        );
    });

    it('does not echo the URL of an unknown route', () => {
        const { body } = toErrorResponse(new NotFoundException('Cannot GET /api/x?q=1'), 'r');
        expect(body.error.message).toBe('Route not found.');
    });

    it('hides internals of unexpected errors', () => {
        const { status, body } = toErrorResponse(new Error('connection refused'), 'r');

        expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(body.error).toEqual({
            code: ApiErrorCode.INTERNAL_ERROR,
            message: 'An unexpected error occurred.',
            requestId: 'r',
        });
    });
});
