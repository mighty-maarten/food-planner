import type { Category, Store } from '@/api/services/types/library';
import type { ListItem, Plan } from '@/api/services/types/plans';
import type { PendingStoreChange, PendingTick } from '@/offline/shop-cache';
import { DateUtil } from './date';
import { TextUtil } from './text';

export interface ShopGroup {
    /** null: items without (a known) category */
    categoryId: string | null;
    items: ListItem[];
}

export interface ShopList {
    /** Open items by category, in the order of the route through the store */
    groups: ShopGroup[];
    /** Ticked items, most recent first */
    checked: ListItem[];
}

/**
 * Items for a store: the ones bought there, plus the ones explicitly set to "any store" on this
 * list. Items without a store only show under all stores.
 */
export function isForStore(item: ListItem, storeId: string | null): boolean {
    if (!storeId) return true;
    if (item.storeOverride && item.storeIds.length === 0) return true;
    return item.storeIds.includes(storeId);
}

export function buildShopList(
    plan: Plan,
    storeId: string | null,
    categories: Category[],
    stores: Store[],
): ShopList {
    const items = plan.items.filter((item) => isForStore(item, storeId));
    const route =
        stores.find((store) => store.id === storeId)?.categoryIds ??
        categories.map((category) => category.id);

    const open = items.filter((item) => !item.checkedAt);
    const known = new Set(route);
    const groups = [...route, null]
        .map((categoryId) => ({
            categoryId,
            items: open
                .filter((item) =>
                    categoryId === null
                        ? !item.categoryId || !known.has(item.categoryId)
                        : item.categoryId === categoryId,
                )
                .sort((a, b) => TextUtil.compare(a.name, b.name)),
        }))
        .filter((group) => group.items.length > 0);

    const checked = items
        .filter((item) => item.checkedAt)
        .sort((a, b) => (b.checkedAt ?? '').localeCompare(a.checkedAt ?? ''));
    return { groups, checked };
}

/** Needed today, tomorrow or already overdue: buy it now */
export function isNeededSoon(neededBy: string | null, today: string): boolean {
    return !!neededBy && neededBy <= DateUtil.addDays(today, 1);
}

/** The item as ticked on this device, before the API confirms it */
export function applyTick(
    item: ListItem,
    tick: Pick<PendingTick, 'checked' | 'at'>,
    user: { id: string; name: string } | null,
): ListItem {
    return {
        ...item,
        checkedAt: tick.checked ? tick.at : null,
        checkedBy: tick.checked ? user : null,
    };
}

/** The item with its store chosen on this device, before the API confirms it */
export function applyStoreChange(
    item: ListItem,
    change: Pick<PendingStoreChange, 'override' | 'storeId'>,
): ListItem {
    return {
        ...item,
        storeOverride: change.override,
        storeIds: change.override ? (change.storeId ? [change.storeId] : []) : item.defaultStoreIds,
    };
}

/** "Lidl", "Lidl, Aldi" or null for any store */
export function storeNames(storeIds: string[], stores: Store[]): string | null {
    const names = storeIds.flatMap((id) => stores.find((store) => store.id === id)?.name ?? []);
    return names.length ? names.join(', ') : null;
}
