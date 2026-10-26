import { resolveCategoryOrder } from './category-order.js';

describe('resolveCategoryOrder', () => {
    const defaultOrder = ['fruit', 'bread', 'dairy', 'frozen'];

    it('uses the default order for a store without positions', () => {
        expect(resolveCategoryOrder(defaultOrder, [])).toEqual(defaultOrder);
    });

    it('uses the store positions', () => {
        expect(
            resolveCategoryOrder(defaultOrder, [
                { categoryId: 'frozen', position: 1 },
                { categoryId: 'dairy', position: 2 },
                { categoryId: 'fruit', position: 3 },
                { categoryId: 'bread', position: 4 },
            ]),
        ).toEqual(['frozen', 'dairy', 'fruit', 'bread']);
    });

    it('puts categories without a store position last, in their default order', () => {
        expect(
            resolveCategoryOrder(defaultOrder, [
                { categoryId: 'dairy', position: 1 },
                { categoryId: 'fruit', position: 2 },
            ]),
        ).toEqual(['dairy', 'fruit', 'bread', 'frozen']);
    });

    it('ignores positions of categories that no longer exist', () => {
        expect(resolveCategoryOrder(['fruit'], [{ categoryId: 'gone', position: 1 }])).toEqual([
            'fruit',
        ]);
    });
});
