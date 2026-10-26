import { RouteTree } from '@nestjs/core';
import { PlansModule } from './plans.module.js';

export const plansRouteTree: RouteTree = {
    path: 'plans',
    module: PlansModule,
};
