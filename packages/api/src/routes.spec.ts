import { Module } from '@nestjs/common';
import { getModulesFromRoutes } from './routes.js';

@Module({})
class ParentModule {}

@Module({})
class ChildModule {}

@Module({})
class ShorthandChildModule {}

describe('getModulesFromRoutes', () => {
    it('collects modules from nested route trees and shorthand children', () => {
        const modules = getModulesFromRoutes([
            {
                path: 'parent',
                module: ParentModule,
                children: [{ path: 'child', module: ChildModule }, ShorthandChildModule],
            },
        ]);

        expect(modules).toEqual([ParentModule, ChildModule, ShorthandChildModule]);
    });

    it('skips route trees without a module', () => {
        expect(getModulesFromRoutes([{ path: 'api', children: [] }])).toEqual([]);
    });
});
