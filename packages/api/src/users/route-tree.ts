import { RouteTree } from '@nestjs/core';
import { UsersModule } from './users.module.js';

export const usersRouteTree: RouteTree = {
    path: 'users',
    module: UsersModule,
};
