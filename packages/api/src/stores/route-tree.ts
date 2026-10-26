import { RouteTree } from '@nestjs/core';
import { StoresModule } from './stores.module.js';

export const storesRouteTree: RouteTree = {
    path: 'stores',
    module: StoresModule,
};
