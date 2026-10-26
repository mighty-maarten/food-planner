<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button, Checkbox, Dialog } from 'primevue';
import { useI18n } from 'vue-i18n';
import type { CarryOverCandidates } from '@/api/services/types/plans';
import { useSheetDialog } from '@/composables/sheet-dialog';
import { useToastMessages } from '@/composables/toast';
import { usePlansStore } from '@/stores/plans';
import { DateUtil } from '@/utils/date';
import { describeSources } from '@/utils/list';

const props = defineProps<{ planId: string; candidates: CarryOverCandidates }>();
const visible = defineModel<boolean>('visible', { required: true });

const { t } = useI18n();
const dialogProps = useSheetDialog();
const { apiErrorToast, successToast } = useToastMessages();
const plansStore = usePlansStore();

const selectedIds = ref<string[]>([]);
const range = computed(() =>
    props.candidates.plan
        ? DateUtil.formatRange(props.candidates.plan.startDate, props.candidates.plan.endDate)
        : '',
);

// Everything is selected at first: what was not bought, is usually still needed
watch(visible, (open) => {
    if (open) selectedIds.value = props.candidates.items.map((item) => item.id);
});

async function submit() {
    const count = selectedIds.value.length;
    if (await plansStore.carryOver(props.planId, selectedIds.value)) {
        visible.value = false;
        successToast(t('plan.carry_over.done', count), '');
    } else {
        apiErrorToast(plansStore.getError('update', props.planId));
    }
}
</script>

<template>
    <Dialog
        v-model:visible="visible"
        :header="t('plan.carry_over.title', { range })"
        v-bind="dialogProps"
    >
        <p class="description">{{ t('plan.carry_over.description') }}</p>
        <ul class="items">
            <li v-for="item in candidates.items" :key="item.id">
                <label class="item">
                    <Checkbox v-model="selectedIds" :value="item.id" />
                    <span class="text">
                        <span class="name">{{ item.name }}</span>
                        <span v-if="item.note || item.sources.length" class="details">
                            {{ [item.note, describeSources(item)].filter(Boolean).join(' · ') }}
                        </span>
                    </span>
                </label>
            </li>
        </ul>
        <template #footer>
            <Button
                :label="t('common.cancel')"
                severity="secondary"
                outlined
                @click="visible = false"
            />
            <Button
                :label="t('plan.carry_over.submit', selectedIds.length)"
                :disabled="selectedIds.length === 0"
                :loading="plansStore.isLoading('update', planId)"
                @click="submit"
            />
        </template>
    </Dialog>
</template>

<style scoped lang="scss">
.description {
    margin-bottom: $spacing-sm;
    color: $text-muted-color;
}

.items {
    max-height: 50dvh;
    margin: 0 (-$spacing-sm);
    padding: 0;
    overflow-y: auto;
    list-style: none;
}

.item {
    display: flex;
    align-items: center;
    gap: $spacing-sm-md;
    min-height: $touch-target + $spacing-sm;
    padding: $spacing-xs $spacing-sm;
    border-radius: $radius-lg;
    cursor: pointer;

    &:hover {
        background: $hover-color;
    }

    .text {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .name {
        font-weight: $font-weight-medium;
    }

    .details {
        color: $text-muted-color;
        font-size: $font-size-sm;
    }
}
</style>
