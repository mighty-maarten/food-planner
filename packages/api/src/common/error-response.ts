import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiErrorCode } from './api-error.js';

export class ApiError {
    @ApiProperty({
        enum: Object.values(ApiErrorCode),
        enumName: 'ApiErrorCode',
        description: 'Stable, machine-readable error code.',
    })
    code!: ApiErrorCode;

    @ApiProperty({ description: 'Human-readable description. May change; do not parse it.' })
    message!: string;

    @ApiProperty({
        description: 'Identifier of this request, also returned in the X-Request-Id header.',
    })
    requestId!: string;

    @ApiPropertyOptional({
        type: 'object',
        additionalProperties: true,
        description: 'Error-specific details, e.g. `fields` for validation errors.',
    })
    details?: Record<string, unknown>;
}

export class ErrorResponse {
    @ApiProperty({ type: ApiError })
    error!: ApiError;
}
