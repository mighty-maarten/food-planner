import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

// Keep idle connections open longer than the reverse proxy does (Caddy keeps idle upstream
// connections for 2 minutes). With Node's default of 5 s, Caddy can reuse a connection Node has
// just closed, which shows up as sporadic 502 responses.
export const KEEP_ALIVE_TIMEOUT_MS = 125_000;

export function configureHttp(app: NestExpressApplication, trustProxyHops: number): void {
    app.disable('x-powered-by');

    // Each proxy appends the address it received the request from to X-Forwarded-For. Trusting
    // exactly the number of proxies in front of the app makes req.ip the real client address
    // (used for rate limiting), and a client can't spoof it with its own X-Forwarded-For.
    app.set('trust proxy', trustProxyHops);

    // API responses are never cached, by the browser nor by the service worker of the PWA. The
    // static files of the client keep their own caching. An endpoint can override this.
    app.use((request: Request, response: Response, next: NextFunction) => {
        if (request.path.startsWith('/api/')) {
            response.setHeader('Cache-Control', 'no-store');
        }
        next();
    });
}

export function configureHttpServer(app: NestExpressApplication): void {
    const server = app.getHttpServer();
    server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
    server.headersTimeout = KEEP_ALIVE_TIMEOUT_MS + 1_000;
}
