<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button, ProgressSpinner, Tag } from 'primevue';
import { useI18n } from 'vue-i18n';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import PlanDatesDialog from '@/components/plan/PlanDatesDialog.vue';
import type { Plan } from '@/api/services/types/plans';
import { usePlansStore } from '@/stores/plans';
import { buildRoute } from '@/router/utils';
import { Icons } from '@/types/icons';
import { DateUtil } from '@/utils/date';
import { pickCurrentPlan } from '@/utils/plan';

const { t } = useI18n();
const router = useRouter();
const plansStore = usePlansStore();

const dialogVisible = ref(false);
const currentId = computed(() => pickCurrentPlan(plansStore.plans, DateUtil.today())?.id);

async function onCreated(plan: Plan) {
    await router.push(buildRoute('plan_detail', { planId: plan.id }));
}

onMounted(() => void plansStore.loadPlans());
</script>

<template>
    <main class="page">
        <PageHeader :title="t('plan.all')" :back="buildRoute('common_plan')">
            <template #actions>
                <Button
                    v-tooltip.left="t('plan.new')"
                    :icon="Icons.plus"
                    :aria-label="t('plan.new')"
                    rounded
                    size="large"
                    @click="dialogVisible = true"
                />
            </template>
        </PageHeader>

        <div v-if="!plansStore.isLoaded && plansStore.isLoading('loadPlans')" class="center">
            <ProgressSpinner />
        </div>

        <EmptyState
            v-else-if="plansStore.plans.length === 0"
            :icon="Icons.calendar"
            :title="t('plan.empty.title')"
            :description="t('plan.empty.description')"
        />

        <ul v-else class="list">
            <li v-for="plan in plansStore.plans" :key="plan.id">
                <RouterLink :to="buildRoute('plan_detail', { planId: plan.id })" class="plan">
                    <span class="text">
                        <span class="range">
                            {{ DateUtil.formatRange(plan.startDate, plan.endDate) }}
                        </span>
                        <span class="summary">
                            {{
                                t('plan.list_page.summary', {
                                    dishes: t('plan.list_page.dishes', plan.dishCount),
                                    items: t('plan.list_page.items', plan.itemCount),
                                })
                            }}
                        </span>
                    </span>
                    <Tag v-if="plan.id === currentId" :value="t('plan.list_page.current')" />
                    <i :class="Icons.chevronRight" class="chevron" />
                </RouterLink>
            </li>
        </ul>

        <PlanDatesDialog v-model:visible="dialogVisible" :plan="null" @saved="onCreated" />
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

.list {
    @include list-card;

    li {
        border-bottom: 1px solid $border-color;

        &:last-child {
            border-bottom: none;
        }
    }
}

.plan {
    @include list-row;
    border-bottom: none;
    color: $text-color;
    text-decoration: none;

    &:hover {
        background: $hover-color;
    }

    .text {
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    .range {
        font-weight: $font-weight-semibold;
    }

    .summary {
        color: $text-muted-color;
        font-size: $font-size-sm;
    }

    .chevron {
        color: $text-muted-color;
        font-size: $font-size-sm;
    }
}
</style>
