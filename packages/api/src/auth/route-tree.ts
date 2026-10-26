import { RouteTree } from '@nestjs/core';
import { AuthModule } from './auth.module.js';

export const authRouteTree: RouteTree = {
    path: 'auth',
    module: AuthModule,
};
