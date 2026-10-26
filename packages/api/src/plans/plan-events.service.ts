import { Injectable } from '@nestjs/common';
import { filter, map, type Observable, Subject } from 'rxjs';
import type { PlanEvent } from './types.js';

/**
 * Changes to plans, for the live updates (SSE) of the clients that show them. In memory: the API
 * runs as a single process.
 */
@Injectable()
export class PlanEventsService {
    private readonly events = new Subject<{ planId: string; event: PlanEvent }>();

    public emit(planId: string, event: PlanEvent): void {
        this.events.next({ planId, event });
    }

    public forPlan(planId: string): Observable<PlanEvent> {
        return this.events.pipe(
            filter((entry) => entry.planId === planId),
            map((entry) => entry.event),
        );
    }
}
