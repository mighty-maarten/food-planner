import type { Category } from '@/api/services/types/library';
import type { ListItem } from '@/api/services/types/plans';
import { TextUtil } from './text';
import { formatAmount } from './amount';

export interface ItemGroup {
    /** Category id, null for items without (a known) category */
    id: string | null;
    items: ListItem[];
}

/** Earliest needed first, items without a date last; then by name */
function compareItems(a: ListItem, b: ListItem): number {
    if (a.neededBy !== b.neededBy) {
        if (a.neededBy === null) return 1;
        if (b.neededBy === null) return -1;
        return a.neededBy.localeCompare(b.neededBy);
    }
    return TextUtil.compare(a.name, b.name);
}

/** Items grouped by category in the given order; uncategorised items come last */
export function groupItemsByCategory(items: ListItem[], categories: Category[]): ItemGroup[] {
    const known = new Set(categories.map((category) => category.id));
    const byCategory = new Map<string | null, ListItem[]>();
    for (const item of items) {
        const key = item.categoryId && known.has(item.categoryId) ? item.categoryId : null;
        byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
    }
    return [...categories.map((category) => category.id), null]
        .map((id) => ({ id, items: (byCategory.get(id) ?? []).sort(compareItems) }))
        .filter((group) => group.items.length > 0);
}

/** "Risotto (300 g), Fitte schotel" */
export function describeSources(item: ListItem): string {
    return item.sources
        .map((source) => {
            const amount = formatAmount(source.amount, source.unit);
            return amount ? `${source.dishName} (${amount})` : source.dishName;
        })
        .join(', ');
}
