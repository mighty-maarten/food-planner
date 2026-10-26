import { RouteTree } from '@nestjs/core';
import { IngredientsModule } from './ingredients.module.js';

export const ingredientsRouteTree: RouteTree = {
    path: 'ingredients',
    module: IngredientsModule,
};
