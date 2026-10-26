<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { AutoComplete, Button, Message } from 'primevue';
import type { AutoCompleteCompleteEvent } from 'primevue/autocomplete';
import { useI18n } from 'vue-i18n';
import EmptyState from '@/components/EmptyState.vue';
import CarryOverDialog from '@/components/plan/CarryOverDialog.vue';
import ListItemDialog from '@/components/plan/ListItemDialog.vue';
import type { ListItem, Plan } from '@/api/services/types/plans';
import { useToastMessages } from '@/composables/toast';
import { useCatalogueStore } from '@/stores/catalogue';
import { usePlansStore } from '@/stores/plans';
import { Icons } from '@/types/icons';
import { DateUtil } from '@/utils/date';
import { describeSources, groupItemsByCategory } from '@/utils/list';
import { TextUtil } from '@/utils/text';

const props = defineProps<{ plan: Plan }>();

const { t } = useI18n();
const { apiErrorToast } = useToastMessages();
const plansStore = usePlansStore();
const catalogueStore = useCatalogueStore();

const newName = ref('');
const suggestions = ref<string[]>([]);
const selectedItem = ref<ListItem | null>(null);
const itemDialogVisible = ref(false);
const carryOverVisible = ref(false);

const groups = computed(() => groupItemsByCategory(props.plan.items, catalogueStore.categories));
const candidates = computed(() => plansStore.carryOverCandidates.get(props.plan.id));

function groupName(id: string | null): string {
    return (id && catalogueStore.categoryById.get(id)?.name) ?? t('plan.list.uncategorised');
}

function details(item: ListItem): string {
    if (item.checkedBy) return t('plan.list.checked_by', { name: item.checkedBy.name });
    const parts = [
        item.neededBy
            ? t('plan.list.needed_by', { date: DateUtil.formatShort(item.neededBy) })
            : null,
        item.sources.length ? describeSources(item) : t('plan.list.extra'),
    ];
    return parts.filter(Boolean).join(' · ');
}

function search(event: AutoCompleteCompleteEvent) {
    const onList = new Set(props.plan.items.map((item) => item.name.toLowerCase()));
    suggestions.value = catalogueStore.ingredients
        .filter((i) => !onList.has(i.name.toLowerCase()) && TextUtil.matches(event.query, i.name))
        .slice(0, 8)
        .map((i) => i.name);
}

async function add() {
    const name = newName.value.trim();
    if (!name) return;
    if (await plansStore.addItem(props.plan.id, { name })) {
        newName.value = '';
    } else {
        apiErrorToast(plansStore.getError('update', props.plan.id));
    }
}

function open(item: ListItem) {
    selectedItem.value = item;
    itemDialogVisible.value = true;
}

onMounted(() => {
    void catalogueStore.load();
    void plansStore.loadCarryOverCandidates(props.plan.id);
});
</script>

<template>
    <div class="shopping-list">
        <form class="add" @submit.prevent="add">
            <AutoComplete
                v-model="newName"
                :suggestions="suggestions"
                :placeholder="t('plan.list.add_placeholder')"
                :delay="0"
                :maxlength="100"
                input-id="new-list-item"
                fluid
                @complete="search"
                @option-select="add"
            />
            <Button
                type="submit"
                :icon="Icons.plus"
                :aria-label="t('common.add')"
                :disabled="!newName.trim()"
                :loading="plansStore.isLoading('update', plan.id)"
            />
        </form>

        <Message v-if="candidates?.items.length" severity="warn" class="carry-over">
            <div class="carry-over-content">
                <span>{{ t('plan.carry_over.banner', candidates.items.length) }}</span>
                <Button
                    :label="t('plan.carry_over.review')"
                    size="small"
                    severity="warn"
                    @click="carryOverVisible = true"
                />
            </div>
        </Message>

        <EmptyState
            v-if="plan.items.length === 0"
            :icon="Icons.cart"
            :title="t('plan.list.empty.title')"
            :description="t('plan.list.empty.description')"
        />

        <template v-else>
            <p class="count">{{ t('plan.list.count', plan.items.length) }}</p>
            <section v-for="group in groups" :key="group.id ?? 'none'" class="group">
                <h3>{{ groupName(group.id) }}</h3>
                <ul class="items">
                    <li v-for="item in group.items" :key="item.id">
                        <button
                            type="button"
                            class="item"
                            :class="{ checked: item.checkedAt }"
                            @click="open(item)"
                        >
                            <span class="name">
                                {{ item.name }}
                                <span v-if="item.note" class="note">{{ item.note }}</span>
                            </span>
                            <span class="details">{{ details(item) }}</span>
                        </button>
                    </li>
                </ul>
            </section>
        </template>

        <ListItemDialog v-model:visible="itemDialogVisible" :plan="plan" :item="selectedItem" />
        <CarryOverDialog
            v-if="candidates"
            v-model:visible="carryOverVisible"
            :plan-id="plan.id"
            :candidates="candidates"
        />
    </div>
</template>

<style scoped lang="scss">
.add {
    display: flex;
    gap: $spacing-sm;
    margin-bottom: $spacing-md;

    :deep(.p-autocomplete) {
        flex: 1;
        min-width: 0;
    }

    :deep(.p-inputtext),
    :deep(.p-button) {
        min-height: $touch-target;
    }

    :deep(.p-button) {
        flex-shrink: 0;
        width: $touch-target;
    }
}

.carry-over {
    margin-bottom: $spacing-md;

    .carry-over-content {
        display: flex;
        align-items: center;
        gap: $spacing-sm-md;

        span {
            flex: 1;
        }
    }
}

.count {
    margin-bottom: $spacing-sm;
    color: $text-muted-color;
    font-size: $font-size-sm;
}

.group {
    margin-bottom: $spacing-lg;

    h3 {
        margin-bottom: $spacing-sm;
        font-size: $font-size-md;
    }
}

.items {
    @include list-card;

    li {
        border-bottom: 1px solid $border-color;

        &:last-child {
            border-bottom: none;
        }
    }
}

.item {
    @include list-row;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 0;
    width: 100%;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
        background: $hover-color;
    }

    .name {
        font-weight: $font-weight-medium;
    }

    .note {
        margin-left: $spacing-xs;
        color: $text-muted-color;
        font-weight: $font-weight-normal;
    }

    .details {
        color: $text-muted-color;
        font-size: $font-size-sm;
    }

    &.checked .name {
        color: $text-muted-color;
        text-decoration: line-through;
    }
}
</style>
