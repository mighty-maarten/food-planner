import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module.js';
import { StoreCategoryPositionEntity } from '../database/entities/store-category-position.entity.js';
import { StoreEntity } from '../database/entities/store.entity.js';
import { StoresController } from './stores.controller.js';
import { StoresService } from './stores.service.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([StoreEntity, StoreCategoryPositionEntity]),
        CategoriesModule,
    ],
    controllers: [StoresController],
    providers: [StoresService],
})
export class StoresModule {}
