import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DishIngredientEntity } from '../database/entities/dish-ingredient.entity.js';
import { IngredientEntity } from '../database/entities/ingredient.entity.js';
import { IngredientsController } from './ingredients.controller.js';
import { IngredientsService } from './ingredients.service.js';

@Module({
    imports: [TypeOrmModule.forFeature([IngredientEntity, DishIngredientEntity])],
    controllers: [IngredientsController],
    providers: [IngredientsService],
    exports: [IngredientsService],
})
export class IngredientsModule {}
