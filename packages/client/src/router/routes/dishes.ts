import type { RouteRecordRaw } from 'vue-router';

// The library, under the "Gerechten" tab. The list route is `common_dishes` (routes/common.ts).
const routesDishes = {
    NEW: 'dishes_new',
    DETAIL: 'dishes_detail',
    EDIT: 'dishes_edit',
    INGREDIENTS: 'dishes_ingredients',
    CATEGORIES: 'dishes_categories',
    STORES: 'dishes_stores',
    STORE: 'dishes_store',
} as const;

export type DishesRoutes = (typeof routesDishes)[keyof typeof routesDishes];

export interface DishesRouteParams {
    dishes_new: undefined;
    dishes_detail: { dishId: string };
    dishes_edit: { dishId: string };
    dishes_ingredients: undefined;
    dishes_categories: undefined;
    dishes_stores: undefined;
    dishes_store: { storeId: string };
}

/**
 * Children of the /gerechten route. The titles are for the browser tab; the pages fill the top
 * bar themselves (library tabs or a PageHeader).
 */
export const dishesRoutes = [
    {
        path: 'nieuw',
        name: routesDishes.NEW,
        component: () => import('@/views/dishes/DishFormView.vue'),
        meta: { title: 'nav.dishes' },
    },
    {
        path: 'ingredienten',
        name: routesDishes.INGREDIENTS,
        component: () => import('@/views/dishes/IngredientsView.vue'),
        meta: { title: 'dishes.tabs.ingredients' },
    },
    {
        path: 'categorieen',
        name: routesDishes.CATEGORIES,
        component: () => import('@/views/dishes/CategoriesView.vue'),
        meta: { title: 'dishes.tabs.categories' },
    },
    {
        path: 'winkels',
        name: routesDishes.STORES,
        component: () => import('@/views/dishes/StoresView.vue'),
        meta: { title: 'dishes.tabs.stores' },
    },
    {
        path: 'winkels/:storeId',
        name: routesDishes.STORE,
        component: () => import('@/views/dishes/StoreView.vue'),
        props: true,
        meta: { title: 'dishes.tabs.stores' },
    },
    {
        path: ':dishId',
        name: routesDishes.DETAIL,
        component: () => import('@/views/dishes/DishDetailView.vue'),
        props: true,
        meta: { title: 'nav.dishes' },
    },
    {
        path: ':dishId/bewerken',
        name: routesDishes.EDIT,
        component: () => import('@/views/dishes/DishFormView.vue'),
        props: true,
        meta: { title: 'nav.dishes' },
    },
] satisfies RouteRecordRaw[];
