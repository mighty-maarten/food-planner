import { registerDecorator, type ValidationOptions } from 'class-validator';
import { IsoDate } from './dates.js';

/** A calendar date in YYYY-MM-DD format */
export function IsIsoDate(options?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: 'isIsoDate',
            target: object.constructor,
            propertyName,
            options: { message: `${propertyName} must be a date (YYYY-MM-DD)`, ...options },
            validator: {
                validate: (value: unknown) => typeof value === 'string' && IsoDate.isValid(value),
            },
        });
    };
}
