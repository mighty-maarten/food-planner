import type { Routes, RouteTree } from '@nestjs/core';
import type { Type } from '@nestjs/common';
import { authRouteTree } from './auth/route-tree.js';
import { usersRouteTree } from './users/route-tree.js';

export const routes: Routes = [
    {
        path: '',
        children: [authRouteTree, usersRouteTree],
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
