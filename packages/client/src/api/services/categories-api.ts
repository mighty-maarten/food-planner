import { HttpClient } from '@/api/http-client';
import type { Category, CategoryRequest } from './types/library';

class ApiUrls {
    public static categories = '/categories';
}

export class CategoriesApi {
    public static async getCategories(): Promise<Category[]> {
        return HttpClient.get<Category[]>(ApiUrls.categories);
    }

    public static async createCategory(request: CategoryRequest): Promise<Category> {
        return HttpClient.post<Category>(ApiUrls.categories, request);
    }

    public static async updateCategory(id: string, request: CategoryRequest): Promise<Category> {
        return HttpClient.put<Category>(`${ApiUrls.categories}/${id}`, request);
    }

    public static async reorderCategories(categoryIds: string[]): Promise<Category[]> {
        return HttpClient.put<Category[]>(`${ApiUrls.categories}/order`, { categoryIds });
    }

    public static async deleteCategory(id: string): Promise<void> {
        await HttpClient.delete(`${ApiUrls.categories}/${id}`);
    }
}
