import type { Dish, DishRequest } from '@/api/services/types/library';

export interface DishFormLine {
    /** Stable key for the list, lines have no id */
    key: number;
    name: string;
    amount: number | null;
    unit: string;
}

export interface DishFormState {
    name: string;
    servings: number | null;
    sourceUrl: string;
    recipe: string;
    lines: DishFormLine[];
}

let nextKey = 1;

export function emptyLine(): DishFormLine {
    return { key: nextKey++, name: '', amount: null, unit: '' };
}

/** "Risotto (kopie)", or "Risotto (kopie 2)" when that name is taken too */
export function copyName(name: string, existingNames: string[]): string {
    const taken = new Set(existingNames.map((n) => n.toLowerCase()));
    for (let number = 1; ; number++) {
        const candidate = number === 1 ? `${name} (kopie)` : `${name} (kopie ${String(number)})`;
        if (!taken.has(candidate.toLowerCase())) return candidate;
    }
}

/** A new dish filled in from an existing one: same ingredients, recipe and servings */
export function toCopyState(dish: Dish, existingNames: string[]): DishFormState {
    return { ...toFormState(dish), name: copyName(dish.name, existingNames) };
}

export function toFormState(dish?: Dish): DishFormState {
    if (!dish) {
        return { name: '', servings: null, sourceUrl: '', recipe: '', lines: [emptyLine()] };
    }
    return {
        name: dish.name,
        servings: dish.servings,
        sourceUrl: dish.sourceUrl ?? '',
        recipe: dish.recipe ?? '',
        lines: dish.ingredients.length
            ? dish.ingredients.map((line) => ({
                  key: nextKey++,
                  name: line.name,
                  amount: line.amount,
                  unit: line.unit ?? '',
              }))
            : // Something to type in right away, e.g. for a dish created from a plan
              [emptyLine()],
    };
}

/** The request for the API; lines without an ingredient name are left out */
export function toRequest(state: DishFormState): DishRequest {
    return {
        name: state.name.trim(),
        servings: state.servings,
        sourceUrl: state.sourceUrl.trim() || null,
        recipe: state.recipe.trim() || null,
        ingredients: state.lines
            .filter((line) => line.name.trim())
            .map((line) => ({
                name: line.name.trim(),
                // 0 is not a useful amount, treat it as "no amount"
                amount: line.amount === 0 ? null : line.amount,
                unit: line.unit.trim() || null,
            })),
    };
}

/** Keys of lines whose ingredient already occurs on an earlier line */
export function duplicateLineKeys(lines: DishFormLine[]): Set<number> {
    const seen = new Set<string>();
    const duplicates = new Set<number>();
    for (const line of lines) {
        const name = line.name.trim().toLowerCase();
        if (!name) continue;
        if (seen.has(name)) duplicates.add(line.key);
        seen.add(name);
    }
    return duplicates;
}

export function isValidUrl(value: string): boolean {
    return /^https?:\/\/\S+\.\S+/.test(value.trim());
}
