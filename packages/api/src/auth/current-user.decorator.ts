import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from './types.js';

/** The id of the logged-in user (set by the global JwtAuthGuard) */
export const CurrentUserId = createParamDecorator((_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request>();
    return (request.user as JwtPayload).sub;
});
