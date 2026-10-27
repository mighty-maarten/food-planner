import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AxiosError, AxiosHeaders } from 'axios';
import { useShopStore } from '@/stores/shop';
import { useAuthStore } from '@/stores/auth';
import { PlansApi } from '@/api/services/plans-api';
import { CategoriesApi } from '@/api/services/categories-api';
import { StoresApi } from '@/api/services/stores-api';
import { connectPlanEvents, type PlanEventsHandlers } from '@/api/plan-events';
import { ShopCache } from '@/offline/shop-cache';
import type { ListItem, Plan } from '@/api/services/types/plans';

vi.mock('@/api/services/plans-api', () => ({
    PlansApi: {
        getPlans: vi.fn(),
        getPlan: vi.fn(),
        setItemChecked: vi.fn(),
        setItemStore: vi.fn(),
    },
}));
vi.mock('@/api/services/categories-api', () => ({ CategoriesApi: { getCategories: vi.fn() } }));
vi.mock('@/api/services/stores-api', () => ({ StoresApi: { getStores: vi.fn() } }));
vi.mock('@/api/plan-events', () => ({ connectPlanEvents: vi.fn() }));
vi.mock('@/offline/shop-cache', () => ({
    ShopCache: {
        getSnapshot: vi.fn(),
        saveSnapshot: vi.fn(),
        getQueue: vi.fn(),
        saveQueue: vi.fn(),
        clear: vi.fn(),
    },
}));
vi.mock('@/composables/toast', () => ({ useToastMessages: () => ({}) }));

const item = (id: string, overrides: Partial<ListItem> = {}): ListItem => ({
    id,
    ingredientId: id,
    name: id,
    categoryId: null,
    storeIds: [],
    defaultStoreIds: [],
    storeOverride: false,
    note: null,
    neededBy: null,
    neededByOverride: false,
    manual: false,
    sources: [],
    addedBy: null,
    checkedAt: null,
    checkedBy: null,
    ...overrides,
});

const plan = (items: ListItem[]): Plan => ({
    id: 'plan-1',
    startDate: '2026-10-22',
    endDate: '2026-12-31',
    days: [],
    items,
});

const networkError = () => new AxiosError('Network Error', AxiosError.ERR_NETWORK);
const notFound = () =>
    new AxiosError('Not Found', AxiosError.ERR_BAD_REQUEST, undefined, undefined, {
        status: 404,
        statusText: 'Not Found',
        data: {},
        headers: {},
        config: { headers: new AxiosHeaders() },
    });

const confirmed = (id: string, checked: boolean) =>
    item(id, checked ? { checkedAt: '2026-10-30T10:00:00.000Z', checkedBy: me } : {});

const me = { id: 'user-1', name: 'Jane' };

describe('shop store', () => {
    let handlers: PlanEventsHandlers | undefined;

    beforeEach(() => {
        vi.resetAllMocks();
        localStorage.clear();
        setActivePinia(createPinia());
        useAuthStore().currentUser = { ...me, email: 'jane@example.com' };
        vi.mocked(ShopCache.getQueue).mockResolvedValue([]);
        vi.mocked(PlansApi.getPlans).mockResolvedValue([
            {
                id: 'plan-1',
                startDate: '2026-10-22',
                endDate: '2026-12-31',
                dishCount: 0,
                itemCount: 2,
                openItemCount: 2,
            },
        ]);
        vi.mocked(PlansApi.getPlan).mockImplementation(() =>
            Promise.resolve(plan([item('bread'), item('milk')])),
        );
        vi.mocked(CategoriesApi.getCategories).mockResolvedValue([]);
        vi.mocked(StoresApi.getStores).mockResolvedValue([]);
        vi.mocked(connectPlanEvents).mockImplementation((_planId, h) => {
            handlers = h;
            return () => undefined;
        });
    });

    const find = (id: string) => useShopStore().plan?.items.find((i) => i.id === id);

    it('shows the cached list when the API cannot be reached', async () => {
        vi.mocked(ShopCache.getSnapshot).mockResolvedValue({
            plan: plan([item('bread')]),
            categories: [],
            stores: [],
            savedAt: '2026-10-30T08:00:00.000Z',
        });
        vi.mocked(PlansApi.getPlans).mockRejectedValue(networkError());
        const shop = useShopStore();

        await shop.start();

        expect(shop.isOffline).toBe(true);
        expect(shop.plan?.items.map((i) => i.name)).toEqual(['bread']);
    });

    it('ticks at once and keeps the tick queued while offline', async () => {
        vi.mocked(PlansApi.setItemChecked).mockRejectedValue(networkError());
        const shop = useShopStore();
        await shop.start();

        const bread = find('bread');
        if (!bread) throw new Error('missing');
        await shop.toggle(bread);
        await shop.flush();

        expect(find('bread')?.checkedBy).toEqual(me);
        expect(shop.queue).toEqual([expect.objectContaining({ itemId: 'bread', checked: true })]);
        expect(ShopCache.saveQueue).toHaveBeenLastCalledWith(shop.queue);
    });

    it('sends the queued ticks in order once online, and keeps only the last tick per item', async () => {
        vi.mocked(PlansApi.setItemChecked).mockRejectedValue(networkError());
        const shop = useShopStore();
        await shop.start();
        for (const id of ['bread', 'milk', 'bread']) {
            const current = find(id);
            if (current) await shop.toggle(current);
        }
        await shop.flush();
        expect(shop.queue.map((t) => [t.itemId, t.kind === 'check' && t.checked])).toEqual([
            ['milk', true],
            ['bread', false],
        ]);

        // The API keeps the ticks it receives
        const serverChecked = new Map<string, boolean>();
        vi.mocked(PlansApi.setItemChecked).mockReset();
        vi.mocked(PlansApi.setItemChecked).mockImplementation((_planId, itemId, request) => {
            serverChecked.set(itemId, request.checked);
            return Promise.resolve(confirmed(itemId, request.checked));
        });
        vi.mocked(PlansApi.getPlan).mockImplementation(() =>
            Promise.resolve(
                plan(['bread', 'milk'].map((id) => confirmed(id, serverChecked.get(id) ?? false))),
            ),
        );
        await shop.resume();

        expect(vi.mocked(PlansApi.setItemChecked).mock.calls.map((c) => c[1])).toEqual([
            'milk',
            'bread',
        ]);
        expect(shop.queue).toEqual([]);
        expect(find('milk')?.checkedAt).not.toBeNull();
        expect(find('bread')?.checkedAt).toBeNull();
    });

    it('drops a tick the API rejects', async () => {
        vi.mocked(PlansApi.setItemChecked).mockRejectedValue(notFound());
        const shop = useShopStore();
        await shop.start();

        const bread = find('bread');
        if (bread) await shop.toggle(bread);
        await shop.flush();

        expect(shop.queue).toEqual([]);
    });

    it("applies the other shopper's ticks, but not over an unsent tick", async () => {
        vi.mocked(PlansApi.setItemChecked).mockRejectedValue(networkError());
        const shop = useShopStore();
        await shop.start();
        const bread = find('bread');
        if (bread) await shop.toggle(bread);
        await shop.flush();

        const other = { id: 'user-2', name: 'Sam' };
        handlers?.onEvent({
            kind: 'item-checked',
            item: item('milk', { checkedAt: '2026-10-30T10:00:00Z', checkedBy: other }),
        });
        handlers?.onEvent({ kind: 'item-checked', item: item('bread') });

        expect(find('milk')?.checkedBy).toEqual(other);
        expect(find('bread')?.checkedBy).toEqual(me);
    });

    it('moves an item to another store at once, and keeps its tick queued apart', async () => {
        vi.mocked(PlansApi.setItemChecked).mockRejectedValue(networkError());
        vi.mocked(PlansApi.setItemStore).mockRejectedValue(networkError());
        const shop = useShopStore();
        await shop.start();
        const bread = find('bread');
        if (!bread) throw new Error('missing');

        await shop.setItemStore(bread, true, 'carrefour');
        const moved = find('bread');
        if (moved) await shop.toggle(moved);
        await shop.flush();

        expect(find('bread')).toMatchObject({ storeOverride: true, storeIds: ['carrefour'] });
        expect(find('bread')?.checkedAt).not.toBeNull();
        expect(shop.queue.map((c) => c.kind)).toEqual(['store', 'check']);

        const back = find('bread');
        if (back) await shop.setItemStore(back, false, 'ignored');
        expect(find('bread')).toMatchObject({ storeOverride: false, storeIds: [] });
        expect(shop.queue).toEqual([
            expect.objectContaining({ kind: 'check' }),
            expect.objectContaining({ kind: 'store', override: false, storeId: null }),
        ]);
    });

    it('remembers the chosen store on this device', () => {
        useShopStore().setStoreFilter('colruyt');
        setActivePinia(createPinia());
        expect(useShopStore().storeId).toBe('colruyt');
    });
});
