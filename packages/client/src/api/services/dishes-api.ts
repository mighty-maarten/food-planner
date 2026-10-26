import { HttpClient } from '@/api/http-client';
import type { Dish, DishListItem, DishRequest } from './types/library';

class ApiUrls {
    public static dishes = '/dishes';
}

export class DishesApi {
    public static async getDishes(): Promise<DishListItem[]> {
        return HttpClient.get<DishListItem[]>(ApiUrls.dishes);
    }

    public static async getDish(id: string): Promise<Dish> {
        return HttpClient.get<Dish>(`${ApiUrls.dishes}/${id}`);
    }

    public static async createDish(request: DishRequest): Promise<Dish> {
        return HttpClient.post<Dish>(ApiUrls.dishes, request);
    }

    public static async updateDish(id: string, request: DishRequest): Promise<Dish> {
        return HttpClient.put<Dish>(`${ApiUrls.dishes}/${id}`, request);
    }

    public static async deleteDish(id: string): Promise<void> {
        await HttpClient.delete(`${ApiUrls.dishes}/${id}`);
    }
}
