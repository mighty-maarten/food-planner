import type { Routes, RouteTree } from '@nestjs/core';
import type { Type } from '@nestjs/common';
import { authRouteTree } from './auth/route-tree.js';
import { categoriesRouteTree } from './categories/route-tree.js';
import { dishesRouteTree } from './dishes/route-tree.js';
import { ingredientsRouteTree } from './ingredients/route-tree.js';
import { storesRouteTree } from './stores/route-tree.js';
import { usersRouteTree } from './users/route-tree.js';

export const routes: Routes = [
    {
        path: '',
        children: [
            authRouteTree,
            usersRouteTree,
            categoriesRouteTree,
            storesRouteTree,
            ingredientsRouteTree,
            dishesRouteTree,
        ],
    },
];

// Children are either route trees or modules (shorthand for a route without its own path).
export function getModulesFromRoutes(routes: (RouteTree | Type)[]): Type[] {
    return routes.flatMap((route) => {
        if (typeof route === 'function') return [route];
        return [
            ...(route.module ? [route.module] : []),
            ...(route.children ? getModulesFromRoutes(route.children) : []),
        ];
    });
}
