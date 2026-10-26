import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useStoreCreationUtils } from './util';
import { useCatalogueStore } from './catalogue';
import { DishesApi } from '@/api/services/dishes-api';
import type { Dish, DishListItem, DishRequest } from '@/api/services/types/library';
import { ArrayUtil } from '@/utils/array';
import { TextUtil } from '@/utils/text';

function toListItem(dish: Dish): DishListItem {
    return {
        id: dish.id,
        name: dish.name,
        ingredientNames: dish.ingredients.map((line) => line.name),
        hasRecipe: !!dish.recipe || !!dish.sourceUrl,
    };
}

export const useDishesStore = defineStore('dishes', () => {
    const { base, handleAction } = useStoreCreationUtils({
        actions: ['loadDishes', 'loadDish', 'saveDish', 'deleteDish'],
    });

    const dishes = ref<DishListItem[]>([]);
    const isLoaded = ref(false);
    /** Dishes opened in this session, by id */
    const details = ref(new Map<string, Dish>());

    function upsertListItem(dish: Dish): void {
        const item = toListItem(dish);
        if (dishes.value.some((d) => d.id === dish.id)) {
            ArrayUtil.replaceByMut(dishes.value, (d) => d.id === dish.id, item);
        } else {
            dishes.value.push(item);
        }
        dishes.value.sort((a, b) => TextUtil.compare(a.name, b.name));
    }

    async function loadDishes(): Promise<void> {
        await handleAction('loadDishes', undefined, async () => {
            dishes.value = await DishesApi.getDishes();
            isLoaded.value = true;
        });
    }

    async function loadDish(id: string): Promise<Dish | undefined> {
        return handleAction('loadDish', id, async () => {
            const dish = await DishesApi.getDish(id);
            details.value.set(id, dish);
            return dish;
        });
    }

    /** Creates (without id) or replaces a dish */
    async function saveDish(
        id: string | undefined,
        request: DishRequest,
    ): Promise<Dish | undefined> {
        const dish = await handleAction('saveDish', undefined, async () => {
            const saved = id
                ? await DishesApi.updateDish(id, request)
                : await DishesApi.createDish(request);
            details.value.set(saved.id, saved);
            upsertListItem(saved);
            return saved;
        });
        // New ingredient names were added to the catalogue
        if (dish) await useCatalogueStore().refreshIngredients();
        return dish;
    }

    async function deleteDish(id: string): Promise<boolean> {
        const result = await handleAction('deleteDish', id, async () => {
            await DishesApi.deleteDish(id);
            ArrayUtil.removeByMut(dishes.value, (d) => d.id === id);
            details.value.delete(id);
            return true;
        });
        if (result) await useCatalogueStore().refreshIngredients();
        return result ?? false;
    }

    return {
        ...base,
        dishes,
        isLoaded,
        details,
        loadDishes,
        loadDish,
        saveDish,
        deleteDish,
    };
});
