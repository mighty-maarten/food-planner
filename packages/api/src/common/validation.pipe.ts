import { HttpStatus, type ValidationError, ValidationPipe } from '@nestjs/common';
import { ApiErrorCode, ApiException } from './api-error.js';

// Nested objects and arrays (e.g. dish ingredient lines) report their fields with a path:
// `ingredients.0.name`.
const toFieldErrors = (
    errors: ValidationError[],
    parent?: string,
): { field: string; message: string }[] =>
    errors.flatMap((error) => {
        const field = parent ? `${parent}.${error.property}` : error.property;
        const message = Object.values(error.constraints ?? {})[0];
        if (message) return [{ field, message }];
        if (error.children?.length) return toFieldErrors(error.children, field);
        return [{ field, message: 'Invalid value.' }];
    });

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
