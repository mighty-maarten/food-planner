import { Injectable, type PipeTransform } from '@nestjs/common';
import { ApiException } from './api-error.js';
import { IsoDate } from './dates.js';

/** Validates a YYYY-MM-DD route parameter */
@Injectable()
export class ParseIsoDatePipe implements PipeTransform<string, string> {
    transform(value: string): string {
        if (!IsoDate.isValid(value)) {
            throw ApiException.invalidRequest(`'${value}' is not a date (YYYY-MM-DD)`);
        }
        return value;
    }
}
