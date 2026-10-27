import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useStoreCreationUtils } from './util';
import { useCatalogueStore } from './catalogue';
import { PlansApi } from '@/api/services/plans-api';
import type {
    CarryOverCandidates,
    ListItemRequest,
    ListItemUpdateRequest,
    Plan,
    PlanRequest,
    PlanSummary,
} from '@/api/services/types/plans';
import { ArrayUtil } from '@/utils/array';

function toSummary(plan: Plan): PlanSummary {
    return {
        id: plan.id,
        startDate: plan.startDate,
        endDate: plan.endDate,
        dishCount: plan.days.filter((day) => day.dish).length,
        itemCount: plan.items.length,
        openItemCount: plan.items.filter((item) => !item.checkedAt).length,
    };
}

export const usePlansStore = defineStore('plans', () => {
    const { base, handleAction } = useStoreCreationUtils({
        actions: ['loadPlans', 'loadPlan', 'savePlan', 'deletePlan', 'update', 'carryOver'],
    });

    /** Newest first */
    const plans = ref<PlanSummary[]>([]);
    const isLoaded = ref(false);
    const details = ref(new Map<string, Plan>());
    const carryOverCandidates = ref(new Map<string, CarryOverCandidates>());

    // Changes to one plan are sent one after the other, so quick taps (picking ingredients)
    // reach the API in order and the last response is the latest state
    const queues = new Map<string, Promise<unknown>>();
    function enqueue<T>(planId: string, work: () => Promise<T>): Promise<T> {
        const next = (queues.get(planId) ?? Promise.resolve()).then(work, work);
        queues.set(
            planId,
            next.catch(() => undefined),
        );
        return next;
    }

    function applyPlan(plan: Plan): Plan {
        details.value.set(plan.id, plan);
        const summary = toSummary(plan);
        if (plans.value.some((p) => p.id === plan.id)) {
            ArrayUtil.replaceByMut(plans.value, (p) => p.id === plan.id, summary);
        } else {
            plans.value.push(summary);
        }
        plans.value.sort((a, b) => b.startDate.localeCompare(a.startDate));
        return plan;
    }

    async function loadPlans(): Promise<void> {
        await handleAction('loadPlans', undefined, async () => {
            plans.value = await PlansApi.getPlans();
            isLoaded.value = true;
        });
    }

    async function loadPlan(planId: string): Promise<Plan | undefined> {
        return handleAction('loadPlan', planId, async () =>
            applyPlan(await PlansApi.getPlan(planId)),
        );
    }

    async function createPlan(request: PlanRequest): Promise<Plan | undefined> {
        return handleAction('savePlan', undefined, async () =>
            applyPlan(await PlansApi.createPlan(request)),
        );
    }

    async function updatePlan(planId: string, request: PlanRequest): Promise<Plan | undefined> {
        return handleAction('savePlan', planId, () =>
            enqueue(planId, async () => applyPlan(await PlansApi.updatePlan(planId, request))),
        );
    }

    async function deletePlan(planId: string): Promise<boolean> {
        const result = await handleAction('deletePlan', planId, async () => {
            await PlansApi.deletePlan(planId);
            ArrayUtil.removeByMut(plans.value, (p) => p.id === planId);
            details.value.delete(planId);
            return true;
        });
        return result ?? false;
    }

    /** Runs a change of a plan; the response replaces the plan, a failure reloads it */
    async function update(planId: string, change: () => Promise<Plan>): Promise<boolean> {
        const result = await handleAction('update', planId, () =>
            enqueue(planId, async () => applyPlan(await change())),
        );
        if (!result) await loadPlan(planId);
        return !!result;
    }

    function setDayDish(planId: string, date: string, dishId: string | null) {
        return update(planId, () => PlansApi.setDayDish(planId, date, dishId));
    }

    /** Shows the new selection immediately */
    function setDayIngredients(planId: string, date: string, ingredientIds: string[]) {
        const day = details.value.get(planId)?.days.find((d) => d.date === date);
        if (day) day.selectedIngredientIds = ingredientIds;
        return update(planId, () => PlansApi.setDayIngredients(planId, date, ingredientIds));
    }

    async function addItem(planId: string, request: ListItemRequest) {
        const added = await update(planId, () => PlansApi.addItem(planId, request));
        // A new name was added to the ingredient catalogue
        if (added) await useCatalogueStore().refreshIngredients();
        return added;
    }

    function updateItem(planId: string, itemId: string, request: ListItemUpdateRequest) {
        return update(planId, () => PlansApi.updateItem(planId, itemId, request));
    }

    /** Where an item is bought on this list (override false: the ingredient's defaults) */
    function setItemStore(
        planId: string,
        itemId: string,
        override: boolean,
        storeId: string | null,
    ) {
        return update(planId, async () => {
            await PlansApi.setItemStore(planId, itemId, { override, storeId });
            return PlansApi.getPlan(planId);
        });
    }

    function deleteItem(planId: string, itemId: string) {
        return update(planId, () => PlansApi.deleteItem(planId, itemId));
    }

    async function loadCarryOverCandidates(planId: string): Promise<void> {
        await handleAction('carryOver', planId, async () => {
            carryOverCandidates.value.set(planId, await PlansApi.getCarryOverCandidates(planId));
        });
    }

    async function carryOver(planId: string, itemIds: string[]): Promise<boolean> {
        const done = await update(planId, () => PlansApi.carryOver(planId, itemIds));
        if (done) await loadCarryOverCandidates(planId);
        return done;
    }

    return {
        ...base,
        plans,
        isLoaded,
        details,
        carryOverCandidates,
        loadPlans,
        loadPlan,
        createPlan,
        updatePlan,
        deletePlan,
        setDayDish,
        setDayIngredients,
        addItem,
        updateItem,
        setItemStore,
        deleteItem,
        loadCarryOverCandidates,
        carryOver,
    };
});
