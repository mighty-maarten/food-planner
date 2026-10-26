import type { DishIngredient } from '../dishes/types.js';
import { IsoDate } from '../common/dates.js';
import type { ListItem, ListItemSource, Plan, PlanDay } from './types.js';

/** Raw rows the plan is built from (see PlansRepository) */
export interface PlanRows {
    plan: { id: string; startDate: string; endDate: string };
    days: { date: string; dishId: string; dishName: string }[];
    dishIngredients: (DishIngredient & { dishId: string })[];
    items: ListItemRow[];
    sources: (ListItemSource & { itemId: string })[];
}

export interface ListItemRow {
    id: string;
    ingredientId: string;
    name: string;
    categoryId: string | null;
    storeIds: string[];
    note: string | null;
    neededBy: string | null;
    manual: boolean;
    addedById: string | null;
    addedByName: string | null;
    checkedAt: Date | null;
    checkedById: string | null;
    checkedByName: string | null;
}

const byDate = (a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date);

export function toListItem(row: ListItemRow, sources: ListItemSource[]): ListItem {
    const sorted = [...sources].sort(byDate);
    return {
        id: row.id,
        ingredientId: row.ingredientId,
        name: row.name,
        categoryId: row.categoryId,
        storeIds: row.storeIds,
        note: row.note,
        // The first day a planned dish needs it, unless set by hand
        neededBy: row.neededBy ?? sorted[0]?.date ?? null,
        neededByOverride: row.neededBy !== null,
        manual: row.manual,
        sources: sorted,
        addedBy: row.addedById ? { id: row.addedById, name: row.addedByName ?? '' } : null,
        checkedAt: row.checkedAt?.toISOString() ?? null,
        checkedBy: row.checkedById ? { id: row.checkedById, name: row.checkedByName ?? '' } : null,
    };
}

export function groupSources(rows: PlanRows['sources']): Map<string, ListItemSource[]> {
    const byItem = new Map<string, ListItemSource[]>();
    for (const { itemId, ...source } of rows) {
        byItem.set(itemId, [...(byItem.get(itemId) ?? []), source]);
    }
    return byItem;
}

export function assemblePlan(rows: PlanRows): Plan {
    const dayByDate = new Map(rows.days.map((day) => [day.date, day]));
    const sourcesByItem = groupSources(rows.sources);
    const items = rows.items.map((row) => toListItem(row, sourcesByItem.get(row.id) ?? []));

    const selectedByDate = new Map<string, string[]>();
    for (const item of items) {
        for (const source of item.sources) {
            selectedByDate.set(source.date, [
                ...(selectedByDate.get(source.date) ?? []),
                item.ingredientId,
            ]);
        }
    }

    const days: PlanDay[] = IsoDate.range(rows.plan.startDate, rows.plan.endDate).map((date) => {
        const day = dayByDate.get(date);
        return {
            date,
            dish: day
                ? {
                      id: day.dishId,
                      name: day.dishName,
                      ingredients: rows.dishIngredients
                          .filter((line) => line.dishId === day.dishId)
                          .map(({ ingredientId, name, categoryId, amount, unit }) => ({
                              ingredientId,
                              name,
                              categoryId,
                              amount,
                              unit,
                          })),
                  }
                : null,
            selectedIngredientIds: day ? (selectedByDate.get(date) ?? []) : [],
        };
    });

    return { ...rows.plan, days, items };
}
