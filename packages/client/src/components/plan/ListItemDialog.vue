<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button, Dialog, InputText, Select } from 'primevue';
import { useI18n } from 'vue-i18n';
import type { ListItem, Plan } from '@/api/services/types/plans';
import { useSheetDialog } from '@/composables/sheet-dialog';
import { useToastMessages } from '@/composables/toast';
import { useCatalogueStore } from '@/stores/catalogue';
import { usePlansStore } from '@/stores/plans';
import { Icons } from '@/types/icons';
import { DateUtil } from '@/utils/date';
import { describeSources } from '@/utils/list';
import { storeNames } from '@/utils/shop';

const props = defineProps<{ plan: Plan; item: ListItem | null }>();
const visible = defineModel<boolean>('visible', { required: true });

const { t } = useI18n();
const dialogProps = useSheetDialog();
const { apiErrorToast, successToast } = useToastMessages();
const plansStore = usePlansStore();
const catalogueStore = useCatalogueStore();

// Where it is bought on this list: the default stores, a store, or any store
const DEFAULT_STORE = 'default';
const ANY_STORE = 'any';
const store = ref(DEFAULT_STORE);
const storeOptions = computed(() => [
    {
        value: DEFAULT_STORE,
        label: t('plan.item.store_default', {
            stores:
                storeNames(props.item?.defaultStoreIds ?? [], catalogueStore.stores) ??
                t('plan.item.store_any').toLowerCase(),
        }),
    },
    ...catalogueStore.stores.map((s) => ({ value: s.id, label: s.name })),
    { value: ANY_STORE, label: t('plan.item.store_any') },
]);

function currentStore(item: ListItem): string {
    if (!item.storeOverride) return DEFAULT_STORE;
    return item.storeIds[0] ?? ANY_STORE;
}

const note = ref('');
// The Select treats an empty string as "nothing selected", so automatic gets its own value
const AUTOMATIC = 'auto';
const neededBy = ref(AUTOMATIC);

// The date the dishes give, shown with the "automatic" option
const automaticDate = computed(() => {
    const dates = props.item?.sources.map((source) => source.date).sort() ?? [];
    return dates[0] ?? null;
});
const options = computed(() => [
    {
        value: AUTOMATIC,
        label: automaticDate.value
            ? t('plan.item.needed_by_auto', { date: DateUtil.formatShort(automaticDate.value) })
            : t('plan.item.needed_by_auto_none'),
    },
    ...props.plan.days.map((day) => ({ value: day.date, label: DateUtil.formatShort(day.date) })),
]);
const isSaving = computed(() => plansStore.isLoading('update', props.plan.id));

watch(visible, (open) => {
    if (!open || !props.item) return;
    note.value = props.item.note ?? '';
    neededBy.value =
        props.item.neededByOverride && props.item.neededBy ? props.item.neededBy : AUTOMATIC;
    store.value = currentStore(props.item);
});

async function save() {
    if (!props.item) return;
    let saved = await plansStore.updateItem(props.plan.id, props.item.id, {
        note: note.value.trim() || null,
        neededBy: neededBy.value === AUTOMATIC ? null : neededBy.value,
    });
    if (saved && store.value !== currentStore(props.item)) {
        saved = await plansStore.setItemStore(
            props.plan.id,
            props.item.id,
            store.value !== DEFAULT_STORE,
            [DEFAULT_STORE, ANY_STORE].includes(store.value) ? null : store.value,
        );
    }
    if (saved) {
        visible.value = false;
    } else {
        apiErrorToast(plansStore.getError('update', props.plan.id));
    }
}

async function remove() {
    const item = props.item;
    if (!item) return;
    if (await plansStore.deleteItem(props.plan.id, item.id)) {
        visible.value = false;
        successToast(t('plan.item.removed'), item.name);
    } else {
        apiErrorToast(plansStore.getError('update', props.plan.id));
    }
}
</script>

<template>
    <Dialog
        v-model:visible="visible"
        :header="item?.name ?? t('plan.item.title')"
        v-bind="dialogProps"
    >
        <form v-if="item" id="list-item-form" class="form" @submit.prevent="save">
            <p v-if="item.sources.length" class="sources">
                <span class="label">{{ t('plan.item.for_dishes') }}</span>
                {{ describeSources(item) }}
            </p>
            <div class="field">
                <label for="item-note">{{ t('plan.item.note') }}</label>
                <InputText
                    id="item-note"
                    v-model="note"
                    :placeholder="t('plan.item.note_placeholder')"
                    maxlength="200"
                    fluid
                />
            </div>
            <div v-if="catalogueStore.stores.length" class="field">
                <label for="item-store">{{ t('plan.item.store') }}</label>
                <Select
                    v-model="store"
                    input-id="item-store"
                    :options="storeOptions"
                    option-label="label"
                    option-value="value"
                    fluid
                />
            </div>
            <div class="field">
                <label for="item-needed-by">{{ t('plan.item.needed_by') }}</label>
                <Select
                    v-model="neededBy"
                    input-id="item-needed-by"
                    :options="options"
                    option-label="label"
                    option-value="value"
                    fluid
                />
            </div>
        </form>
        <template #footer>
            <Button
                :icon="Icons.trash"
                :label="t('plan.item.remove')"
                severity="danger"
                text
                class="remove"
                :disabled="isSaving"
                @click="remove"
            />
            <Button
                type="submit"
                form="list-item-form"
                :label="t('common.save')"
                :loading="isSaving"
            />
        </template>
    </Dialog>
</template>

<style scoped lang="scss">
.form {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;

    :deep(.p-inputtext),
    :deep(.p-select) {
        min-height: $touch-target;
    }

    :deep(.p-select) {
        align-items: center;
    }
}

.sources {
    color: $text-muted-color;

    .label {
        display: block;
        color: $text-color;
        font-weight: $font-weight-medium;
    }
}

.field {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;

    label {
        font-weight: $font-weight-medium;
    }
}

.remove {
    margin-right: auto;
}
</style>
