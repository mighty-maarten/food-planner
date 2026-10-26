import { createStore, del, get, set, type UseStore } from 'idb-keyval';
import type { Category, Store } from '@/api/services/types/library';
import type { Plan } from '@/api/services/types/plans';

/** What shop mode needs to work without a connection */
export interface ShopSnapshot {
    plan: Plan;
    categories: Category[];
    stores: Store[];
    /** ISO timestamp of the last successful load */
    savedAt: string;
}

/** A tick made on this device that the API has not confirmed yet */
export interface PendingTick {
    planId: string;
    itemId: string;
    checked: boolean;
    /** ISO timestamp of the tick, the last tick wins */
    at: string;
}

// IndexedDB, not localStorage: it survives restarts of the installed app and holds more data.
// Never the access token (memory only).
// Opened on first use: creating it right away throws where IndexedDB is missing
let store: UseStore | undefined;
const shopStore = (): UseStore => (store ??= createStore('food-planner', 'shop'));

const SNAPSHOT_KEY = 'snapshot';
const QUEUE_KEY = 'pending-ticks';

// IndexedDB can be unavailable (private browsing on some browsers): shop mode then works online
async function safely<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
    try {
        return await operation();
    } catch {
        return fallback;
    }
}

export const ShopCache = {
    getSnapshot: () => safely(() => get<ShopSnapshot>(SNAPSHOT_KEY, shopStore()), undefined),
    // Plain JSON: IndexedDB cannot store Vue's reactive proxies
    saveSnapshot: (snapshot: ShopSnapshot) =>
        safely(
            () => set(SNAPSHOT_KEY, JSON.parse(JSON.stringify(snapshot)), shopStore()),
            undefined,
        ),
    getQueue: () =>
        safely(async () => (await get<PendingTick[]>(QUEUE_KEY, shopStore())) ?? [], []),
    saveQueue: (queue: PendingTick[]) =>
        safely(() => set(QUEUE_KEY, JSON.parse(JSON.stringify(queue)), shopStore()), undefined),
    /** On logout: the next user of the device starts clean */
    clear: () =>
        safely(async () => {
            await del(SNAPSHOT_KEY, shopStore());
            await del(QUEUE_KEY, shopStore());
        }, undefined),
};
