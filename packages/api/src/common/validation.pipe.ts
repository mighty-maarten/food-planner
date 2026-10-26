import { HttpStatus, type ValidationError, ValidationPipe } from '@nestjs/common';
import { ApiErrorCode, ApiException } from './api-error.js';

const toFieldErrors = (errors: ValidationError[]) =>
    errors.map((error) => ({
        field: error.property,
        message: Object.values(error.constraints ?? {})[0] ?? 'Invalid value.',
    }));

// Request validation for the query and body classes (class-validator). Failures become
// INVALID_REQUEST errors with one entry per field in `details.fields`.
export const createValidationPipe = () =>
    new ValidationPipe({
        transform: true,
        whitelist: true,
        stopAtFirstError: true,
        exceptionFactory: (errors) => {
            const fields = toFieldErrors(errors);
            return new ApiException(
                HttpStatus.BAD_REQUEST,
                ApiErrorCode.INVALID_REQUEST,
                fields[0]?.message ?? 'Invalid request.',
                { fields },
            );
        },
    });
