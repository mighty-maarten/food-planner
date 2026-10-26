import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DishEntity } from '../database/entities/dish.entity.js';
import { IngredientsModule } from '../ingredients/ingredients.module.js';
import { DishesController } from './dishes.controller.js';
import { DishesService } from './dishes.service.js';

@Module({
    imports: [TypeOrmModule.forFeature([DishEntity]), IngredientsModule],
    controllers: [DishesController],
    providers: [DishesService],
})
export class DishesModule {}
