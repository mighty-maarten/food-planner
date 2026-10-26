import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useAuthStore } from './auth';
import { HttpClient } from '@/api/http-client';
import { connectPlanEvents } from '@/api/plan-events';
import { CategoriesApi } from '@/api/services/categories-api';
import { PlansApi } from '@/api/services/plans-api';
import { StoresApi } from '@/api/services/stores-api';
import type { Category, Store } from '@/api/services/types/library';
import type { ListItem, Plan, PlanEvent } from '@/api/services/types/plans';
import { type PendingTick, ShopCache } from '@/offline/shop-cache';
import { DateUtil } from '@/utils/date';
import { pickCurrentPlan } from '@/utils/plan';
import { applyTick } from '@/utils/shop';

// The chosen store is a convenience of this device
const STORE_FILTER_KEY = 'fp_shop_store';

/** Who ticks on this device, as shown with ticked items */
function currentUserReference(): { id: string; name: string } | null {
    const user = useAuthStore().currentUser;
    return user ? { id: user.id, name: user.name } : null;
}

function readStoreFilter(): string | null {
    try {
        return localStorage.getItem(STORE_FILTER_KEY);
    } catch {
        return null;
    }
}

/**
 * Shop mode: the current plan's list, also without a connection. The list is cached on the device
 * (IndexedDB); ticks are applied at once, queued, and sent in order when the API can be reached.
 * Live updates of the other shopper come in over SSE.
 */
export const useShopStore = defineStore('shop', () => {
    const plan = ref<Plan | null>(null);
    const categories = ref<Category[]>([]);
    const stores = ref<Store[]>([]);
    const savedAt = ref<string | null>(null);
    const storeId = ref<string | null>(readStoreFilter());
    const queue = ref<PendingTick[]>([]);

    const isLoading = ref(false);
    /** The last refresh did not reach the API (shown from the cache, if any) */
    const isOffline = ref(false);
    /** No plan at all (online, so not just missing from the cache) */
    const hasNoPlan = ref(false);
    const isLive = ref(false);

    const pendingItemIds = computed(() => new Set(queue.value.map((tick) => tick.itemId)));

    let closeEvents: (() => void) | null = null;
    let listeningTo: string | null = null;
    let flushing: Promise<void> | null = null;
    let reloadTimer: ReturnType<typeof setTimeout> | undefined;

    function setStoreFilter(id: string | null): void {
        storeId.value = id;
        try {
            if (id) localStorage.setItem(STORE_FILTER_KEY, id);
            else localStorage.removeItem(STORE_FILTER_KEY);
        } catch {
            // Remembering the store is a convenience only
        }
    }

    async function saveSnapshot(): Promise<void> {
        if (!plan.value) return;
        await ShopCache.saveSnapshot({
            plan: plan.value,
            categories: categories.value,
            stores: stores.value,
            savedAt: savedAt.value ?? new Date().toISOString(),
        });
    }

    function replaceItem(item: ListItem): void {
        if (!plan.value) return;
        plan.value.items = plan.value.items.map((current) =>
            current.id === item.id ? item : current,
        );
    }

    /** The plan from the API, with this device's unsent ticks on top */
    function withPendingTicks(loaded: Plan): Plan {
        const user = currentUserReference();
        const pending = queue.value.filter((tick) => tick.planId === loaded.id);
        return {
            ...loaded,
            items: loaded.items.map((item) => {
                const tick = pending.find((t) => t.itemId === item.id);
                return tick ? applyTick(item, tick, user) : item;
            }),
        };
    }

    /** Shows the cached list at once, then loads the current one */
    async function start(): Promise<void> {
        const [snapshot, cachedQueue] = await Promise.all([
            ShopCache.getSnapshot(),
            ShopCache.getQueue(),
        ]);
        queue.value = cachedQueue;
        if (snapshot && !plan.value) {
            plan.value = withPendingTicks(snapshot.plan);
            categories.value = snapshot.categories;
            stores.value = snapshot.stores;
            savedAt.value = snapshot.savedAt;
        }
        await refresh();
        void flush();
    }

    async function refresh(): Promise<void> {
        isLoading.value = true;
        try {
            const [plans, loadedCategories, loadedStores] = await Promise.all([
                PlansApi.getPlans(),
                CategoriesApi.getCategories(),
                StoresApi.getStores(),
            ]);
            const current = pickCurrentPlan(plans, DateUtil.today());
            categories.value = loadedCategories;
            stores.value = loadedStores;
            if (storeId.value && !loadedStores.some((s) => s.id === storeId.value)) {
                setStoreFilter(null);
            }
            isOffline.value = false;
            hasNoPlan.value = !current;
            if (!current) {
                plan.value = null;
                return;
            }
            plan.value = withPendingTicks(await PlansApi.getPlan(current.id));
            savedAt.value = new Date().toISOString();
            await saveSnapshot();
            listen(current.id);
        } catch (error) {
            if (!HttpClient.isNetworkError(error)) throw error;
            isOffline.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /** Ticks an item off or back on, at once; sent to the API when possible */
    async function toggle(item: ListItem): Promise<void> {
        if (!plan.value) return;
        const tick: PendingTick = {
            planId: plan.value.id,
            itemId: item.id,
            checked: !item.checkedAt,
            at: new Date().toISOString(),
        };
        replaceItem(applyTick(item, tick, currentUserReference()));
        // Only the last tick of an item matters
        queue.value = [...queue.value.filter((t) => t.itemId !== item.id), tick];
        await Promise.all([ShopCache.saveQueue(queue.value), saveSnapshot()]);
        void flush();
    }

    /** Sends the queued ticks in order; stops at the first network error (retried later) */
    function flush(): Promise<void> {
        flushing ??= (async () => {
            try {
                for (;;) {
                    const tick = queue.value[0];
                    if (!tick) break;
                    try {
                        const item = await PlansApi.setItemChecked(tick.planId, tick.itemId, {
                            checked: tick.checked,
                            at: tick.at,
                        });
                        queue.value = queue.value.slice(1);
                        // A newer tick of the same item may have been queued meanwhile
                        if (!pendingItemIds.value.has(item.id) && plan.value?.id === tick.planId) {
                            replaceItem(item);
                        }
                    } catch (error) {
                        if (HttpClient.isNetworkError(error)) {
                            isOffline.value = true;
                            break;
                        }
                        // Rejected (e.g. the item was removed from the list): drop it
                        queue.value = queue.value.slice(1);
                    }
                    await ShopCache.saveQueue(queue.value);
                }
                await saveSnapshot();
            } finally {
                flushing = null;
            }
        })();
        return flushing;
    }

    function onEvent(event: PlanEvent): void {
        if (event.kind === 'item-checked' && event.item) {
            // This device's own unsent tick is newer than what others did before it
            if (!pendingItemIds.value.has(event.item.id)) {
                replaceItem(event.item);
                void saveSnapshot();
            }
        } else if (event.kind === 'plan-changed') {
            // Build mode sends a burst of changes: reload once
            clearTimeout(reloadTimer);
            reloadTimer = setTimeout(() => void refresh(), 500);
        }
    }

    function listen(planId: string): void {
        if (closeEvents && listeningTo === planId) return;
        stop();
        listeningTo = planId;
        closeEvents = connectPlanEvents(planId, {
            onEvent,
            onStatus: (connected) => {
                const reconnected = connected && !isLive.value;
                isLive.value = connected;
                // Catch up on what happened while the stream was down
                if (reconnected && isOffline.value) void refresh().then(flush);
            },
        });
    }

    function stop(): void {
        closeEvents?.();
        closeEvents = null;
        listeningTo = null;
        isLive.value = false;
        clearTimeout(reloadTimer);
    }

    /** Back online or back in the foreground */
    async function resume(): Promise<void> {
        await flush();
        await refresh();
    }

    return {
        plan,
        categories,
        stores,
        savedAt,
        storeId,
        queue,
        pendingItemIds,
        isLoading,
        isOffline,
        hasNoPlan,
        isLive,
        setStoreFilter,
        start,
        refresh,
        toggle,
        flush,
        resume,
        stop,
    };
});
