import { Transform } from 'class-transformer';

/** Trims a string value */
export const Trim = () =>
    Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    );

/** Trims a string value and turns an empty string into null (for optional text fields) */
export const TrimToNull = () =>
    Transform(({ value }: { value: unknown }) => {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
    });
