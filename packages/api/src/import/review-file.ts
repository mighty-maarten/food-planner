import type { DishCluster, IngredientCluster } from './clustering.js';

// The review file: a plain text file Maarten edits before the import. It lists the dishes to
// import (with the spellings merged into them and the proposed ingredients), the entries that
// are skipped, and the ingredient spellings that are merged. Lines starting with # are comments.

export interface ReviewDish {
    name: string;
    /** How often it was planned: the sum of its variants */
    count: number;
    sourceUrl: string | null;
    ingredients: string[];
    variants: { name: string; count: number }[];
}

export interface Review {
    dishes: ReviewDish[];
    skipped: ReviewDish[];
    /** Ingredient name as proposed (lowercase) → the name to import */
    ingredientAliases: Map<string, string>;
}

const HEADER = `# Food Planner: old week menus to import (from the Apple Notes export)
#
# Review this file, then run the import (see the README, "Importing old menus").
# Lines starting with # are ignored. Per dish:
#
#   = <name>                 the dish; change the text to rename it
#   ingredients: a, b, c     its ingredients, separated by commas (edit freely, may be empty)
#   source: <url>            the recipe URL (optional)
#   < <spelling> | <count>   the spellings merged into this dish and how often each was planned;
#                            move a line to another dish to merge it there, delete it to drop it
#
# A dish without "<" lines counts as planned once. Delete a dish, or move it under [skip], to not
# import it; move a dish from [skip] to [dishes] to import it after all.
#
# [ingredients] merges spellings: every "< <spelling>" is imported as the "= <name>" above it.
# Add, move or remove lines as you like.
`;

function writeDish(dish: ReviewDish): string[] {
    return [
        `= ${dish.name}`,
        `ingredients: ${dish.ingredients.join(', ')}`,
        ...(dish.sourceUrl ? [`source: ${dish.sourceUrl}`] : []),
        ...dish.variants.map((variant) => `< ${variant.name} | ${String(variant.count)}`),
        '',
    ];
}

export function toReviewDish(cluster: DishCluster): ReviewDish {
    return {
        name: cluster.name,
        count: cluster.count,
        sourceUrl: cluster.sourceUrl,
        ingredients: cluster.ingredients,
        variants: cluster.variants,
    };
}

export function writeReview(
    dishes: ReviewDish[],
    skipped: ReviewDish[],
    ingredients: IngredientCluster[],
): string {
    return [
        HEADER,
        '[dishes]',
        '',
        ...dishes.flatMap(writeDish),
        '[skip]',
        '',
        ...skipped.flatMap(writeDish),
        '[ingredients]',
        '',
        ...ingredients
            .filter((ingredient) => ingredient.variants.length > 1)
            .flatMap((ingredient) => [
                `= ${ingredient.name}`,
                ...ingredient.variants
                    .filter((variant) => variant.name !== ingredient.name)
                    .map((variant) => `< ${variant.name}`),
                '',
            ]),
    ].join('\n');
}

export class ReviewFileError extends Error {}

export function readReview(text: string): Review {
    const review: Review = { dishes: [], skipped: [], ingredientAliases: new Map() };
    let section: 'dishes' | 'skip' | 'ingredients' | null = null;
    let dish: ReviewDish | null = null;
    let ingredient: string | null = null;
    const errors: string[] = [];

    const finishDish = () => {
        if (dish) {
            dish.count = dish.variants.reduce((sum, v) => sum + v.count, 0) || 1;
            (section === 'skip' ? review.skipped : review.dishes).push(dish);
        }
        dish = null;
    };

    text.split(/\r?\n/).forEach((raw, index) => {
        const line = raw.trim();
        const at = `line ${String(index + 1)}`;
        if (!line || line.startsWith('#')) return;

        const sectionMatch = /^\[(dishes|skip|ingredients)\]$/.exec(line);
        if (sectionMatch?.[1]) {
            finishDish();
            section = sectionMatch[1] as typeof section;
            return;
        }
        if (!section) {
            errors.push(`${at}: expected [dishes], [skip] or [ingredients] first`);
            return;
        }

        if (section === 'ingredients') {
            if (line.startsWith('=')) {
                ingredient = line.slice(1).trim();
            } else if (line.startsWith('<') && ingredient) {
                review.ingredientAliases.set(line.slice(1).trim().toLowerCase(), ingredient);
            } else {
                errors.push(`${at}: expected "= <name>" or "< <spelling>"`);
            }
            return;
        }

        if (line.startsWith('=')) {
            finishDish();
            const name = line.slice(1).trim();
            if (!name) errors.push(`${at}: a dish needs a name`);
            dish = { name, count: 0, sourceUrl: null, ingredients: [], variants: [] };
            return;
        }
        if (!dish) {
            errors.push(`${at}: expected a dish ("= <name>") first`);
            return;
        }
        const current: ReviewDish = dish;
        if (line.startsWith('ingredients:')) {
            current.ingredients = line
                .slice('ingredients:'.length)
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean);
        } else if (line.startsWith('source:')) {
            current.sourceUrl = line.slice('source:'.length).trim() || null;
        } else if (line.startsWith('<')) {
            const variant = /^<\s*(.*?)\s*\|\s*(\d+)\s*$/.exec(line);
            if (variant?.[1] !== undefined && variant[2]) {
                current.variants.push({ name: variant[1], count: Number(variant[2]) });
            } else {
                errors.push(`${at}: expected "< <spelling> | <count>"`);
            }
        } else {
            errors.push(`${at}: unknown line "${line.slice(0, 40)}"`);
        }
    });
    finishDish();

    const names = new Map<string, string>();
    for (const { name } of review.dishes) {
        const key = name.toLowerCase();
        if (names.has(key)) errors.push(`the dish "${name}" occurs twice, merge the two`);
        names.set(key, name);
    }
    if (errors.length) {
        throw new ReviewFileError(`The review file has errors:\n- ${errors.join('\n- ')}`);
    }
    return review;
}
