import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AxiosError } from 'axios';
import { usePlansStore } from '@/stores/plans';
import { PlansApi } from '@/api/services/plans-api';
import type { Plan } from '@/api/services/types/plans';

vi.mock('@/api/services/plans-api', () => ({
    PlansApi: { getPlan: vi.fn(), setDayIngredients: vi.fn() },
}));
vi.mock('@/composables/toast', () => ({
    useToastMessages: () => ({}),
}));

const plan = (selected: string[]): Plan => ({
    id: 'plan-1',
    startDate: '2026-10-29',
    endDate: '2026-10-29',
    days: [
        {
            date: '2026-10-29',
            dish: { id: 'dish-1', name: 'Soep', ingredients: [] },
            selectedIngredientIds: selected,
        },
    ],
    items: [],
});

const deferred = <T>() => {
    let resolve: (value: T) => void = () => undefined;
    const promise = new Promise<T>((r) => {
        resolve = r;
    });
    return { promise, resolve };
};

describe('plans store', () => {
    beforeEach(async () => {
        vi.resetAllMocks();
        setActivePinia(createPinia());
        vi.mocked(PlansApi.getPlan).mockImplementation(() => Promise.resolve(plan([])));
        await usePlansStore().loadPlan('plan-1');
    });

    const selected = () => usePlansStore().details.get('plan-1')?.days[0]?.selectedIngredientIds;

    it('shows picked ingredients immediately and sends the changes in order', async () => {
        const first = deferred<Plan>();
        const second = deferred<Plan>();
        vi.mocked(PlansApi.setDayIngredients)
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise);
        const store = usePlansStore();

        const pickOnion = store.setDayIngredients('plan-1', '2026-10-29', ['onion']);
        const pickBoth = store.setDayIngredients('plan-1', '2026-10-29', ['onion', 'leek']);
        expect(selected()).toEqual(['onion', 'leek']);
        // The second request waits for the first
        await Promise.resolve();
        expect(PlansApi.setDayIngredients).toHaveBeenCalledTimes(1);

        first.resolve(plan(['onion']));
        await vi.waitFor(() => {
            expect(PlansApi.setDayIngredients).toHaveBeenCalledTimes(2);
        });
        second.resolve(plan(['onion', 'leek']));
        await Promise.all([pickOnion, pickBoth]);

        expect(selected()).toEqual(['onion', 'leek']);
        expect(store.plans[0]?.dishCount).toBe(1);
    });

    it('reloads the plan when a change fails', async () => {
        vi.mocked(PlansApi.setDayIngredients).mockRejectedValue(new AxiosError('Network Error'));
        const store = usePlansStore();

        expect(await store.setDayIngredients('plan-1', '2026-10-29', ['onion'])).toBe(false);

        expect(selected()).toEqual([]);
        expect(store.hasError('update')).toBe(true);
    });
});
