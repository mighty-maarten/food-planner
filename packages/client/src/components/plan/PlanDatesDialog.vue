<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button, Dialog, InputText, Message } from 'primevue';
import { useI18n } from 'vue-i18n';
import { getApiErrorCode, getApiErrorDetails } from '@/api/errors';
import type { Plan, PlanRange, PlanRequest } from '@/api/services/types/plans';
import { useSheetDialog } from '@/composables/sheet-dialog';
import { useToastMessages } from '@/composables/toast';
import { usePlansStore } from '@/stores/plans';
import { DateUtil } from '@/utils/date';
import { defaultPlanDates, isValidPlanRange } from '@/utils/plan';

/** Changes the dates of `plan`, or creates a new plan when it is null */
const props = defineProps<{ plan: PlanRange | null }>();
const visible = defineModel<boolean>('visible', { required: true });
const emit = defineEmits<{ saved: [plan: Plan] }>();

const { t } = useI18n();
const dialogProps = useSheetDialog();
const { apiErrorToast, errorToast } = useToastMessages();
const plansStore = usePlansStore();

const form = ref<PlanRequest>({ startDate: '', endDate: '' });

const isValid = computed(
    () => !!form.value.startDate && !!form.value.endDate && isValidPlanRange(form.value),
);
const shrinks = computed(
    () =>
        !!props.plan &&
        (form.value.startDate > props.plan.startDate || form.value.endDate < props.plan.endDate),
);
const saving = computed(() =>
    props.plan ? plansStore.isLoading('savePlan', props.plan.id) : plansStore.isLoading('savePlan'),
);

watch(visible, (open) => {
    if (!open) return;
    form.value = props.plan
        ? { startDate: props.plan.startDate, endDate: props.plan.endDate }
        : defaultPlanDates(plansStore.plans, DateUtil.today());
});

async function save() {
    if (!isValid.value) return;
    const plan = props.plan
        ? await plansStore.updatePlan(props.plan.id, form.value)
        : await plansStore.createPlan(form.value);
    if (plan) {
        visible.value = false;
        emit('saved', plan);
        return;
    }
    const error = plansStore.getError('savePlan', props.plan?.id);
    const other = getApiErrorDetails(error)?.plan as PlanRange | undefined;
    if (getApiErrorCode(error) === 'CONFLICT' && other) {
        errorToast(
            t('common.error.title'),
            t('plan.dates.conflict', {
                range: DateUtil.formatRange(other.startDate, other.endDate),
            }),
        );
    } else {
        apiErrorToast(error);
    }
}
</script>

<template>
    <Dialog
        v-model:visible="visible"
        :header="plan ? t('plan.dates.title_edit') : t('plan.dates.title_new')"
        v-bind="dialogProps"
    >
        <form id="plan-dates-form" class="form" @submit.prevent="save">
            <div class="fields">
                <div class="field">
                    <label for="plan-start">{{ t('plan.dates.start') }}</label>
                    <InputText
                        id="plan-start"
                        v-model="form.startDate"
                        type="date"
                        required
                        fluid
                    />
                    <small v-if="form.startDate">{{
                        DateUtil.formatWeekday(form.startDate)
                    }}</small>
                </div>
                <div class="field">
                    <label for="plan-end">{{ t('plan.dates.end') }}</label>
                    <InputText
                        id="plan-end"
                        v-model="form.endDate"
                        type="date"
                        :min="form.startDate"
                        required
                        fluid
                    />
                    <small v-if="form.endDate">{{ DateUtil.formatWeekday(form.endDate) }}</small>
                </div>
            </div>
            <Message
                v-if="form.startDate && form.endDate && !isValid"
                severity="error"
                size="small"
                variant="simple"
            >
                {{ t('plan.dates.invalid') }}
            </Message>
            <Message v-else-if="shrinks" severity="warn" size="small" variant="simple">
                {{ t('plan.dates.shrink_warning') }}
            </Message>
        </form>
        <template #footer>
            <Button
                :label="t('common.cancel')"
                severity="secondary"
                outlined
                @click="visible = false"
            />
            <Button
                type="submit"
                form="plan-dates-form"
                :label="plan ? t('common.save') : t('plan.dates.create')"
                :loading="saving"
                :disabled="!isValid"
            />
        </template>
    </Dialog>
</template>

<style scoped lang="scss">
.form {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
}

.fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-md;
}

.field {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    min-width: 0;

    label {
        font-weight: $font-weight-medium;
    }

    small {
        color: $text-muted-color;
    }

    :deep(.p-inputtext) {
        min-height: $touch-target;
    }
}
</style>
