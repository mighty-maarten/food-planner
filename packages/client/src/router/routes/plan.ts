import type { RouteRecordRaw } from 'vue-router';

// Build mode, under the "Weekmenu" tab. The current plan is `common_plan` (routes/common.ts).
const routesPlan = {
    DETAIL: 'plan_detail',
    LIST: 'plan_list',
} as const;

export type PlanRoutes = (typeof routesPlan)[keyof typeof routesPlan];

export interface PlanRouteParams {
    plan_detail: { planId: string };
    plan_list: undefined;
}

/** Children of the /weekmenu route */
export const planRoutes = [
    {
        path: 'alle',
        name: routesPlan.LIST,
        component: () => import('@/views/plan/PlansView.vue'),
        meta: { title: 'nav.plan' },
    },
    {
        path: ':planId',
        name: routesPlan.DETAIL,
        component: () => import('@/views/plan/PlanView.vue'),
        props: true,
        meta: { title: 'nav.plan' },
    },
] satisfies RouteRecordRaw[];
