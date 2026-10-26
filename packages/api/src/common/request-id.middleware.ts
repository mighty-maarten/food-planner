import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';

// Accept a caller-provided id (e.g. from the reverse proxy) when it looks sane, so one id follows
// the request across layers. Otherwise generate one.
const VALID_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export const getRequestId = (response: Response): string | undefined =>
    response.locals.requestId as string | undefined;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    use(request: Request, response: Response, next: NextFunction) {
        const incoming = request.header(REQUEST_ID_HEADER);
        const requestId = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();

        response.locals.requestId = requestId;
        response.setHeader(REQUEST_ID_HEADER, requestId);
        next();
    }
}
