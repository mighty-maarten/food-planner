<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button, Menu, ProgressSpinner, SelectButton } from 'primevue';
import type { MenuItem } from 'primevue/menuitem';
import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';
import EmptyState from '@/components/EmptyState.vue';
import TopBar from '@/components/TopBar.vue';
import { useIsPhone } from '@/composables/sheet-dialog';
import DayCard from '@/components/plan/DayCard.vue';
import DishPickerDialog from '@/components/plan/DishPickerDialog.vue';
import PlanDatesDialog from '@/components/plan/PlanDatesDialog.vue';
import ShoppingList from '@/components/plan/ShoppingList.vue';
import { getApiErrorCode } from '@/api/errors';
import type { Plan, PlanDay } from '@/api/services/types/plans';
import { useToastMessages } from '@/composables/toast';
import { usePlansStore } from '@/stores/plans';
import { buildRoute } from '@/router/utils';
import { Icons } from '@/types/icons';
import { DateUtil } from '@/utils/date';
import { pickCurrentPlan } from '@/utils/plan';

/** Without an id: the current plan */
const props = defineProps<{ planId?: string }>();

const { t } = useI18n();
// The week picker shares the top bar with the account button: a shorter range on phones
const isPhone = useIsPhone();
const route = useRoute();
const router = useRouter();
const confirm = useConfirm();
const { apiErrorToast, successToast } = useToastMessages();
const plansStore = usePlansStore();

const today = DateUtil.today();
const datesDialogVisible = ref(false);
const editingDates = ref(false);
const pickerVisible = ref(false);
const pickerDay = ref<PlanDay | null>(null);
const menu = ref<InstanceType<typeof Menu>>();

const planId = computed(() => props.planId ?? pickCurrentPlan(plansStore.plans, today)?.id ?? null);
const plan = computed(() => (planId.value ? plansStore.details.get(planId.value) : undefined));
const loadError = computed(() =>
    planId.value ? plansStore.getError('loadPlan', planId.value) : undefined,
);

// Neighbours in time (the list is newest first)
const index = computed(() => plansStore.plans.findIndex((p) => p.id === planId.value));
const olderPlan = computed(() => plansStore.plans[index.value + 1]);
const newerPlan = computed(() => (index.value > 0 ? plansStore.plans[index.value - 1] : undefined));

// The tab is kept in the URL, so it survives editing a dish and coming back
const tab = computed({
    get: () => (route.query.tab === 'lijst' ? 'list' : 'menu'),
    set: (value: string) => {
        void router.replace({
            query: { ...route.query, tab: value === 'list' ? 'lijst' : undefined },
        });
    },
});
const tabOptions = computed(() => [
    { value: 'menu', label: t('plan.tabs.menu') },
    {
        value: 'list',
        label: plan.value?.items.length
            ? `${t('plan.tabs.list')} (${String(plan.value.items.length)})`
            : t('plan.tabs.list'),
    },
]);

const menuItems = computed<MenuItem[]>(() => [
    {
        label: t('plan.edit_dates'),
        icon: Icons.calendar,
        command: () => {
            openDates(true);
        },
    },
    {
        label: t('plan.new'),
        icon: Icons.plus,
        command: () => {
            openDates(false);
        },
    },
    {
        label: t('plan.all'),
        icon: Icons.list,
        command: () => void router.push(buildRoute('plan_list')),
    },
    { separator: true },
    { label: t('plan.delete.action'), icon: Icons.trash, command: confirmDelete },
]);

watch(
    planId,
    (id) => {
        if (id) void plansStore.loadPlan(id);
    },
    { immediate: true },
);

onMounted(() => void plansStore.loadPlans());

function openDates(edit: boolean) {
    editingDates.value = edit;
    datesDialogVisible.value = true;
}

async function onSaved(saved: Plan) {
    if (saved.id !== planId.value) {
        await router.push(buildRoute('plan_detail', { planId: saved.id }));
    }
}

function chooseDish(day: PlanDay) {
    pickerDay.value = day;
    pickerVisible.value = true;
}

async function setDish(dishId: string | null) {
    const day = pickerDay.value;
    if (!day || !planId.value) return;
    if (!(await plansStore.setDayDish(planId.value, day.date, dishId))) {
        apiErrorToast(plansStore.getError('update', planId.value));
    }
}

function confirmDelete() {
    const current = plan.value;
    if (!current) return;
    const range = DateUtil.formatRange(current.startDate, current.endDate);
    confirm.require({
        header: t('plan.delete.action'),
        message: t('plan.delete.confirm', { range }),
        acceptProps: { label: t('common.delete'), severity: 'danger' },
        rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
        accept: () => void deletePlan(current.id, range),
    });
}

async function deletePlan(id: string, range: string) {
    if (await plansStore.deletePlan(id)) {
        successToast(t('plan.delete.done'), range);
        await router.replace(buildRoute('common_plan'));
    } else {
        apiErrorToast(plansStore.getError('deletePlan', id));
    }
}
</script>

<template>
    <main class="page">
        <TopBar v-if="!plan" :title="t('nav.plan')" />

        <div v-if="!plansStore.isLoaded && plansStore.isLoading('loadPlans')" class="center">
            <ProgressSpinner />
        </div>

        <EmptyState
            v-else-if="!planId && plansStore.hasError('loadPlans')"
            :icon="Icons.calendar"
            :title="t('common.error.title')"
            :description="t('common.error.load')"
        >
            <Button :label="t('common.retry')" @click="plansStore.loadPlans()" />
        </EmptyState>

        <EmptyState
            v-else-if="!planId"
            :icon="Icons.calendar"
            :title="t('plan.empty.title')"
            :description="t('plan.empty.description')"
        >
            <Button :icon="Icons.plus" :label="t('plan.new')" @click="openDates(false)" />
        </EmptyState>

        <EmptyState
            v-else-if="!plan && getApiErrorCode(loadError) === 'NOT_FOUND'"
            :icon="Icons.calendar"
            :title="t('plan.not_found')"
        >
            <Button :label="t('plan.all')" @click="router.push(buildRoute('plan_list'))" />
        </EmptyState>

        <EmptyState
            v-else-if="!plan && loadError"
            :icon="Icons.calendar"
            :title="t('common.error.title')"
            :description="t('common.error.load')"
        >
            <Button :label="t('common.retry')" @click="plansStore.loadPlan(planId)" />
        </EmptyState>

        <div v-else-if="!plan" class="center"><ProgressSpinner /></div>

        <template v-else>
            <!-- The week picker, in the app's top bar -->
            <TopBar>
                <header class="plan-header">
                    <Button
                        :icon="Icons.chevronLeft"
                        :aria-label="t('plan.previous')"
                        :disabled="!olderPlan"
                        text
                        rounded
                        severity="secondary"
                        @click="
                            olderPlan &&
                            router.push(buildRoute('plan_detail', { planId: olderPlan.id }))
                        "
                    />
                    <h2>
                        {{
                            isPhone
                                ? DateUtil.formatRangeCompact(plan.startDate, plan.endDate)
                                : DateUtil.formatRange(plan.startDate, plan.endDate)
                        }}
                    </h2>
                    <Button
                        :icon="Icons.chevronRight"
                        :aria-label="t('plan.next')"
                        :disabled="!newerPlan"
                        text
                        rounded
                        severity="secondary"
                        @click="
                            newerPlan &&
                            router.push(buildRoute('plan_detail', { planId: newerPlan.id }))
                        "
                    />
                    <Button
                        :icon="Icons.ellipsis"
                        :aria-label="t('plan.actions')"
                        text
                        rounded
                        severity="secondary"
                        @click="menu?.toggle($event)"
                    />
                    <Menu ref="menu" :model="menuItems" popup />
                </header>
            </TopBar>

            <SelectButton
                v-model="tab"
                :options="tabOptions"
                option-label="label"
                option-value="value"
                :allow-empty="false"
                class="tabs"
            />

            <div v-if="tab === 'menu'" class="days">
                <DayCard
                    v-for="day in plan.days"
                    :key="day.date"
                    :plan-id="plan.id"
                    :day="day"
                    :is-today="day.date === today"
                    @choose-dish="chooseDish(day)"
                />
            </div>
            <ShoppingList v-else :plan="plan" />

            <DishPickerDialog
                v-if="pickerDay"
                v-model:visible="pickerVisible"
                :date="pickerDay.date"
                :current-dish-id="pickerDay.dish?.id ?? null"
                @pick="setDish"
            />
        </template>

        <PlanDatesDialog
            v-model:visible="datesDialogVisible"
            :plan="editingDates && plan ? plan : null"
            @saved="onSaved"
        />
    </main>
</template>

<style scoped lang="scss">
.page {
    @include page;
}

.center {
    display: grid;
    place-items: center;
    padding: $spacing-2xl 0;
}

.plan-header {
    flex: 1;
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    min-width: 0;
    margin-left: -$spacing-sm;

    h2 {
        flex: 1;
        min-width: 0;
        font-size: $font-size-lg;
        text-align: center;
        @include ellipsis;
    }

    :deep(.p-button) {
        width: $touch-target;
        height: $touch-target;
    }
}

.tabs {
    display: flex;
    margin-bottom: $spacing-md;

    :deep(.p-togglebutton) {
        flex: 1;
        min-height: $touch-target;
    }
}

.days {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm-md;
}
</style>
