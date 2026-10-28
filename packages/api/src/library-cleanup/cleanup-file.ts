// The library cleanup file (import/cleanup.txt): reviewed by Maarten, then applied by name to a
// database (see cleanup-apply.ts and the README, "Cleaning up the library").

export interface IngredientCleanup {
    name: string;
    /** Category name, or null: not an ingredient, remove it */
    category: string | null;
    /** Merged into this ingredient */
    variants: string[];
}

export interface DishCleanup {
    name: string;
    /** Its ingredients from now on, or null to keep them */
    ingredients: string[] | null;
    /** Merged into this dish */
    variants: string[];
}

export interface Cleanup {
    ingredients: IngredientCleanup[];
    dishes: DishCleanup[];
    removeDishes: string[];
}

export class CleanupFileError extends Error {}

type Section = 'ingredients' | 'dishes' | 'remove-dishes';

export function readCleanup(text: string): Cleanup {
    const cleanup: Cleanup = { ingredients: [], dishes: [], removeDishes: [] };
    const errors: string[] = [];
    let section: Section | null = null;
    let ingredient: IngredientCleanup | null = null;
    let dish: DishCleanup | null = null;

    text.split(/\r?\n/).forEach((raw, index) => {
        const line = raw.trim();
        const at = `line ${String(index + 1)}`;
        if (!line || line.startsWith('#')) return;

        const header = /^\[(ingredients|dishes|remove-dishes)\]$/.exec(line);
        if (header?.[1]) {
            section = header[1] as Section;
            ingredient = null;
            dish = null;
            return;
        }
        if (!section) {
            errors.push(`${at}: expected [ingredients], [dishes] or [remove-dishes] first`);
            return;
        }

        if (section === 'ingredients') {
            if (line.startsWith('=')) {
                const match = /^=\s*(.+?)\s*\|\s*(.+)$/.exec(line);
                if (!match?.[1] || !match[2]) {
                    errors.push(`${at}: expected "= <name> | <category>" or "= <name> | -"`);
                    return;
                }
                ingredient = {
                    name: match[1],
                    category: match[2] === '-' ? null : match[2],
                    variants: [],
                };
                cleanup.ingredients.push(ingredient);
            } else if (line.startsWith('<') && ingredient) {
                ingredient.variants.push(line.slice(1).trim());
            } else {
                errors.push(`${at}: expected "= <name> | <category>" or "< <name>"`);
            }
            return;
        }

        if (section === 'remove-dishes') {
            if (line.startsWith('=')) {
                cleanup.removeDishes.push(line.slice(1).trim());
            } else {
                errors.push(`${at}: expected "= <name>"`);
            }
            return;
        }

        if (line.startsWith('=')) {
            dish = { name: line.slice(1).trim(), ingredients: null, variants: [] };
            cleanup.dishes.push(dish);
        } else if (!dish) {
            errors.push(`${at}: expected a dish ("= <name>") first`);
        } else if (line.startsWith('ingredients:')) {
            dish.ingredients = line
                .slice('ingredients:'.length)
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean);
        } else if (line.startsWith('<')) {
            dish.variants.push(line.slice(1).trim());
        } else {
            errors.push(`${at}: unknown line "${line.slice(0, 40)}"`);
        }
    });

    errors.push(...findDuplicates(cleanup));
    if (errors.length) {
        throw new CleanupFileError(`The cleanup file has errors:\n- ${errors.join('\n- ')}`);
    }
    return cleanup;
}

/** A name may occur once per section: as an ingredient (or dish) or as a variant of one */
function findDuplicates(cleanup: Cleanup): string[] {
    const errors: string[] = [];
    const check = (kind: string, names: string[]) => {
        const seen = new Set<string>();
        for (const name of names) {
            const key = name.toLowerCase();
            if (seen.has(key)) errors.push(`the ${kind} "${name}" occurs twice`);
            seen.add(key);
        }
    };
    check(
        'ingredient',
        cleanup.ingredients.flatMap((i) => [i.name, ...i.variants]),
    );
    check('dish', [
        ...cleanup.dishes.flatMap((d) => [d.name, ...d.variants]),
        ...cleanup.removeDishes,
    ]);
    return errors;
}
