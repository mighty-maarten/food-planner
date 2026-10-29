import { normalizeTags } from './types.js';

describe('normalizeTags', () => {
    it('lowercases, trims, removes duplicates and empty tags, and sorts', () => {
        expect(normalizeTags([' Pasta', 'vis', 'pasta ', '', 'Ovenschotel'])).toEqual([
            'ovenschotel',
            'pasta',
            'vis',
        ]);
    });
});
