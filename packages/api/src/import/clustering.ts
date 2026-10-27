import { type NoteEntry, splitList } from './notes-parser.js';

// Groups the dishes of the export: the same dish written in different ways becomes one dish,
// with how often it was planned. Its name lists ingredients, which are proposed as the dish's
// ingredients; spellings of the same ingredient are grouped too.

export interface DishVariant {
    name: string;
    count: number;
}

export interface DishCluster {
    /** The most used spelling */
    name: string;
    count: number;
    sourceUrl: string | null;
    ingredients: string[];
    variants: DishVariant[];
}

export interface IngredientCluster {
    name: string;
    count: number;
    variants: DishVariant[];
}

// Words that say how, not what: they don't tell dishes apart
const FILLER = new Set([
    'met',
    'en',
    'de',
    'het',
    'een',
    'van',
    'in',
    'op',
    'of',
    'en/of',
    'zelfgemaakte',
    'zelfgemaakt',
]);

/** Lowercase without accents and punctuation */
export function normalize(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/['’]s\b/g, 's')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * A rough Dutch singular, to recognise spellings of one ingredient: tomaten/tomaat,
 * patatten/patat, erwtjes/erwten/erwt, champignons/champignon.
 */
export function stem(word: string): string {
    return normalize(word)
        .replace(/jes?$/, '')
        .replace(/(en|s)$/, '')
        .replace(/([aeiou])\1/g, '$1')
        .replace(/([^aeiou])\1/g, '$1');
}

function tokens(name: string): Set<string> {
    return new Set(
        normalize(name)
            .split(' ')
            .filter((word) => word && !FILLER.has(word))
            .map(stem),
    );
}

/** Levenshtein distance, for typos ("boeekweitsalade") */
function distance(a: string, b: string): number {
    const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        let diagonal = previous[0] ?? 0;
        previous[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const above = previous[j] ?? 0;
            previous[j] = Math.min(
                above + 1,
                (previous[j - 1] ?? 0) + 1,
                diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
            );
            diagonal = above;
        }
    }
    return previous[b.length] ?? 0;
}

const sameWord = (a: string, b: string) =>
    a === b || (Math.min(a.length, b.length) >= 5 && distance(a, b) <= 1);

/**
 * How alike two dish names are: the share of words they have in common (Jaccard), with small
 * typos allowed. Word order and filler words don't matter.
 */
export function similarity(a: string, b: string): number {
    const left = [...tokens(a)];
    const right = [...tokens(b)];
    if (left.length === 0 || right.length === 0) return 0;
    const shared = left.filter((word) => right.some((other) => sameWord(word, other))).length;
    return shared / (left.length + right.length - shared);
}

/** Dishes this alike are taken as the same dish */
export const SAME_DISH = 0.75;

export function clusterDishes(entries: NoteEntry[]): DishCluster[] {
    const variants = new Map<string, DishVariant & { entries: NoteEntry[] }>();
    for (const entry of entries.filter((e) => e.kind === 'dish')) {
        const key = normalize(entry.name);
        const variant = variants.get(key) ?? { name: entry.name, count: 0, entries: [] };
        variant.count++;
        variant.entries.push(entry);
        variants.set(key, variant);
    }

    // Most used first, so the most used spelling names the dish
    const sorted = [...variants.values()].sort(
        (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
    const clusters: (DishCluster & { entries: NoteEntry[] })[] = [];
    for (const variant of sorted) {
        const cluster = clusters.find((c) => similarity(c.name, variant.name) >= SAME_DISH);
        if (cluster) {
            cluster.count += variant.count;
            cluster.variants.push({ name: variant.name, count: variant.count });
            cluster.entries.push(...variant.entries);
        } else {
            clusters.push({
                name: variant.name,
                count: variant.count,
                sourceUrl: null,
                ingredients: [],
                variants: [{ name: variant.name, count: variant.count }],
                entries: [...variant.entries],
            });
        }
    }

    return clusters
        .map(({ entries: clusterEntries, ...cluster }) => ({
            ...cluster,
            sourceUrl: clusterEntries.find((e) => e.sourceUrl)?.sourceUrl ?? null,
            ingredients: proposeIngredients(
                cluster.name,
                clusterEntries.flatMap((e) => e.listedIngredients),
            ),
        }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// The first word(s) of a name, when they say what kind of dish it is rather than what is in it
const DISH_TYPES: Record<string, string | null> = {
    risotto: 'Risottorijst',
    wok: null,
    slaatje: null,
    salade: null,
    soep: null,
    curry: null,
    quiche: null,
    ovenschotel: null,
    schotel: null,
    'fitte schotel': null,
    stoemp: null,
    pannenkoeken: null,
    pizza: null,
    'zelfgemaakte pizza': null,
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Ingredients a dish name suggests: "Zalm met erwten en patatten" gives Zalm, Erwten, Patatten.
 * Plus the ingredients listed between parentheses in the export.
 */
export function proposeIngredients(name: string, listed: string[] = []): string[] {
    const lower = name.toLowerCase();
    const [head = '', rest] = lower.split(/\s+met\s+(.*)/s);
    // A name without "met" is the name of a dish ("Hippe waterzooi"), unless it is one word
    // ("Spaghetti")
    const fromName =
        rest === undefined
            ? head.includes(' ')
                ? []
                : [head]
            : [head, ...splitList(rest.replace(/\s+met\s+/g, ', '))];
    const parts = [...fromName, ...listed]
        .flatMap((part) => {
            const key = part.trim();
            if (!(key in DISH_TYPES)) return [part];
            const ingredient = DISH_TYPES[key];
            return ingredient ? [ingredient] : [];
        })
        .map((part) =>
            part
                .replace(/\b(in de oven|uit de oven|zelfgemaakte?|gebakken|verse)\b/g, '')
                .replace(/\s+/g, ' ')
                .trim(),
        )
        // Longer parts are descriptions, not ingredients
        .filter((part) => part.length > 1 && part.split(' ').length <= 3);

    const seen = new Set<string>();
    return parts.map(capitalize).filter((part) => {
        const key = stem(part);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/** Groups spellings of the same ingredient; the most used one names it */
export function clusterIngredients(dishes: DishCluster[]): IngredientCluster[] {
    const counts = new Map<string, DishVariant>();
    for (const dish of dishes) {
        for (const ingredient of dish.ingredients) {
            const key = normalize(ingredient);
            const variant = counts.get(key) ?? { name: ingredient, count: 0 };
            variant.count += dish.count;
            counts.set(key, variant);
        }
    }
    const byStem = new Map<string, IngredientCluster>();
    for (const variant of [...counts.values()].sort((a, b) => b.count - a.count)) {
        const key = normalize(variant.name).split(' ').map(stem).join(' ');
        const cluster = byStem.get(key);
        if (cluster) {
            cluster.count += variant.count;
            cluster.variants.push(variant);
        } else {
            byStem.set(key, { name: variant.name, count: variant.count, variants: [variant] });
        }
    }
    return [...byStem.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
