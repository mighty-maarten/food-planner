import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, Repository } from 'typeorm';
import { ApiException } from '../common/api-error.js';
import { DatabaseHelper } from '../database/database.helper.js';
import { DishIngredientEntity } from '../database/entities/dish-ingredient.entity.js';
import { IngredientEntity } from '../database/entities/ingredient.entity.js';
import { Ingredient, type IngredientRequest, type IngredientUsage } from './types.js';

@Injectable()
export class IngredientsService {
    private readonly logger = new Logger(IngredientsService.name);

    constructor(
        @InjectRepository(IngredientEntity)
        private ingredientRepository: Repository<IngredientEntity>,
        @InjectRepository(DishIngredientEntity)
        private dishIngredientRepository: Repository<DishIngredientEntity>,
    ) {}

    /** The whole catalogue (a household has a few hundred ingredients), sorted by name */
    public async getIngredients(): Promise<Ingredient[]> {
        const [ingredients, counts] = await Promise.all([
            this.ingredientRepository.find({
                relations: { stores: true },
                order: { name: 'ASC' },
            }),
            this.getDishCounts(),
        ]);
        return ingredients.map((ingredient) =>
            IngredientsService.toIngredient(ingredient, counts.get(ingredient.id) ?? 0),
        );
    }

    public async getIngredient(ingredientId: string): Promise<Ingredient> {
        const ingredient = await this.getEntity(ingredientId);
        const dishCount = await this.dishIngredientRepository.countBy({ ingredientId });
        return IngredientsService.toIngredient(ingredient, dishCount);
    }

    public async createIngredient(request: IngredientRequest): Promise<Ingredient> {
        const ingredient = await this.save(
            this.ingredientRepository.create(IngredientsService.toEntityFields(request)),
        );
        this.logger.log('Ingredient created', { ingredientId: ingredient.id });
        return this.getIngredient(ingredient.id);
    }

    public async updateIngredient(
        ingredientId: string,
        request: IngredientRequest,
    ): Promise<Ingredient> {
        const ingredient = await this.getEntity(ingredientId);
        await this.save(
            this.ingredientRepository.merge(ingredient, IngredientsService.toEntityFields(request)),
        );
        return this.getIngredient(ingredientId);
    }

    /** Only possible when no dish uses it, otherwise a CONFLICT listing those dishes */
    public async deleteIngredient(ingredientId: string): Promise<void> {
        await this.getEntity(ingredientId);
        const usages = await this.getUsages(ingredientId);
        if (usages.length > 0) {
            throw ApiException.conflict('The ingredient is still used by one or more dishes', {
                dishes: usages,
            });
        }
        await this.ingredientRepository.delete(ingredientId);
        this.logger.log('Ingredient deleted', { ingredientId });
    }

    /**
     * Looks up ingredients by name (case-insensitive) and adds the missing ones to the catalogue,
     * uncategorised. Returns the ids by lowercased name.
     */
    public async findOrCreateByNames(
        names: string[],
        manager: EntityManager,
    ): Promise<Map<string, string>> {
        if (names.length === 0) return new Map();
        await manager.query(
            `INSERT INTO ingredients (name) SELECT unnest($1::text[])
             ON CONFLICT ((lower(name))) DO NOTHING`,
            [names],
        );
        const rows: { id: string; name: string }[] = await manager.query(
            'SELECT id, name FROM ingredients WHERE lower(name) = ANY($1::text[])',
            [names.map((name) => name.toLowerCase())],
        );
        return new Map(rows.map((row) => [row.name.toLowerCase(), row.id]));
    }

    private async getUsages(ingredientId: string): Promise<IngredientUsage[]> {
        const lines = await this.dishIngredientRepository.find({
            where: { ingredientId },
            relations: { dish: true },
            order: { dish: { name: 'ASC' } },
        });
        return lines.map((line) => ({ id: line.dish.id, name: line.dish.name }));
    }

    private async getDishCounts(): Promise<Map<string, number>> {
        const rows = await this.dishIngredientRepository
            .createQueryBuilder('line')
            .select('line.ingredientId', 'ingredientId')
            .addSelect('COUNT(*)::int', 'count')
            .groupBy('line.ingredientId')
            .getRawMany<{ ingredientId: string; count: number }>();
        return new Map(rows.map((row) => [row.ingredientId, row.count]));
    }

    private async getEntity(ingredientId: string): Promise<IngredientEntity> {
        const ingredient = await this.ingredientRepository.findOne({
            where: { id: ingredientId },
            relations: { stores: true },
        });
        if (!ingredient) {
            throw ApiException.notFound(`Ingredient '${ingredientId}' was not found`);
        }
        return ingredient;
    }

    private async save(ingredient: IngredientEntity): Promise<IngredientEntity> {
        try {
            return await this.ingredientRepository.save(ingredient);
        } catch (error) {
            if (DatabaseHelper.isUniqueViolation(error)) {
                throw ApiException.conflict(
                    `An ingredient named '${ingredient.name}' already exists`,
                );
            }
            if (DatabaseHelper.isForeignKeyViolation(error)) {
                throw ApiException.invalidRequest('Unknown category or store');
            }
            throw error;
        }
    }

    private static toEntityFields(request: IngredientRequest) {
        return {
            name: request.name,
            categoryId: request.categoryId ?? null,
            stores: request.storeIds.map((id) => ({ id })),
            // Left out (e.g. by an installed app that hasn't updated yet): not changed
            ...(request.alwaysOnList !== undefined && { alwaysOnList: request.alwaysOnList }),
        };
    }

    private static toIngredient(ingredient: IngredientEntity, dishCount: number): Ingredient {
        return new Ingredient({
            id: ingredient.id,
            name: ingredient.name,
            categoryId: ingredient.categoryId,
            storeIds: ingredient.stores.map((store) => store.id),
            dishCount,
            alwaysOnList: ingredient.alwaysOnList,
        });
    }
}
