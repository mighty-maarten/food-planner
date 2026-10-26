import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AxiosError } from 'axios';
import { useCatalogueStore } from '@/stores/catalogue';
import { CategoriesApi } from '@/api/services/categories-api';
import { StoresApi } from '@/api/services/stores-api';
import { IngredientsApi } from '@/api/services/ingredients-api';

vi.mock('@/api/services/categories-api', () => ({
    CategoriesApi: { getCategories: vi.fn(), reorderCategories: vi.fn(), deleteCategory: vi.fn() },
}));
vi.mock('@/api/services/stores-api', () => ({
    StoresApi: { getStores: vi.fn(), updateStoreCategoryOrder: vi.fn(), deleteStore: vi.fn() },
}));
vi.mock('@/api/services/ingredients-api', () => ({
    IngredientsApi: { getIngredients: vi.fn() },
}));
vi.mock('@/composables/toast', () => ({
    useToastMessages: () => ({}),
}));

const categories = [
    { id: 'fruit', name: 'Groenten & fruit', position: 1 },
    { id: 'dairy', name: 'Zuivel', position: 2 },
];
const store = { id: 'store-1', name: 'Colruyt', categoryIds: ['fruit', 'dairy'] };
const yoghurt = {
    id: 'yoghurt',
    name: 'Yoghurt',
    categoryId: 'dairy',
    storeIds: ['store-1'],
    dishCount: 0,
};

describe('catalogue store', () => {
    beforeEach(async () => {
        vi.resetAllMocks();
        setActivePinia(createPinia());
        vi.mocked(CategoriesApi.getCategories).mockResolvedValue(structuredClone(categories));
        vi.mocked(StoresApi.getStores).mockResolvedValue([structuredClone(store)]);
        vi.mocked(IngredientsApi.getIngredients).mockResolvedValue([structuredClone(yoghurt)]);
        await useCatalogueStore().load();
    });

    it('loads categories, stores and ingredients once', async () => {
        const catalogue = useCatalogueStore();
        await catalogue.load();

        expect(catalogue.isLoaded).toBe(true);
        expect(catalogue.ingredientByName.get('yoghurt')?.id).toBe('yoghurt');
        expect(CategoriesApi.getCategories).toHaveBeenCalledTimes(1);
    });

    it('rolls back the category order when saving fails', async () => {
        vi.mocked(CategoriesApi.reorderCategories).mockRejectedValue(
            new AxiosError('Network Error'),
        );
        const catalogue = useCatalogueStore();

        await catalogue.reorderCategories(['dairy', 'fruit']);

        expect(catalogue.categories.map((c) => c.id)).toEqual(['fruit', 'dairy']);
        expect(catalogue.hasError('reorder')).toBe(true);
    });

    it('shows a new store route immediately', async () => {
        let resolve: (value: typeof store) => void = () => undefined;
        vi.mocked(StoresApi.updateStoreCategoryOrder).mockReturnValue(
            new Promise((r) => {
                resolve = r;
            }),
        );
        const catalogue = useCatalogueStore();

        const saving = catalogue.updateStoreCategoryOrder('store-1', ['dairy', 'fruit']);
        expect(catalogue.storeById.get('store-1')?.categoryIds).toEqual(['dairy', 'fruit']);
        resolve({ ...store, categoryIds: ['dairy', 'fruit'] });
        await saving;

        expect(catalogue.storeById.get('store-1')?.categoryIds).toEqual(['dairy', 'fruit']);
    });

    it('removes a deleted store from the ingredients', async () => {
        const catalogue = useCatalogueStore();

        expect(await catalogue.deleteStore('store-1')).toBe(true);

        expect(catalogue.stores).toEqual([]);
        expect(catalogue.ingredients[0]?.storeIds).toEqual([]);
    });
});
