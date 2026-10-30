import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useStoreCreationUtils } from './util';
import { CategoriesApi } from '@/api/services/categories-api';
import { StoresApi } from '@/api/services/stores-api';
import { IngredientsApi } from '@/api/services/ingredients-api';
import type {
    Category,
    Ingredient,
    IngredientRequest,
    Store,
    StoreCardRequest,
} from '@/api/services/types/library';
import { ArrayUtil } from '@/utils/array';
import { TextUtil } from '@/utils/text';

/**
 * The reference data of the library: categories, stores (with their route) and the ingredient
 * catalogue. Small enough to load at once, and needed together by most screens.
 */
export const useCatalogueStore = defineStore('catalogue', () => {
    const { base, handleAction } = useStoreCreationUtils({
        actions: [
            'load',
            'saveCategory',
            'deleteCategory',
            'saveStore',
            'deleteStore',
            'saveCard',
            'saveIngredient',
            'deleteIngredient',
            'reorder',
        ],
    });

    const categories = ref<Category[]>([]);
    const stores = ref<Store[]>([]);
    const ingredients = ref<Ingredient[]>([]);
    const isLoaded = ref(false);

    const categoryById = computed(() => new Map(categories.value.map((c) => [c.id, c])));
    const storeById = computed(() => new Map(stores.value.map((s) => [s.id, s])));
    const ingredientByName = computed(
        () => new Map(ingredients.value.map((i) => [i.name.toLowerCase(), i])),
    );

    function sortIngredients(): void {
        ingredients.value.sort((a, b) => TextUtil.compare(a.name, b.name));
    }

    async function loadIngredients(): Promise<void> {
        ingredients.value = await IngredientsApi.getIngredients();
    }

    async function loadStores(): Promise<void> {
        stores.value = await StoresApi.getStores();
    }

    /** Loads everything; `force` reloads data that was already loaded */
    async function load(force = false): Promise<void> {
        if (isLoaded.value && !force) return;
        await handleAction('load', undefined, async () => {
            const [loadedCategories] = await Promise.all([
                CategoriesApi.getCategories(),
                loadStores(),
                loadIngredients(),
            ]);
            categories.value = loadedCategories;
            isLoaded.value = true;
        });
    }

    // Categories

    async function createCategory(name: string): Promise<Category | undefined> {
        return handleAction('saveCategory', undefined, async () => {
            const category = await CategoriesApi.createCategory({ name });
            categories.value.push(category);
            // Stores list every category in their route
            await loadStores();
            return category;
        });
    }

    async function updateCategory(id: string, name: string): Promise<Category | undefined> {
        return handleAction('saveCategory', id, async () => {
            const category = await CategoriesApi.updateCategory(id, { name });
            ArrayUtil.replaceByMut(categories.value, (c) => c.id === id, category);
            return category;
        });
    }

    async function deleteCategory(id: string): Promise<boolean> {
        const result = await handleAction('deleteCategory', id, async () => {
            await CategoriesApi.deleteCategory(id);
            ArrayUtil.removeByMut(categories.value, (c) => c.id === id);
            // Its ingredients become uncategorised and it leaves the store routes
            await Promise.all([loadIngredients(), loadStores()]);
            return true;
        });
        return result ?? false;
    }

    /** Changes the default order, shown immediately and rolled back when saving fails */
    async function reorderCategories(categoryIds: string[]): Promise<void> {
        const previous = categories.value;
        categories.value = categoryIds.flatMap((id) => categoryById.value.get(id) ?? []);
        const result = await handleAction('reorder', undefined, async () => {
            categories.value = await CategoriesApi.reorderCategories(categoryIds);
            return true;
        });
        if (!result) categories.value = previous;
    }

    // Stores

    async function createStore(name: string): Promise<Store | undefined> {
        return handleAction('saveStore', undefined, async () => {
            const store = await StoresApi.createStore({ name });
            stores.value.push(store);
            stores.value.sort((a, b) => TextUtil.compare(a.name, b.name));
            return store;
        });
    }

    async function updateStore(id: string, name: string): Promise<Store | undefined> {
        return handleAction('saveStore', id, async () => {
            const store = await StoresApi.updateStore(id, { name });
            ArrayUtil.replaceByMut(stores.value, (s) => s.id === id, store);
            stores.value.sort((a, b) => TextUtil.compare(a.name, b.name));
            return store;
        });
    }

    async function deleteStore(id: string): Promise<boolean> {
        const result = await handleAction('deleteStore', id, async () => {
            await StoresApi.deleteStore(id);
            ArrayUtil.removeByMut(stores.value, (s) => s.id === id);
            for (const ingredient of ingredients.value) {
                ArrayUtil.removeByMut(ingredient.storeIds, (storeId) => storeId === id);
            }
            return true;
        });
        return result ?? false;
    }

    /** Sets the loyalty card of a store, or removes it (null) */
    async function setStoreCard(id: string, card: StoreCardRequest | null): Promise<boolean> {
        const result = await handleAction('saveCard', id, async () => {
            const updated = card
                ? await StoresApi.setStoreCard(id, card)
                : await StoresApi.deleteStoreCard(id);
            ArrayUtil.replaceByMut(stores.value, (s) => s.id === id, updated);
            return true;
        });
        return !!result;
    }

    /** Changes the route through a store, shown immediately and rolled back when saving fails */
    async function updateStoreCategoryOrder(id: string, categoryIds: string[]): Promise<void> {
        const store = storeById.value.get(id);
        if (!store) return;
        const previous = store.categoryIds;
        store.categoryIds = categoryIds;
        const result = await handleAction('reorder', id, async () => {
            const updated = await StoresApi.updateStoreCategoryOrder(id, categoryIds);
            ArrayUtil.replaceByMut(stores.value, (s) => s.id === id, updated);
            return true;
        });
        if (!result) store.categoryIds = previous;
    }

    // Ingredients

    async function createIngredient(request: IngredientRequest): Promise<Ingredient | undefined> {
        return handleAction('saveIngredient', undefined, async () => {
            const ingredient = await IngredientsApi.createIngredient(request);
            ingredients.value.push(ingredient);
            sortIngredients();
            return ingredient;
        });
    }

    async function updateIngredient(
        id: string,
        request: IngredientRequest,
    ): Promise<Ingredient | undefined> {
        return handleAction('saveIngredient', id, async () => {
            const ingredient = await IngredientsApi.updateIngredient(id, request);
            ArrayUtil.replaceByMut(ingredients.value, (i) => i.id === id, ingredient);
            sortIngredients();
            return ingredient;
        });
    }

    async function deleteIngredient(id: string): Promise<boolean> {
        const result = await handleAction('deleteIngredient', id, async () => {
            await IngredientsApi.deleteIngredient(id);
            ArrayUtil.removeByMut(ingredients.value, (i) => i.id === id);
            return true;
        });
        return result ?? false;
    }

    /** Refreshes the catalogue after saving a dish (new ingredients, dish counts) */
    async function refreshIngredients(): Promise<void> {
        await handleAction('load', undefined, loadIngredients);
    }

    return {
        ...base,
        categories,
        stores,
        ingredients,
        isLoaded,
        categoryById,
        storeById,
        ingredientByName,
        load,
        refreshIngredients,
        createCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        createStore,
        updateStore,
        deleteStore,
        updateStoreCategoryOrder,
        setStoreCard,
        createIngredient,
        updateIngredient,
        deleteIngredient,
    };
});
