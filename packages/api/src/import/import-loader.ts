import type { DataSource, EntityManager } from 'typeorm';
import type { Review } from './review-file.js';

export interface ImportResult {
    created: number;
    /** Existing dishes (same name): only their historical count is updated */
    updated: number;
    ingredientsCreated: number;
}

const DISH_NAME_MAX = 200;
const INGREDIENT_NAME_MAX = 100;

/** The ingredients to import for a dish: merged spellings, no duplicates */
export function resolveIngredients(names: string[], aliases: Map<string, string>): string[] {
    const seen = new Set<string>();
    return names
        .map((name) => aliases.get(name.toLowerCase()) ?? name)
        .filter((name) => {
            const key = name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

export function validateReview(review: Review): string[] {
    const errors: string[] = [];
    for (const dish of review.dishes) {
        if (dish.name.length > DISH_NAME_MAX) {
            errors.push(`dish name longer than ${String(DISH_NAME_MAX)}: "${dish.name}"`);
        }
        for (const name of resolveIngredients(dish.ingredients, review.ingredientAliases)) {
            if (name.length > INGREDIENT_NAME_MAX) {
                errors.push(`ingredient name too long in "${dish.name}": "${name}"`);
            }
        }
        if (dish.sourceUrl && !/^https?:\/\/\S+$/.test(dish.sourceUrl)) {
            errors.push(`source of "${dish.name}" is not a URL: ${dish.sourceUrl}`);
        }
    }
    return errors;
}

/**
 * Imports the reviewed dishes in one transaction. Running it again is safe: dishes that exist
 * (same name, any case) keep their ingredients and recipe, only their historical count is set.
 * With `dryRun` everything is rolled back.
 */
export async function importReview(
    dataSource: DataSource,
    review: Review,
    dryRun: boolean,
): Promise<ImportResult> {
    const result: ImportResult = { created: 0, updated: 0, ingredientsCreated: 0 };
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
        const manager = runner.manager;
        for (const dish of review.dishes) {
            const existing: { id: string }[] = await manager.query(
                'SELECT id FROM dishes WHERE lower(name) = lower($1)',
                [dish.name],
            );
            if (existing[0]) {
                await manager.query('UPDATE dishes SET historical_count = $2 WHERE id = $1', [
                    existing[0].id,
                    dish.count,
                ]);
                result.updated++;
                continue;
            }
            const [created] = await manager.query<{ id: string }[]>(
                `INSERT INTO dishes (name, source_url, historical_count) VALUES ($1, $2, $3)
                 RETURNING id`,
                [dish.name, dish.sourceUrl, dish.count],
            );
            if (!created) throw new Error(`Could not create "${dish.name}"`);
            const names = resolveIngredients(dish.ingredients, review.ingredientAliases);
            result.ingredientsCreated += await addIngredients(manager, created.id, names);
            result.created++;
        }
        if (dryRun) {
            await runner.rollbackTransaction();
        } else {
            await runner.commitTransaction();
        }
        return result;
    } catch (error) {
        await runner.rollbackTransaction();
        throw error;
    } finally {
        await runner.release();
    }
}

/** Adds the ingredient lines, creating unknown ingredients; returns how many were created */
async function addIngredients(
    manager: EntityManager,
    dishId: string,
    names: string[],
): Promise<number> {
    if (names.length === 0) return 0;
    const inserted: unknown[] = await manager.query(
        `INSERT INTO ingredients (name) SELECT unnest($1::text[])
         ON CONFLICT ((lower(name))) DO NOTHING RETURNING id`,
        [names],
    );
    await manager.query(
        `INSERT INTO dish_ingredients (dish_id, ingredient_id, position)
         SELECT $1, i.id, n.position
         FROM unnest($2::text[]) WITH ORDINALITY AS n(name, position)
         JOIN ingredients i ON lower(i.name) = lower(n.name)`,
        [dishId, names],
    );
    return inserted.length;
}
