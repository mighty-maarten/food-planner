import { RouteTree } from '@nestjs/core';
import { DishesModule } from './dishes.module.js';

export const dishesRouteTree: RouteTree = {
    path: 'dishes',
    module: DishesModule,
};
