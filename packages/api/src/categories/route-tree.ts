import { RouteTree } from '@nestjs/core';
import { CategoriesModule } from './categories.module.js';

export const categoriesRouteTree: RouteTree = {
    path: 'categories',
    module: CategoriesModule,
};
