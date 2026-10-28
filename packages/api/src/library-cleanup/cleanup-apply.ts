import type { DataSource, EntityManager } from 'typeorm';
import type { Cleanup, DishCleanup, IngredientCleanup } from './cleanup-file.js';

export interface CleanupReport {
    ingredientsMerged: number;
    ingredientsRenamed: number;
    ingredientsCreated: number;
    ingredientsCategorised: number;
    ingredientsRemoved: number;
    /** Not ingredients, but still on a shopping list: taken off the dishes, kept */
    ingredientsKeptForLists: string[];
    dishesMerged: number;
    dishesRenamed: number;
    dishIngredientsSet: number;
    dishesRemoved: number;
    /** Still planned: not removed */
    dishesKeptForPlans: string[];
    /** Names in the file that are not in the database (and not created) */
    notFound: string[];
}

interface Row {
    id: string;
}

const emptyReport = (): CleanupReport => ({
    ingredientsMerged: 0,
    ingredientsRenamed: 0,
    ingredientsCreated: 0,
    ingredientsCategorised: 0,
    ingredientsRemoved: 0,
    ingredientsKeptForLists: [],
    dishesMerged: 0,
    dishesRenamed: 0,
    dishIngredientsSet: 0,
    dishesRemoved: 0,
    dishesKeptForPlans: [],
    notFound: [],
});

/** Rows changed by an UPDATE: TypeORM returns [rows, count] for it on PostgreSQL */
function changedRows(result: unknown): number {
    if (Array.isArray(result) && result.length === 2 && typeof result[1] === 'number') {
        return result[1];
    }
    return Array.isArray(result) ? result.length : 0;
}

/** Gives a name found regardless of case the spelling of the file ("aardappelen" → "Aardappelen") */
async function alignName(
    manager: EntityManager,
    table: 'ingredients' | 'dishes',
    id: string,
    name: string,
): Promise<boolean> {
    const result: unknown = await manager.query(
        `UPDATE ${table} SET name = $2 WHERE id = $1 AND name <> $2`,
        [id, name],
    );
    return changedRows(result) > 0;
}

async function findId(
    manager: EntityManager,
    table: 'ingredients' | 'dishes',
    name: string,
): Promise<string | null> {
    const rows = await manager.query<Row[]>(
        `SELECT id FROM ${table} WHERE lower(name) = lower($1)`,
        [name],
    );
    return rows[0]?.id ?? null;
}

/**
 * Applies the reviewed cleanup in one transaction, by name: ingredients first (merges, categories,
 * removals), then dishes (merges, ingredients), then the dishes to remove. Running it again is
 * safe: what is already done is skipped. With `dryRun` everything is rolled back.
 */
export async function applyCleanup(
    dataSource: DataSource,
    cleanup: Cleanup,
    dryRun: boolean,
): Promise<CleanupReport> {
    const report = emptyReport();
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
        const manager = runner.manager;
        const categories = await manager.query<{ id: string; name: string }[]>(
            'SELECT id, name FROM categories',
        );
        const categoryIds = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
        const unknown = cleanup.ingredients
            .map((i) => i.category)
            .filter((c): c is string => c !== null && !categoryIds.has(c.toLowerCase()));
        if (unknown.length) {
            throw new Error(`Unknown categories: ${[...new Set(unknown)].join(', ')}`);
        }

        for (const ingredient of cleanup.ingredients) {
            await applyIngredient(manager, ingredient, categoryIds, report);
        }
        for (const dish of cleanup.dishes) {
            await applyDish(manager, dish, report);
        }
        for (const name of cleanup.removeDishes) {
            await removeDish(manager, name, report);
        }

        if (dryRun) {
            await runner.rollbackTransaction();
        } else {
            await runner.commitTransaction();
        }
        return report;
    } catch (error) {
        await runner.rollbackTransaction();
        throw error;
    } finally {
        await runner.release();
    }
}

async function applyIngredient(
    manager: EntityManager,
    ingredient: IngredientCleanup,
    categoryIds: Map<string, string>,
    report: CleanupReport,
): Promise<void> {
    let targetId = await findId(manager, 'ingredients', ingredient.name);
    const variantIds: string[] = [];
    for (const variant of ingredient.variants) {
        const id = await findId(manager, 'ingredients', variant);
        if (id && id !== targetId) variantIds.push(id);
    }

    if (ingredient.category === null) {
        for (const id of [targetId, ...variantIds]) {
            if (id) await removeIngredient(manager, id, report);
        }
        return;
    }

    // The name to keep doesn't exist yet: the first spelling that does becomes it
    if (!targetId) {
        targetId = variantIds.shift() ?? null;
        if (targetId) {
            await manager.query('UPDATE ingredients SET name = $2 WHERE id = $1', [
                targetId,
                ingredient.name,
            ]);
            report.ingredientsRenamed++;
        } else {
            const [created] = await manager.query<Row[]>(
                'INSERT INTO ingredients (name) VALUES ($1) RETURNING id',
                [ingredient.name],
            );
            if (!created) throw new Error(`Could not create "${ingredient.name}"`);
            targetId = created.id;
            report.ingredientsCreated++;
        }
    } else if (await alignName(manager, 'ingredients', targetId, ingredient.name)) {
        report.ingredientsRenamed++;
    }

    for (const variantId of variantIds) {
        await mergeIngredient(manager, variantId, targetId);
        report.ingredientsMerged++;
    }

    const categoryId = categoryIds.get(ingredient.category.toLowerCase());
    const updated: unknown = await manager.query(
        `UPDATE ingredients SET category_id = $2
         WHERE id = $1 AND category_id IS DISTINCT FROM $2`,
        [targetId, categoryId],
    );
    if (changedRows(updated) > 0) report.ingredientsCategorised++;
}

/** Moves everything that uses the variant to the target, then deletes the variant */
async function mergeIngredient(
    manager: EntityManager,
    variantId: string,
    targetId: string,
): Promise<void> {
    // Dish lines: a dish that has both keeps the target's line
    await manager.query(
        `UPDATE dish_ingredients SET ingredient_id = $2
         WHERE ingredient_id = $1
           AND dish_id NOT IN (SELECT dish_id FROM dish_ingredients WHERE ingredient_id = $2)`,
        [variantId, targetId],
    );
    await manager.query('DELETE FROM dish_ingredients WHERE ingredient_id = $1', [variantId]);

    await manager.query(
        `INSERT INTO ingredient_default_stores (ingredient_id, store_id)
         SELECT $2, store_id FROM ingredient_default_stores WHERE ingredient_id = $1
         ON CONFLICT DO NOTHING`,
        [variantId, targetId],
    );

    // Shopping lists with both: the target's line takes over the days and the free-item flag
    await manager.query(
        `INSERT INTO list_item_sources (list_item_id, plan_id, date)
         SELECT target.id, s.plan_id, s.date
         FROM list_items variant
         JOIN list_items target ON target.plan_id = variant.plan_id AND target.ingredient_id = $2
         JOIN list_item_sources s ON s.list_item_id = variant.id
         WHERE variant.ingredient_id = $1
         ON CONFLICT DO NOTHING`,
        [variantId, targetId],
    );
    await manager.query(
        `UPDATE list_items target
         SET manual = target.manual OR variant.manual,
             note = COALESCE(target.note, variant.note)
         FROM list_items variant
         WHERE variant.ingredient_id = $1 AND target.ingredient_id = $2
           AND target.plan_id = variant.plan_id`,
        [variantId, targetId],
    );
    await manager.query(
        `DELETE FROM list_items variant
         WHERE variant.ingredient_id = $1
           AND EXISTS (SELECT 1 FROM list_items target
                       WHERE target.plan_id = variant.plan_id AND target.ingredient_id = $2)`,
        [variantId, targetId],
    );
    await manager.query('UPDATE list_items SET ingredient_id = $2 WHERE ingredient_id = $1', [
        variantId,
        targetId,
    ]);

    // Keeps the variant's category when the target has none (set again right after)
    await manager.query(
        `UPDATE ingredients target SET category_id = variant.category_id
         FROM ingredients variant
         WHERE target.id = $2 AND variant.id = $1 AND target.category_id IS NULL`,
        [variantId, targetId],
    );
    await manager.query('DELETE FROM ingredients WHERE id = $1', [variantId]);
}

/** Takes a non-ingredient off every dish; deletes it unless a shopping list still has it */
async function removeIngredient(
    manager: EntityManager,
    id: string,
    report: CleanupReport,
): Promise<void> {
    await manager.query('DELETE FROM dish_ingredients WHERE ingredient_id = $1', [id]);
    const onLists = await manager.query<Row[]>(
        'SELECT id FROM list_items WHERE ingredient_id = $1 LIMIT 1',
        [id],
    );
    if (onLists.length) {
        const [row] = await manager.query<{ name: string }[]>(
            'SELECT name FROM ingredients WHERE id = $1',
            [id],
        );
        if (row) report.ingredientsKeptForLists.push(row.name);
        return;
    }
    await manager.query('DELETE FROM ingredients WHERE id = $1', [id]);
    report.ingredientsRemoved++;
}

async function applyDish(
    manager: EntityManager,
    dish: DishCleanup,
    report: CleanupReport,
): Promise<void> {
    let targetId = await findId(manager, 'dishes', dish.name);
    const variantIds: string[] = [];
    for (const variant of dish.variants) {
        const id = await findId(manager, 'dishes', variant);
        if (id && id !== targetId) variantIds.push(id);
    }
    if (!targetId) {
        targetId = variantIds.shift() ?? null;
        if (!targetId) {
            report.notFound.push(dish.name);
            return;
        }
        await manager.query('UPDATE dishes SET name = $2 WHERE id = $1', [targetId, dish.name]);
        report.dishesRenamed++;
    } else if (await alignName(manager, 'dishes', targetId, dish.name)) {
        report.dishesRenamed++;
    }

    for (const variantId of variantIds) {
        // Plans keep their days; recipe, source and servings fill in what the target lacks
        await manager.query('UPDATE plan_days SET dish_id = $2 WHERE dish_id = $1', [
            variantId,
            targetId,
        ]);
        await manager.query(
            `UPDATE dishes target
             SET historical_count = target.historical_count + variant.historical_count,
                 recipe = COALESCE(target.recipe, variant.recipe),
                 source_url = COALESCE(target.source_url, variant.source_url),
                 servings = COALESCE(target.servings, variant.servings)
             FROM dishes variant
             WHERE target.id = $2 AND variant.id = $1`,
            [variantId, targetId],
        );
        await manager.query('DELETE FROM dishes WHERE id = $1', [variantId]);
        report.dishesMerged++;
    }

    if (dish.ingredients && (await setDishIngredients(manager, targetId, dish.ingredients))) {
        report.dishIngredientsSet++;
    }
}

/**
 * The dish gets exactly these ingredients, in this order; lines it keeps keep their amounts.
 * Returns false when it already had them.
 */
async function setDishIngredients(
    manager: EntityManager,
    dishId: string,
    names: string[],
): Promise<boolean> {
    const current = await manager.query<{ name: string }[]>(
        `SELECT i.name FROM dish_ingredients di JOIN ingredients i ON i.id = di.ingredient_id
         WHERE di.dish_id = $1 ORDER BY di.position`,
        [dishId],
    );
    const same =
        current.length === names.length &&
        current.every((row, index) => row.name.toLowerCase() === names[index]?.toLowerCase());
    if (same) return false;

    if (names.length) {
        await manager.query(
            `INSERT INTO ingredients (name) SELECT unnest($1::text[])
             ON CONFLICT ((lower(name))) DO NOTHING`,
            [names],
        );
    }
    await manager.query(
        `DELETE FROM dish_ingredients di USING ingredients i
         WHERE di.dish_id = $1 AND i.id = di.ingredient_id
           AND NOT (lower(i.name) = ANY(SELECT lower(unnest($2::text[]))))`,
        [dishId, names],
    );
    await manager.query(
        `INSERT INTO dish_ingredients (dish_id, ingredient_id, position)
         SELECT $1, i.id, n.position
         FROM unnest($2::text[]) WITH ORDINALITY AS n(name, position)
         JOIN ingredients i ON lower(i.name) = lower(n.name)
         ON CONFLICT ON CONSTRAINT "UQ_dish_ingredients_dish_id_ingredient_id"
         DO UPDATE SET position = EXCLUDED.position`,
        [dishId, names],
    );
    return true;
}

async function removeDish(
    manager: EntityManager,
    name: string,
    report: CleanupReport,
): Promise<void> {
    const id = await findId(manager, 'dishes', name);
    // Already removed (by an earlier run, or by hand)
    if (!id) return;
    const planned = await manager.query<Row[]>(
        'SELECT dish_id AS id FROM plan_days WHERE dish_id = $1 LIMIT 1',
        [id],
    );
    if (planned.length) {
        report.dishesKeptForPlans.push(name);
        return;
    }
    await manager.query('DELETE FROM dishes WHERE id = $1', [id]);
    report.dishesRemoved++;
}
