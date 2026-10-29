import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, Repository } from 'typeorm';
import { ApiException } from '../common/api-error.js';
import { DatabaseHelper } from '../database/database.helper.js';
import { DishIngredientEntity } from '../database/entities/dish-ingredient.entity.js';
import { DishEntity } from '../database/entities/dish.entity.js';
import { IngredientsService } from '../ingredients/ingredients.service.js';
import { Dish, DishIngredient, DishListItem, normalizeTags, type DishRequest } from './types.js';

@Injectable()
export class DishesService {
    private readonly logger = new Logger(DishesService.name);

    constructor(
        @InjectRepository(DishEntity)
        private dishRepository: Repository<DishEntity>,
        private ingredientsService: IngredientsService,
    ) {}

    /** All dishes sorted by name, without the recipe texts */
    public async getDishes(): Promise<DishListItem[]> {
        const rows: DishListItem[] = await this.dishRepository.query(
            `SELECT d.id, d.name, d.tags,
                    (d.recipe IS NOT NULL OR d.source_url IS NOT NULL) AS "hasRecipe",
                    COALESCE(
                        array_agg(i.name ORDER BY di.position) FILTER (WHERE i.id IS NOT NULL),
                        '{}'
                    ) AS "ingredientNames",
                    d.historical_count
                        + (SELECT count(*)::int FROM plan_days pd WHERE pd.dish_id = d.id)
                        AS "timesPlanned"
             FROM dishes d
             LEFT JOIN dish_ingredients di ON di.dish_id = d.id
             LEFT JOIN ingredients i ON i.id = di.ingredient_id
             GROUP BY d.id
             ORDER BY d.name`,
        );
        return rows.map((row) => new DishListItem(row));
    }

    public async getDish(dishId: string): Promise<Dish> {
        const dish = await this.dishRepository.findOne({
            where: { id: dishId },
            relations: { ingredients: { ingredient: true } },
            order: { ingredients: { position: 'ASC' } },
        });
        if (!dish) {
            throw ApiException.notFound(`Dish '${dishId}' was not found`);
        }
        return DishesService.toDish(dish);
    }

    public async createDish(request: DishRequest): Promise<Dish> {
        DishesService.assertUniqueIngredients(request);
        const dishId = await this.inTransaction(request, async (manager) => {
            const dish = await manager.save(
                manager.create(DishEntity, DishesService.toEntityFields(request)),
            );
            await this.saveLines(dish.id, request, manager);
            return dish.id;
        });
        this.logger.log('Dish created', { dishId });
        return this.getDish(dishId);
    }

    /** Replaces the dish, including all its ingredient lines */
    public async updateDish(dishId: string, request: DishRequest): Promise<Dish> {
        DishesService.assertUniqueIngredients(request);
        await this.inTransaction(request, async (manager) => {
            const result = await manager.update(
                DishEntity,
                dishId,
                DishesService.toEntityFields(request),
            );
            if (!result.affected) {
                throw ApiException.notFound(`Dish '${dishId}' was not found`);
            }
            await manager.delete(DishIngredientEntity, { dishId });
            await this.saveLines(dishId, request, manager);
        });
        return this.getDish(dishId);
    }

    public async deleteDish(dishId: string): Promise<void> {
        const result = await this.dishRepository.delete(dishId);
        if (!result.affected) {
            throw ApiException.notFound(`Dish '${dishId}' was not found`);
        }
        this.logger.log('Dish deleted', { dishId });
    }

    private async saveLines(
        dishId: string,
        request: DishRequest,
        manager: EntityManager,
    ): Promise<void> {
        const ingredientIds = await this.ingredientsService.findOrCreateByNames(
            request.ingredients.map((line) => line.name),
            manager,
        );
        if (request.ingredients.length === 0) return;
        await manager.insert(
            DishIngredientEntity,
            request.ingredients.map((line, index) => {
                const ingredientId = ingredientIds.get(line.name.toLowerCase());
                if (!ingredientId) {
                    throw new Error(`Ingredient '${line.name}' was not found after creating it`);
                }
                return {
                    dishId,
                    ingredientId,
                    amount: line.amount ?? null,
                    unit: line.unit ?? null,
                    position: index + 1,
                };
            }),
        );
    }

    private async inTransaction<T>(
        request: DishRequest,
        work: (manager: EntityManager) => Promise<T>,
    ): Promise<T> {
        try {
            return await this.dishRepository.manager.transaction(work);
        } catch (error) {
            if (DatabaseHelper.isUniqueViolation(error)) {
                throw ApiException.conflict(`A dish named '${request.name}' already exists`);
            }
            throw error;
        }
    }

    /** The same ingredient twice in one dish is a mistake (merging amounts is up to the user) */
    private static assertUniqueIngredients(request: DishRequest): void {
        const seen = new Set<string>();
        const fields = request.ingredients.flatMap((line, index) => {
            const key = line.name.toLowerCase();
            if (seen.has(key)) {
                return [
                    {
                        field: `ingredients.${String(index)}.name`,
                        message: `'${line.name}' is already an ingredient of this dish`,
                    },
                ];
            }
            seen.add(key);
            return [];
        });
        if (fields[0]) {
            throw ApiException.invalidRequest(fields[0].message, { fields });
        }
    }

    private static toEntityFields(request: DishRequest) {
        return {
            name: request.name,
            recipe: request.recipe ?? null,
            sourceUrl: request.sourceUrl ?? null,
            servings: request.servings ?? null,
            ...(request.tags !== undefined && { tags: normalizeTags(request.tags) }),
        };
    }

    private static toDish(dish: DishEntity): Dish {
        return new Dish({
            id: dish.id,
            name: dish.name,
            recipe: dish.recipe,
            sourceUrl: dish.sourceUrl,
            servings: dish.servings,
            tags: dish.tags,
            ingredients: dish.ingredients.map(
                (line) =>
                    new DishIngredient({
                        ingredientId: line.ingredientId,
                        name: line.ingredient.name,
                        categoryId: line.ingredient.categoryId,
                        amount: line.amount,
                        unit: line.unit,
                    }),
            ),
        });
    }
}
