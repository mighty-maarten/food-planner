<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Menu } from 'primevue';
import type { MenuItem } from 'primevue/menuitem';
import { useI18n } from 'vue-i18n';
import type { PlanDay } from '@/api/services/types/plans';
import { useToastMessages } from '@/composables/toast';
import { usePlansStore } from '@/stores/plans';
import { buildRoute } from '@/router/utils';
import { Icons } from '@/types/icons';
import { formatAmount } from '@/utils/amount';
import { DateUtil } from '@/utils/date';

const props = defineProps<{ planId: string; day: PlanDay; isToday: boolean }>();
const emit = defineEmits<{ chooseDish: []; move: [] }>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { apiErrorToast } = useToastMessages();
const plansStore = usePlansStore();

const selected = computed(() => new Set(props.day.selectedIngredientIds));
// Back to this plan (and tab) after editing the dish
const editDishRoute = computed(() =>
    props.day.dish
        ? {
              ...buildRoute('dishes_edit', { dishId: props.day.dish.id }),
              query: { terug: route.fullPath },
          }
        : undefined,
);

const menu = ref<InstanceType<typeof Menu>>();
const menuItems = computed<MenuItem[]>(() => {
    const dish = props.day.dish;
    if (!dish) return [];
    return [
        {
            label: t('plan.day.change_dish'),
            icon: Icons.pencil,
            command: () => {
                emit('chooseDish');
            },
        },
        {
            label: t('plan.day.move'),
            icon: Icons.move,
            command: () => {
                emit('move');
            },
        },
        {
            label: t('plan.day.open_dish'),
            icon: Icons.book,
            command: () => void router.push(buildRoute('dishes_detail', { dishId: dish.id })),
        },
        { separator: true },
        {
            label: t('plan.day.clear_dish'),
            icon: Icons.trash,
            command: () => void clearDish(),
        },
    ];
});

/** Back to an empty day; the ingredients picked for it leave the list */
async function clearDish() {
    if (!(await plansStore.setDayDish(props.planId, props.day.date, null))) {
        apiErrorToast(plansStore.getError('update', props.planId));
    }
}

async function setSelection(ingredientIds: string[]) {
    if (!(await plansStore.setDayIngredients(props.planId, props.day.date, ingredientIds))) {
        apiErrorToast(plansStore.getError('update', props.planId));
    }
}

function toggle(ingredientId: string) {
    const next = selected.value.has(ingredientId)
        ? props.day.selectedIngredientIds.filter((id) => id !== ingredientId)
        : [...props.day.selectedIngredientIds, ingredientId];
    void setSelection(next);
}
</script>

<template>
    <article class="day-card" :class="{ today: isToday, empty: !day.dish }">
        <header>
            <h3>
                <span class="weekday">{{ DateUtil.formatWeekday(day.date) }}</span>
                <span class="date">{{ DateUtil.formatDayMonth(day.date) }}</span>
            </h3>
            <span v-if="isToday" class="today-badge">{{ t('plan.today') }}</span>
            <template v-if="day.dish">
                <button
                    type="button"
                    class="more"
                    :aria-label="t('plan.day.actions', { name: day.dish.name })"
                    aria-haspopup="true"
                    @click="menu?.toggle($event)"
                >
                    <i :class="Icons.ellipsis" />
                </button>
                <Menu ref="menu" :model="menuItems" popup />
            </template>
        </header>

        <button v-if="!day.dish" type="button" class="choose" @click="emit('chooseDish')">
            <i :class="Icons.plus" />
            {{ t('plan.day.choose_dish') }}
        </button>

        <template v-else>
            <h4 class="dish-name">{{ day.dish.name }}</h4>

            <p v-if="day.dish.ingredients.length === 0" class="no-ingredients">
                {{ t('plan.day.no_ingredients') }}
                <RouterLink v-if="editDishRoute" :to="editDishRoute">
                    {{ t('plan.day.add_ingredients') }}
                </RouterLink>
            </p>

            <template v-else>
                <ul class="ingredients">
                    <li v-for="line in day.dish.ingredients" :key="line.ingredientId">
                        <button
                            type="button"
                            class="chip"
                            :class="{ selected: selected.has(line.ingredientId) }"
                            :aria-pressed="selected.has(line.ingredientId)"
                            @click="toggle(line.ingredientId)"
                        >
                            <i :class="selected.has(line.ingredientId) ? Icons.cart : Icons.plus" />
                            <span>{{ line.name }}</span>
                            <span v-if="line.amount !== null || line.unit" class="amount">
                                {{ formatAmount(line.amount, line.unit) }}
                            </span>
                        </button>
                    </li>
                </ul>
            </template>
        </template>
    </article>
</template>

<style scoped lang="scss">
.day-card {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm-md;
    padding: $spacing-md;
    background: $card-color;
    border: 1px solid $border-color;
    border-radius: $radius-xl;

    &.today {
        border-color: $primary-color;
        box-shadow: 0 0 0 1px $primary-color;
    }

    &.empty {
        gap: $spacing-sm;
    }
}

header {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    h3 {
        flex: 1;
        display: flex;
        align-items: baseline;
        gap: $spacing-sm;
        font-family: inherit;
        font-size: $font-size-base;
    }

    .weekday {
        text-transform: capitalize;
    }

    .date {
        color: $text-muted-color;
        font-weight: $font-weight-normal;
    }

    // Top right, without making the header taller
    .more {
        display: grid;
        place-items: center;
        flex-shrink: 0;
        width: $touch-target;
        height: $touch-target;
        margin: (-$spacing-sm-md) (-$spacing-sm-md) (-$spacing-sm-md) 0;
        padding: 0;
        border: none;
        border-radius: $radius-full;
        background: none;
        color: $text-muted-color;
        cursor: pointer;

        &:hover {
            background: $hover-color;
        }
    }

    .today-badge {
        padding: $spacing-xxs $spacing-sm;
        border-radius: $radius-full;
        background: $primary-color;
        color: $primary-contrast-color;
        font-size: $font-size-xs;
        font-weight: $font-weight-semibold;
    }
}

.choose {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-sm;
    min-height: $touch-target;
    border: 1px dashed $border-color;
    border-radius: $radius-lg;
    background: none;
    color: $text-muted-color;
    font: inherit;
    cursor: pointer;

    &:hover {
        background: $hover-color;
        color: $text-color;
    }
}

.dish-name {
    font-family: $font-family-heading;
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    overflow-wrap: anywhere;
}

.no-ingredients {
    color: $text-muted-color;
    font-size: $font-size-sm;

    a {
        color: $primary-color;
        font-weight: $font-weight-medium;
    }
}

.ingredients {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;
    padding: 0;
    list-style: none;
}

.chip {
    display: inline-flex;
    align-items: center;
    gap: $spacing-sm;
    min-height: $touch-target;
    padding: 0 $spacing-md;
    border: 1px solid $border-color;
    border-radius: $radius-full;
    background: $background-color;
    color: $text-color;
    font: inherit;
    cursor: pointer;

    i {
        color: $text-muted-color;
        font-size: $font-size-sm;
    }

    .amount {
        color: $text-muted-color;
        font-size: $font-size-sm;
    }

    &.selected {
        border-color: $primary-color;
        background: $primary-color;
        color: $primary-contrast-color;

        i,
        .amount {
            color: inherit;
        }
    }
}
</style>
