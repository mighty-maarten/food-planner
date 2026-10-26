import type { RouteLocationNamedRaw } from 'vue-router';
import type { CommonRouteParams, CommonRoutes } from './routes/common';
import type { AuthRouteParams, AuthRoutes } from './routes/auth';

export const defaultRedirectRoute = buildRoute('common_plan');

export type Routes = CommonRoutes | AuthRoutes; // |
export type RouteParams = CommonRouteParams & AuthRouteParams; // &

type IsEmptyObject<T> = keyof T extends never ? true : false;

export function buildRoute<R extends Routes>(
    route: R,
    ...params: IsEmptyObject<RouteParams[R]> extends true ? [undefined?] : [RouteParams[R]]
): RouteLocationNamedRaw {
    return { name: route, params: params[0] };
}
