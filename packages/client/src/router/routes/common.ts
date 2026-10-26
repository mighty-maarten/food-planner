import type { RouteRecordRaw } from 'vue-router';
import { dishesRoutes } from './dishes';
import { planRoutes } from './plan';

const routesCommon = {
    PLAN: 'common_plan',
    SHOP: 'common_shop',
    DISHES: 'common_dishes',
} as const;

export type CommonRoutes = (typeof routesCommon)[keyof typeof routesCommon];

export type CommonRouteParams = Record<CommonRoutes, undefined>;

export const commonRoutes = [
    {
        path: '/',
        redirect: { name: routesCommon.PLAN },
    },
    {
        path: '/weekmenu',
        children: [
            {
                // The current plan
                path: '',
                name: routesCommon.PLAN,
                component: () => import('@/views/plan/PlanView.vue'),
                meta: { title: 'nav.plan' },
            },
            ...planRoutes,
        ],
    },
    {
        path: '/winkelen',
        name: routesCommon.SHOP,
        component: () => import('@/views/ShopView.vue'),
        meta: { title: 'nav.shop' },
    },
    {
        // Nested, so the "Gerechten" navigation item stays active on every library page
        path: '/gerechten',
        children: [
            {
                path: '',
                name: routesCommon.DISHES,
                component: () => import('@/views/dishes/DishesView.vue'),
                meta: { title: 'nav.dishes' },
            },
            ...dishesRoutes,
        ],
    },
] satisfies RouteRecordRaw[];
