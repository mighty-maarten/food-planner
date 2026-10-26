import { HttpClient } from '@/api/http-client';
import type { Ingredient, IngredientRequest } from './types/library';

class ApiUrls {
    public static ingredients = '/ingredients';
}

export class IngredientsApi {
    public static async getIngredients(): Promise<Ingredient[]> {
        return HttpClient.get<Ingredient[]>(ApiUrls.ingredients);
    }

    public static async createIngredient(request: IngredientRequest): Promise<Ingredient> {
        return HttpClient.post<Ingredient>(ApiUrls.ingredients, request);
    }

    public static async updateIngredient(
        id: string,
        request: IngredientRequest,
    ): Promise<Ingredient> {
        return HttpClient.put<Ingredient>(`${ApiUrls.ingredients}/${id}`, request);
    }

    public static async deleteIngredient(id: string): Promise<void> {
        await HttpClient.delete(`${ApiUrls.ingredients}/${id}`);
    }
}
