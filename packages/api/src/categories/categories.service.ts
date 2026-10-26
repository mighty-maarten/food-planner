import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiException } from '../common/api-error.js';
import { assertCompleteOrder } from '../common/order.js';
import { CategoryEntity } from '../database/entities/category.entity.js';
import { DatabaseHelper } from '../database/database.helper.js';
import { Category, type CategoryRequest } from './types.js';

@Injectable()
export class CategoriesService {
    private readonly logger = new Logger(CategoriesService.name);

    constructor(
        @InjectRepository(CategoryEntity)
        private categoryRepository: Repository<CategoryEntity>,
    ) {}

    public async getCategories(): Promise<Category[]> {
        const categories = await this.findAll();
        return categories.map((category) => new Category(category));
    }

    /** All categories in their default order */
    public findAll(): Promise<CategoryEntity[]> {
        return this.categoryRepository.find({ order: { position: 'ASC', name: 'ASC' } });
    }

    public async createCategory(request: CategoryRequest): Promise<Category> {
        // New categories go to the end of the default order
        const maxPosition = await this.categoryRepository.maximum('position');
        const category = await this.save(
            this.categoryRepository.create({
                name: request.name,
                position: (maxPosition ?? 0) + 1,
            }),
        );
        this.logger.log('Category created', { categoryId: category.id });
        return new Category(category);
    }

    public async updateCategory(categoryId: string, request: CategoryRequest): Promise<Category> {
        const category = await this.getEntity(categoryId);
        category.name = request.name;
        return new Category(await this.save(category));
    }

    /** Ingredients of the category become uncategorised */
    public async deleteCategory(categoryId: string): Promise<void> {
        const result = await this.categoryRepository.delete(categoryId);
        if (!result.affected) {
            throw CategoriesService.notFound(categoryId);
        }
        this.logger.log('Category deleted', { categoryId });
    }

    public async reorderCategories(categoryIds: string[]): Promise<Category[]> {
        await this.categoryRepository.manager.transaction(async (manager) => {
            const repository = manager.getRepository(CategoryEntity);
            const existing = await repository.find({ select: { id: true } });
            assertCompleteOrder(
                categoryIds,
                existing.map((category) => category.id),
            );
            for (const [index, id] of categoryIds.entries()) {
                await repository.update(id, { position: index + 1 });
            }
        });
        return this.getCategories();
    }

    private async getEntity(categoryId: string): Promise<CategoryEntity> {
        const category = await this.categoryRepository.findOneBy({ id: categoryId });
        if (!category) {
            throw CategoriesService.notFound(categoryId);
        }
        return category;
    }

    private async save(category: CategoryEntity): Promise<CategoryEntity> {
        try {
            return await this.categoryRepository.save(category);
        } catch (error) {
            if (DatabaseHelper.isUniqueViolation(error)) {
                throw ApiException.conflict(`A category named '${category.name}' already exists`);
            }
            throw error;
        }
    }

    private static notFound(categoryId: string): ApiException {
        return ApiException.notFound(`Category '${categoryId}' was not found`);
    }
}
