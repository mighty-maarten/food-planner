import type { RouteLocationNamedRaw } from 'vue-router';
import type { CommonRouteParams, CommonRoutes } from './routes/common';
import type { AuthRouteParams, AuthRoutes } from './routes/auth';
import type { DishesRouteParams, DishesRoutes } from './routes/dishes';
import type { PlanRouteParams, PlanRoutes } from './routes/plan';

export const defaultRedirectRoute = buildRoute('common_plan');

export type Routes = CommonRoutes | AuthRoutes | DishesRoutes | PlanRoutes; // |
export type RouteParams = CommonRouteParams & AuthRouteParams & DishesRouteParams & PlanRouteParams; // &

type IsEmptyObject<T> = keyof T extends never ? true : false;

export function buildRoute<R extends Routes>(
    route: R,
    ...params: IsEmptyObject<RouteParams[R]> extends true ? [undefined?] : [RouteParams[R]]
): RouteLocationNamedRaw {
    return { name: route, params: params[0] };
}
