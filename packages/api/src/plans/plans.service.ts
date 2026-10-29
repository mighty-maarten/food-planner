import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, Repository } from 'typeorm';
import { ApiException } from '../common/api-error.js';
import { IsoDate } from '../common/dates.js';
import { DatabaseHelper } from '../database/database.helper.js';
import { ListItemEntity } from '../database/entities/list-item.entity.js';
import { PlanEntity } from '../database/entities/plan.entity.js';
import { IngredientsService } from '../ingredients/ingredients.service.js';
import { PlanEventsService } from './plan-events.service.js';
import {
    assemblePlan,
    groupSources,
    type ListItemRow,
    type PlanRows,
    toListItem,
} from './plan-assembly.js';
import {
    type CarryOverCandidates,
    type ListItem,
    type ListItemCheckRequest,
    type ListItemRequest,
    type ListItemStoreRequest,
    type ListItemUpdateRequest,
    type Plan,
    PlanEventKind,
    type PlanRequest,
    type PlanSummary,
} from './types.js';

/** Longest plan: 31 days (end date included) */
const MAX_PLAN_DAYS = 31;

const ITEM_SELECT = `
    SELECT li.id, li.ingredient_id AS "ingredientId", i.name, i.category_id AS "categoryId",
           ARRAY(SELECT ds.store_id FROM ingredient_default_stores ds
                 WHERE ds.ingredient_id = i.id)::text[] AS "defaultStoreIds",
           li.store_override AS "storeOverride", li.store_id AS "storeId",
           li.note, li.needed_by AS "neededBy", li.manual,
           li.added_by_id AS "addedById", added_by.name AS "addedByName",
           li.checked_at AS "checkedAt",
           li.checked_by_id AS "checkedById", checked_by.name AS "checkedByName"
    FROM list_items li
    JOIN ingredients i ON i.id = li.ingredient_id
    LEFT JOIN users added_by ON added_by.id = li.added_by_id
    LEFT JOIN users checked_by ON checked_by.id = li.checked_by_id`;

// The planned dish of every source, with the amount that dish uses
const SOURCE_SELECT = `
    SELECT s.list_item_id AS "itemId", s.date, d.id AS "dishId", d.name AS "dishName",
           di.amount, di.unit
    FROM list_item_sources s
    JOIN list_items li ON li.id = s.list_item_id
    JOIN plan_days pd ON pd.plan_id = s.plan_id AND pd.date = s.date
    JOIN dishes d ON d.id = pd.dish_id
    LEFT JOIN dish_ingredients di ON di.dish_id = d.id AND di.ingredient_id = li.ingredient_id`;

@Injectable()
export class PlansService {
    private readonly logger = new Logger(PlansService.name);

    constructor(
        @InjectRepository(PlanEntity)
        private planRepository: Repository<PlanEntity>,
        @InjectRepository(ListItemEntity)
        private listItemRepository: Repository<ListItemEntity>,
        private ingredientsService: IngredientsService,
        private planEvents: PlanEventsService,
    ) {}

    /** All plans, newest first */
    public getPlans(): Promise<PlanSummary[]> {
        return this.planRepository.query(
            `SELECT p.id, p.start_date AS "startDate", p.end_date AS "endDate",
                    (SELECT count(*)::int FROM plan_days pd WHERE pd.plan_id = p.id) AS "dishCount",
                    (SELECT count(*)::int FROM list_items li WHERE li.plan_id = p.id) AS "itemCount",
                    (SELECT count(*)::int FROM list_items li
                     WHERE li.plan_id = p.id AND li.checked_at IS NULL) AS "openItemCount"
             FROM plans p
             ORDER BY p.start_date DESC`,
        );
    }

    public async getPlan(planId: string): Promise<Plan> {
        const plan = await this.getEntity(planId);
        const manager = this.planRepository.manager;
        const days: PlanRows['days'] = await manager.query(
            `SELECT pd.date, pd.dish_id AS "dishId", d.name AS "dishName"
             FROM plan_days pd JOIN dishes d ON d.id = pd.dish_id
             WHERE pd.plan_id = $1`,
            [planId],
        );
        const [dishIngredients, items, sources] = await Promise.all([
            manager.query<PlanRows['dishIngredients']>(
                `SELECT di.dish_id AS "dishId", di.ingredient_id AS "ingredientId", i.name,
                        i.category_id AS "categoryId", di.amount, di.unit
                 FROM dish_ingredients di JOIN ingredients i ON i.id = di.ingredient_id
                 WHERE di.dish_id = ANY($1::uuid[])
                 ORDER BY di.position`,
                [days.map((day) => day.dishId)],
            ),
            manager.query<ListItemRow[]>(
                `${ITEM_SELECT} WHERE li.plan_id = $1 ORDER BY lower(i.name)`,
                [planId],
            ),
            manager.query<PlanRows['sources']>(`${SOURCE_SELECT} WHERE s.plan_id = $1`, [planId]),
        ]);
        return assemblePlan({ plan, days, dishIngredients, items, sources });
    }

    /** A new plan starts with the ingredients that are always needed on its shopping list */
    public async createPlan(request: PlanRequest, userId: string): Promise<Plan> {
        await this.assertValidRange(request);
        const planId = await this.planRepository.manager.transaction(async (manager) => {
            const plan = await manager.save(
                manager.create(PlanEntity, {
                    startDate: request.startDate,
                    endDate: request.endDate,
                    createdById: userId,
                }),
            );
            await manager.query(
                `INSERT INTO list_items (plan_id, ingredient_id, manual, added_by_id)
                 SELECT $1, id, TRUE, $2 FROM ingredients WHERE always_on_list`,
                [plan.id, userId],
            );
            return plan.id;
        });
        this.logger.log('Plan created', { planId });
        return this.getPlan(planId);
    }

    /** Changes the dates; days that fall outside the new range lose their dish */
    public async updatePlan(planId: string, request: PlanRequest, userId: string): Promise<Plan> {
        await this.getEntity(planId);
        await this.assertValidRange(request, planId);
        await this.planRepository.manager.transaction(async (manager) => {
            await manager.update(PlanEntity, planId, {
                startDate: request.startDate,
                endDate: request.endDate,
            });
            await manager.query(
                'DELETE FROM plan_days WHERE plan_id = $1 AND (date < $2 OR date > $3)',
                [planId, request.startDate, request.endDate],
            );
            await PlansService.removeUnneededItems(manager, planId);
        });
        return this.changed(planId, userId);
    }

    public async deletePlan(planId: string, userId: string): Promise<void> {
        const result = await this.planRepository.delete(planId);
        if (!result.affected) {
            throw PlansService.notFound(planId);
        }
        this.logger.log('Plan deleted', { planId });
        this.planEvents.emit(planId, { kind: PlanEventKind.PLAN_CHANGED, byUserId: userId });
    }

    /**
     * Plans a dish on a day (null: no cooking). A different dish clears the ingredients picked for
     * that day; list items no other day needs disappear.
     */
    public async setDayDish(
        planId: string,
        date: string,
        dishId: string | null,
        userId: string,
    ): Promise<Plan> {
        await this.assertDayOfPlan(planId, date);
        try {
            await this.planRepository.manager.transaction(async (manager) => {
                const current = await PlansService.getDayDishId(manager, planId, date);
                if (current === dishId) return;
                await manager.query('DELETE FROM plan_days WHERE plan_id = $1 AND date = $2', [
                    planId,
                    date,
                ]);
                if (dishId) {
                    await manager.query(
                        'INSERT INTO plan_days (plan_id, date, dish_id) VALUES ($1, $2, $3)',
                        [planId, date, dishId],
                    );
                }
                await PlansService.removeUnneededItems(manager, planId);
            });
        } catch (error) {
            if (DatabaseHelper.isForeignKeyViolation(error)) {
                throw ApiException.invalidRequest(`Dish '${String(dishId)}' does not exist`);
            }
            throw error;
        }
        return this.changed(planId, userId);
    }

    /** Sets which ingredients of the day's dish need to be bought (the rest is at home) */
    public async setDayIngredients(
        planId: string,
        date: string,
        ingredientIds: string[],
        userId: string,
    ): Promise<Plan> {
        await this.assertDayOfPlan(planId, date);
        await this.planRepository.manager.transaction(async (manager) => {
            const dishId = await PlansService.getDayDishId(manager, planId, date);
            if (!dishId) {
                throw ApiException.invalidRequest(`No dish is planned on ${date}`);
            }
            const lines: { ingredientId: string }[] = await manager.query(
                'SELECT ingredient_id AS "ingredientId" FROM dish_ingredients WHERE dish_id = $1',
                [dishId],
            );
            const ofDish = new Set(lines.map((line) => line.ingredientId));
            if (!ingredientIds.every((id) => ofDish.has(id))) {
                throw ApiException.invalidRequest(
                    'Only ingredients of the planned dish can be picked',
                );
            }

            await manager.query(
                `DELETE FROM list_item_sources s USING list_items li
                 WHERE s.list_item_id = li.id AND s.plan_id = $1 AND s.date = $2
                   AND NOT (li.ingredient_id = ANY($3::uuid[]))`,
                [planId, date, ingredientIds],
            );
            await manager.query(
                `INSERT INTO list_items (plan_id, ingredient_id, added_by_id)
                 SELECT $1, unnest($2::uuid[]), $3
                 ON CONFLICT (plan_id, ingredient_id) DO NOTHING`,
                [planId, ingredientIds, userId],
            );
            await manager.query(
                `INSERT INTO list_item_sources (list_item_id, plan_id, date)
                 SELECT li.id, $1, $2 FROM list_items li
                 WHERE li.plan_id = $1 AND li.ingredient_id = ANY($3::uuid[])
                 ON CONFLICT DO NOTHING`,
                [planId, date, ingredientIds],
            );
            await PlansService.removeUnneededItems(manager, planId);
        });
        return this.changed(planId, userId);
    }

    /** Adds an item without a dish (brood, waspoeder); merges with an existing line */
    public async addItem(planId: string, request: ListItemRequest, userId: string): Promise<Plan> {
        await this.getEntity(planId);
        await this.planRepository.manager.transaction(async (manager) => {
            const ids = await this.ingredientsService.findOrCreateByNames([request.name], manager);
            await manager.query(
                `INSERT INTO list_items (plan_id, ingredient_id, manual, note, needed_by, added_by_id)
                 VALUES ($1, $2, TRUE, $3, $4, $5)
                 ON CONFLICT (plan_id, ingredient_id) DO UPDATE SET
                     manual = TRUE,
                     note = COALESCE(EXCLUDED.note, list_items.note),
                     needed_by = COALESCE(EXCLUDED.needed_by, list_items.needed_by),
                     last_updated_on = CURRENT_TIMESTAMP`,
                [
                    planId,
                    ids.get(request.name.toLowerCase()),
                    request.note ?? null,
                    request.neededBy ?? null,
                    userId,
                ],
            );
        });
        return this.changed(planId, userId);
    }

    public async updateItem(
        planId: string,
        itemId: string,
        request: ListItemUpdateRequest,
        userId: string,
    ): Promise<Plan> {
        const result = await this.listItemRepository.update(
            { id: itemId, planId },
            { note: request.note ?? null, neededBy: request.neededBy ?? null },
        );
        if (!result.affected) {
            throw PlansService.itemNotFound(itemId);
        }
        return this.changed(planId, userId);
    }

    /** Removes the line, also from the days it was picked for */
    public async deleteItem(planId: string, itemId: string, userId: string): Promise<Plan> {
        const result = await this.listItemRepository.delete({ id: itemId, planId });
        if (!result.affected) {
            throw PlansService.itemNotFound(itemId);
        }
        return this.changed(planId, userId);
    }

    /**
     * Ticks an item off (or back on) in shop mode. The tick only applies when it is newer than
     * the last change of the item, so the last tick wins, also when a tick made offline reaches
     * the server later. Returns the current state of the item either way.
     */
    public async setItemChecked(
        planId: string,
        itemId: string,
        request: ListItemCheckRequest,
        userId: string,
    ): Promise<ListItem> {
        // A device clock running ahead must not win every later tick
        const now = new Date();
        const at = new Date(Math.min(new Date(request.at).getTime(), now.getTime()));
        const result = await this.listItemRepository
            .createQueryBuilder()
            .update(ListItemEntity)
            .set({
                checkedAt: request.checked ? at : null,
                checkedById: request.checked ? userId : null,
                checkChangedAt: at,
                lastUpdatedOn: now,
            })
            .where('id = :itemId AND plan_id = :planId', { itemId, planId })
            .andWhere('(check_changed_at IS NULL OR check_changed_at <= :at)', { at })
            .execute();

        const item = await this.getItem(planId, itemId);
        if (result.affected) {
            this.planEvents.emit(planId, {
                kind: PlanEventKind.ITEM_CHECKED,
                item,
                byUserId: userId,
            });
        }
        return item;
    }

    /** Sets where an item is bought on this list (or back to the ingredient's default stores) */
    public async setItemStore(
        planId: string,
        itemId: string,
        request: ListItemStoreRequest,
        userId: string,
    ): Promise<ListItem> {
        try {
            const result = await this.listItemRepository.update(
                { id: itemId, planId },
                {
                    storeOverride: request.override,
                    storeId: request.override ? request.storeId : null,
                },
            );
            if (!result.affected) {
                throw PlansService.itemNotFound(itemId);
            }
        } catch (error) {
            if (DatabaseHelper.isForeignKeyViolation(error)) {
                throw ApiException.invalidRequest(
                    `Store '${String(request.storeId)}' does not exist`,
                );
            }
            throw error;
        }
        const item = await this.getItem(planId, itemId);
        this.planEvents.emit(planId, { kind: PlanEventKind.ITEM_CHANGED, item, byUserId: userId });
        return item;
    }

    /** Items of the previous plan that were not ticked off and are not on this list yet */
    public async getCarryOverCandidates(planId: string): Promise<CarryOverCandidates> {
        const plan = await this.getEntity(planId);
        const previous = await this.planRepository
            .createQueryBuilder('plan')
            .where('plan.startDate < :startDate', { startDate: plan.startDate })
            .orderBy('plan.startDate', 'DESC')
            .getOne();
        if (!previous) {
            return { plan: null, items: [] };
        }

        const manager = this.planRepository.manager;
        const items: ListItemRow[] = await manager.query(
            `${ITEM_SELECT}
             WHERE li.plan_id = $1 AND li.checked_at IS NULL
               AND NOT EXISTS (SELECT 1 FROM list_items current
                               WHERE current.plan_id = $2
                                 AND current.ingredient_id = li.ingredient_id)
             ORDER BY lower(i.name)`,
            [previous.id, planId],
        );
        const sources = groupSources(
            await manager.query(`${SOURCE_SELECT} WHERE s.list_item_id = ANY($1::uuid[])`, [
                items.map((item) => item.id),
            ]),
        );
        return {
            plan: { id: previous.id, startDate: previous.startDate, endDate: previous.endDate },
            items: items.map((item) => toListItem(item, sources.get(item.id) ?? [])),
        };
    }

    /** Takes over items of the previous plan as items without a dish */
    public async carryOver(planId: string, itemIds: string[], userId: string): Promise<Plan> {
        const candidates = await this.getCarryOverCandidates(planId);
        const candidateIds = new Set(candidates.items.map((item) => item.id));
        if (!itemIds.every((id) => candidateIds.has(id))) {
            throw ApiException.invalidRequest(
                'Only open items of the previous plan that are not on this list can be carried over',
            );
        }
        await this.planRepository.query(
            `INSERT INTO list_items
                 (plan_id, ingredient_id, manual, note, store_override, store_id, added_by_id)
             SELECT $1, li.ingredient_id, TRUE, li.note, li.store_override, li.store_id, $3
             FROM list_items li
             WHERE li.id = ANY($2::uuid[])
             ON CONFLICT (plan_id, ingredient_id) DO UPDATE SET manual = TRUE`,
            [planId, itemIds, userId],
        );
        this.logger.log('Items carried over', { planId, count: itemIds.length });
        return this.changed(planId, userId);
    }

    /** Tells the live clients and returns the new plan */
    private async changed(planId: string, userId: string): Promise<Plan> {
        const plan = await this.getPlan(planId);
        this.planEvents.emit(planId, { kind: PlanEventKind.PLAN_CHANGED, byUserId: userId });
        return plan;
    }

    private async getItem(planId: string, itemId: string): Promise<ListItem> {
        const manager = this.planRepository.manager;
        const [row] = await manager.query<ListItemRow[]>(
            `${ITEM_SELECT} WHERE li.id = $1 AND li.plan_id = $2`,
            [itemId, planId],
        );
        if (!row) {
            throw PlansService.itemNotFound(itemId);
        }
        const sources = await manager.query<PlanRows['sources']>(
            `${SOURCE_SELECT} WHERE s.list_item_id = $1`,
            [itemId],
        );
        return toListItem(row, sources);
    }

    private async assertValidRange(request: PlanRequest, planId?: string): Promise<void> {
        const length = IsoDate.daysBetween(request.startDate, request.endDate) + 1;
        if (length < 1 || length > MAX_PLAN_DAYS) {
            throw ApiException.invalidRequest(
                `A plan ends on or after its start, and lasts at most ${String(MAX_PLAN_DAYS)} days`,
            );
        }
        // One plan per day keeps "the plan of today" and the previous plan unambiguous
        const overlapping = await this.planRepository
            .createQueryBuilder('plan')
            .where('plan.startDate <= :endDate AND plan.endDate >= :startDate', request)
            .andWhere(planId ? 'plan.id <> :planId' : 'TRUE', { planId })
            .getOne();
        if (overlapping) {
            throw ApiException.conflict('The dates overlap with another plan', {
                plan: {
                    id: overlapping.id,
                    startDate: overlapping.startDate,
                    endDate: overlapping.endDate,
                },
            });
        }
    }

    private async assertDayOfPlan(planId: string, date: string): Promise<void> {
        const plan = await this.getEntity(planId);
        if (date < plan.startDate || date > plan.endDate) {
            throw ApiException.invalidRequest(`${date} is not a day of this plan`);
        }
    }

    private async getEntity(planId: string): Promise<PlanEntity> {
        const plan = await this.planRepository.findOneBy({ id: planId });
        if (!plan) {
            throw PlansService.notFound(planId);
        }
        return plan;
    }

    private static async getDayDishId(
        manager: EntityManager,
        planId: string,
        date: string,
    ): Promise<string | null> {
        const rows: { dishId: string }[] = await manager.query(
            'SELECT dish_id AS "dishId" FROM plan_days WHERE plan_id = $1 AND date = $2',
            [planId, date],
        );
        return rows[0]?.dishId ?? null;
    }

    /** Items that were only on the list for dishes that are no longer planned (or picked) */
    private static async removeUnneededItems(
        manager: EntityManager,
        planId: string,
    ): Promise<void> {
        await manager.query(
            `DELETE FROM list_items li
             WHERE li.plan_id = $1 AND NOT li.manual
               AND NOT EXISTS (SELECT 1 FROM list_item_sources s WHERE s.list_item_id = li.id)`,
            [planId],
        );
    }

    private static notFound(planId: string): ApiException {
        return ApiException.notFound(`Plan '${planId}' was not found`);
    }

    private static itemNotFound(itemId: string): ApiException {
        return ApiException.notFound(`List item '${itemId}' was not found`);
    }
}
