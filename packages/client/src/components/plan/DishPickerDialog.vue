<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Dialog, IconField, InputIcon, InputText } from 'primevue';
import { useI18n } from 'vue-i18n';
import { useSheetDialog } from '@/composables/sheet-dialog';
import { useToastMessages } from '@/composables/toast';
import { useDishesStore } from '@/stores/dishes';
import { Icons } from '@/types/icons';
import { DateUtil } from '@/utils/date';
import { TextUtil } from '@/utils/text';

const props = defineProps<{ date: string; currentDishId: string | null }>();
const visible = defineModel<boolean>('visible', { required: true });
/** A dish id, or null for no cooking */
const emit = defineEmits<{ pick: [dishId: string | null] }>();

const { t } = useI18n();
const dialogProps = useSheetDialog();
const { apiErrorToast } = useToastMessages();
const dishesStore = useDishesStore();

const query = ref('');

// Favourites first (planned most, also before the app); search results by name
const matches = computed(() =>
    query.value.trim()
        ? dishesStore.dishes.filter((dish) =>
              TextUtil.matches(query.value, dish.name, ...dish.ingredientNames),
          )
        : [...dishesStore.dishes].sort(
              (a, b) => b.timesPlanned - a.timesPlanned || TextUtil.compare(a.name, b.name),
          ),
);
const canCreate = computed(() => {
    const name = query.value.trim().toLowerCase();
    return !!name && !dishesStore.dishes.some((dish) => dish.name.toLowerCase() === name);
});
const dayLabel = computed(
    () => `${DateUtil.formatWeekday(props.date)} ${DateUtil.formatDayMonth(props.date)}`,
);

watch(visible, (open) => {
    if (open) query.value = '';
});

onMounted(() => {
    if (!dishesStore.isLoaded) void dishesStore.loadDishes();
});

function pick(dishId: string | null) {
    visible.value = false;
    emit('pick', dishId);
}

/** A new dish with just a name; its ingredients can be added later */
async function create() {
    const dish = await dishesStore.saveDish(undefined, {
        name: query.value.trim(),
        ingredients: [],
    });
    if (dish) {
        pick(dish.id);
    } else {
        apiErrorToast(dishesStore.getError('saveDish'), { CONFLICT: t('dishes.form.conflict') });
    }
}
</script>

<template>
    <Dialog
        v-model:visible="visible"
        :header="t('plan.picker.title', { day: dayLabel })"
        v-bind="dialogProps"
        class="dish-picker"
    >
        <IconField>
            <InputIcon :class="Icons.search" />
            <InputText
                v-model="query"
                type="search"
                :placeholder="t('plan.picker.search')"
                :aria-label="t('plan.picker.search')"
                maxlength="200"
                fluid
                autofocus
                @keydown.enter.prevent="canCreate && matches.length === 0 ? create() : undefined"
            />
        </IconField>

        <ul class="options">
            <li v-if="canCreate">
                <button
                    type="button"
                    class="option create"
                    :disabled="dishesStore.isLoading('saveDish')"
                    @click="create"
                >
                    <i :class="Icons.plus" />
                    {{ t('plan.picker.create', { name: query.trim() }) }}
                </button>
            </li>
            <li v-if="currentDishId && !query.trim()">
                <button type="button" class="option muted" @click="pick(null)">
                    <i :class="Icons.times" />
                    {{ t('plan.picker.no_cooking') }}
                </button>
            </li>
            <li v-for="dish in matches" :key="dish.id">
                <button
                    type="button"
                    class="option"
                    :class="{ current: dish.id === currentDishId }"
                    @click="pick(dish.id)"
                >
                    <span class="text">
                        <span class="name">{{ dish.name }}</span>
                        <span v-if="dish.ingredientNames.length" class="ingredients">
                            {{ dish.ingredientNames.join(', ') }}
                        </span>
                    </span>
                    <span
                        v-if="dish.timesPlanned > 0"
                        v-tooltip.left="t('plan.picker.times_planned', dish.timesPlanned)"
                        class="count"
                    >
                        {{ dish.timesPlanned }}×
                    </span>
                    <i v-if="dish.id === currentDishId" :class="Icons.check" />
                </button>
            </li>
        </ul>
        <p v-if="dishesStore.isLoaded && dishesStore.dishes.length === 0 && !query" class="hint">
            {{ t('plan.picker.no_dishes') }}
        </p>
    </Dialog>
</template>

<style scoped lang="scss">
.options {
    display: flex;
    flex-direction: column;
    margin: $spacing-sm (-$spacing-sm) 0;
    padding: 0;
    list-style: none;
    // Scrolls inside the sheet, the search field stays in view
    max-height: 55dvh;
    overflow-y: auto;
}

.option {
    display: flex;
    align-items: center;
    gap: $spacing-sm-md;
    width: 100%;
    min-height: $touch-target + $spacing-sm;
    padding: $spacing-sm;
    border: none;
    border-radius: $radius-lg;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
        background: $hover-color;
    }

    &.create {
        color: $primary-color;
        font-weight: $font-weight-semibold;
    }

    &.muted {
        color: $text-muted-color;
    }

    &.current {
        color: $primary-color;
    }

    .text {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .name {
        font-weight: $font-weight-medium;
    }

    .ingredients {
        color: $text-muted-color;
        font-size: $font-size-sm;
        @include ellipsis;
    }

    .count {
        flex-shrink: 0;
        color: $text-muted-color;
        font-size: $font-size-sm;
        font-variant-numeric: tabular-nums;
    }
}

.hint {
    margin-top: $spacing-md;
    color: $text-muted-color;
}
</style>
