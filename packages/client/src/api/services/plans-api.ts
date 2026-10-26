import { HttpClient } from '@/api/http-client';
import type {
    CarryOverCandidates,
    ListItemRequest,
    ListItemUpdateRequest,
    Plan,
    PlanRequest,
    PlanSummary,
} from './types/plans';

class ApiUrls {
    public static plans = '/plans';
    public static plan = (planId: string) => `${ApiUrls.plans}/${planId}`;
    public static day = (planId: string, date: string) => `${ApiUrls.plan(planId)}/days/${date}`;
    public static items = (planId: string) => `${ApiUrls.plan(planId)}/items`;
}

export class PlansApi {
    public static async getPlans(): Promise<PlanSummary[]> {
        return HttpClient.get<PlanSummary[]>(ApiUrls.plans);
    }

    public static async getPlan(planId: string): Promise<Plan> {
        return HttpClient.get<Plan>(ApiUrls.plan(planId));
    }

    public static async createPlan(request: PlanRequest): Promise<Plan> {
        return HttpClient.post<Plan>(ApiUrls.plans, request);
    }

    public static async updatePlan(planId: string, request: PlanRequest): Promise<Plan> {
        return HttpClient.put<Plan>(ApiUrls.plan(planId), request);
    }

    public static async deletePlan(planId: string): Promise<void> {
        await HttpClient.delete(ApiUrls.plan(planId));
    }

    public static async setDayDish(planId: string, date: string, dishId: string | null) {
        return HttpClient.put<Plan>(ApiUrls.day(planId, date), { dishId });
    }

    public static async setDayIngredients(planId: string, date: string, ingredientIds: string[]) {
        return HttpClient.put<Plan>(`${ApiUrls.day(planId, date)}/ingredients`, { ingredientIds });
    }

    public static async addItem(planId: string, request: ListItemRequest): Promise<Plan> {
        return HttpClient.post<Plan>(ApiUrls.items(planId), request);
    }

    public static async updateItem(
        planId: string,
        itemId: string,
        request: ListItemUpdateRequest,
    ): Promise<Plan> {
        return HttpClient.put<Plan>(`${ApiUrls.items(planId)}/${itemId}`, request);
    }

    public static async deleteItem(planId: string, itemId: string): Promise<Plan> {
        return HttpClient.delete<Plan>(`${ApiUrls.items(planId)}/${itemId}`);
    }

    public static async getCarryOverCandidates(planId: string): Promise<CarryOverCandidates> {
        return HttpClient.get<CarryOverCandidates>(`${ApiUrls.plan(planId)}/carry-over`);
    }

    public static async carryOver(planId: string, itemIds: string[]): Promise<Plan> {
        return HttpClient.post<Plan>(`${ApiUrls.plan(planId)}/carry-over`, { itemIds });
    }
}
