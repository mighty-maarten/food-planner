import { AppConfig } from '@/app.config';
import type { PlanEvent } from '@/api/services/types/plans';
import { useAuthStore } from '@/stores/auth';

/**
 * Splits a server-sent events buffer into the `data` of the complete events and the rest that
 * is still incomplete. Comments and other fields (id, event, retry) are ignored.
 */
export function parseSseBuffer(buffer: string): { data: string[]; rest: string } {
    const blocks = buffer.replace(/\r\n?/g, '\n').split('\n\n');
    const rest = blocks.pop() ?? '';
    const data = blocks.flatMap((block) => {
        const lines = block
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).replace(/^ /, ''));
        return lines.length ? [lines.join('\n')] : [];
    });
    return { data, rest };
}

export interface PlanEventsHandlers {
    onEvent: (event: PlanEvent) => void;
    /** Connected (true) or lost the connection (false, it keeps retrying) */
    onStatus: (connected: boolean) => void;
}

const RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

/**
 * Live updates of a plan. Read with fetch instead of EventSource, which cannot send the
 * Authorization header (the access token is only kept in memory). Reconnects until closed.
 */
export function connectPlanEvents(planId: string, handlers: PlanEventsHandlers): () => void {
    const controller = new AbortController();
    // A function: TypeScript would narrow a direct check of `aborted` across the awaits
    const isClosed = () => controller.signal.aborted;
    let attempt = 0;

    async function readStream(): Promise<void> {
        const authStore = useAuthStore();
        const response = await fetch(`${AppConfig.apiUrl}/plans/${planId}/events`, {
            headers: {
                Accept: 'text/event-stream',
                ...(authStore.accessToken && { Authorization: `Bearer ${authStore.accessToken}` }),
            },
            signal: controller.signal,
        });
        if (response.status === 401) {
            await authStore.refreshAccessToken();
            throw new Error('Unauthorized');
        }
        if (!response.ok || !response.body) {
            throw new Error(`Event stream failed with ${String(response.status)}`);
        }

        attempt = 0;
        handlers.onStatus(true);
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
            const { value, done } = await reader.read();
            if (done) return;
            const parsed = parseSseBuffer(buffer + value);
            buffer = parsed.rest;
            for (const data of parsed.data) {
                handlers.onEvent(JSON.parse(data) as PlanEvent);
            }
        }
    }

    void (async () => {
        while (!isClosed()) {
            try {
                await readStream();
            } catch {
                // Offline, server restart, expired token: retry below
            }
            if (isClosed()) return;
            handlers.onStatus(false);
            const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ?? 30_000;
            attempt++;
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    })();

    return () => {
        controller.abort();
    };
}
