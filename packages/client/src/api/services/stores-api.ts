import { HttpClient } from '@/api/http-client';
import type { Store, StoreRequest } from './types/library';

class ApiUrls {
    public static stores = '/stores';
}

export class StoresApi {
    public static async getStores(): Promise<Store[]> {
        return HttpClient.get<Store[]>(ApiUrls.stores);
    }

    public static async createStore(request: StoreRequest): Promise<Store> {
        return HttpClient.post<Store>(ApiUrls.stores, request);
    }

    public static async updateStore(id: string, request: StoreRequest): Promise<Store> {
        return HttpClient.put<Store>(`${ApiUrls.stores}/${id}`, request);
    }

    public static async updateStoreCategoryOrder(
        id: string,
        categoryIds: string[],
    ): Promise<Store> {
        return HttpClient.put<Store>(`${ApiUrls.stores}/${id}/category-order`, { categoryIds });
    }

    public static async deleteStore(id: string): Promise<void> {
        await HttpClient.delete(`${ApiUrls.stores}/${id}`);
    }
}
