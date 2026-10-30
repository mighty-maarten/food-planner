import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriesService } from '../categories/categories.service.js';
import { ApiException } from '../common/api-error.js';
import { assertCompleteOrder } from '../common/order.js';
import { DatabaseHelper } from '../database/database.helper.js';
import { StoreCategoryPositionEntity } from '../database/entities/store-category-position.entity.js';
import { StoreEntity } from '../database/entities/store.entity.js';
import { resolveCategoryOrder } from './category-order.js';
import { cardCodeError, Store, type StoreCardRequest, type StoreRequest } from './types.js';

@Injectable()
export class StoresService {
    private readonly logger = new Logger(StoresService.name);

    constructor(
        @InjectRepository(StoreEntity)
        private storeRepository: Repository<StoreEntity>,
        @InjectRepository(StoreCategoryPositionEntity)
        private positionRepository: Repository<StoreCategoryPositionEntity>,
        private categoriesService: CategoriesService,
    ) {}

    public async getStores(): Promise<Store[]> {
        const [stores, defaultOrder, positions] = await Promise.all([
            this.storeRepository.find({ order: { name: 'ASC' } }),
            this.getDefaultOrder(),
            this.positionRepository.find(),
        ]);
        return stores.map(
            (store) =>
                new Store(
                    store,
                    resolveCategoryOrder(
                        defaultOrder,
                        positions.filter((p) => p.storeId === store.id),
                    ),
                ),
        );
    }

    public async getStore(storeId: string): Promise<Store> {
        const store = await this.getEntity(storeId);
        const [defaultOrder, positions] = await Promise.all([
            this.getDefaultOrder(),
            this.positionRepository.findBy({ storeId }),
        ]);
        return new Store(store, resolveCategoryOrder(defaultOrder, positions));
    }

    public async createStore(request: StoreRequest): Promise<Store> {
        const store = await this.save(this.storeRepository.create({ name: request.name }));
        this.logger.log('Store created', { storeId: store.id });
        return this.getStore(store.id);
    }

    public async updateStore(storeId: string, request: StoreRequest): Promise<Store> {
        const store = await this.getEntity(storeId);
        store.name = request.name;
        await this.save(store);
        return this.getStore(storeId);
    }

    public async deleteStore(storeId: string): Promise<void> {
        const result = await this.storeRepository.delete(storeId);
        if (!result.affected) {
            throw StoresService.notFound(storeId);
        }
        this.logger.log('Store deleted', { storeId });
    }

    /** Sets the loyalty card of the store, or removes it (null) */
    public async setStoreCard(storeId: string, request: StoreCardRequest | null): Promise<Store> {
        const store = await this.getEntity(storeId);
        if (request) {
            const error = cardCodeError(request.code, request.format);
            if (error) throw ApiException.invalidRequest(error);
        }
        store.cardCode = request?.code ?? null;
        store.cardFormat = request?.format ?? null;
        await this.save(store);
        this.logger.log(request ? 'Store card set' : 'Store card removed', { storeId });
        return this.getStore(storeId);
    }

    /** Sets the route through the store */
    public async updateStoreCategoryOrder(storeId: string, categoryIds: string[]): Promise<Store> {
        await this.getEntity(storeId);
        await this.storeRepository.manager.transaction(async (manager) => {
            assertCompleteOrder(categoryIds, await this.getDefaultOrder());
            const repository = manager.getRepository(StoreCategoryPositionEntity);
            await repository.delete({ storeId });
            await repository.insert(
                categoryIds.map((categoryId, index) => ({
                    storeId,
                    categoryId,
                    position: index + 1,
                })),
            );
        });
        return this.getStore(storeId);
    }

    private async getDefaultOrder(): Promise<string[]> {
        const categories = await this.categoriesService.findAll();
        return categories.map((category) => category.id);
    }

    private async getEntity(storeId: string): Promise<StoreEntity> {
        const store = await this.storeRepository.findOneBy({ id: storeId });
        if (!store) {
            throw StoresService.notFound(storeId);
        }
        return store;
    }

    private async save(store: StoreEntity): Promise<StoreEntity> {
        try {
            return await this.storeRepository.save(store);
        } catch (error) {
            if (DatabaseHelper.isUniqueViolation(error)) {
                throw ApiException.conflict(`A store named '${store.name}' already exists`);
            }
            throw error;
        }
    }

    private static notFound(storeId: string): ApiException {
        return ApiException.notFound(`Store '${storeId}' was not found`);
    }
}
