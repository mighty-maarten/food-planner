import { ApiException } from './api-error.js';
import { assertCompleteOrder } from './order.js';

describe('assertCompleteOrder', () => {
    it('accepts every id in any order', () => {
        expect(() => {
            assertCompleteOrder(['b', 'a', 'c'], ['a', 'b', 'c']);
        }).not.toThrow();
    });

    it.each([
        ['a missing id', ['a', 'b']],
        ['an unknown id', ['a', 'b', 'x']],
        ['a duplicate instead of an id', ['a', 'b', 'b']],
    ])('rejects %s', (_case, ids) => {
        expect(() => {
            assertCompleteOrder(ids, ['a', 'b', 'c']);
        }).toThrow(ApiException);
    });
});
