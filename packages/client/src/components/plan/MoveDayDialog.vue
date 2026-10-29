<script setup lang="ts">
import { computed } from 'vue';
import { Dialog } from 'primevue';
import { useI18n } from 'vue-i18n';
import type { PlanDay } from '@/api/services/types/plans';
import { useSheetDialog } from '@/composables/sheet-dialog';
import { Icons } from '@/types/icons';
import { DateUtil } from '@/utils/date';

const props = defineProps<{ days: PlanDay[]; date: string }>();
const visible = defineModel<boolean>('visible', { required: true });
/** The day to swap with (or move to, when it is empty) */
const emit = defineEmits<{ pick: [date: string] }>();

const { t } = useI18n();
const dialogProps = useSheetDialog();

const day = computed(() => props.days.find((d) => d.date === props.date));
const otherDays = computed(() => props.days.filter((d) => d.date !== props.date));

function pick(date: string) {
    visible.value = false;
    emit('pick', date);
}
</script>

<template>
    <Dialog
        v-model:visible="visible"
        :header="t('plan.move.title', { dish: day?.dish?.name ?? '' })"
        v-bind="dialogProps"
    >
        <p class="hint">{{ t('plan.move.hint') }}</p>
        <ul class="options">
            <li v-for="other in otherDays" :key="other.date">
                <button type="button" class="option" @click="pick(other.date)">
                    <span class="text">
                        <span class="day">
                            {{ DateUtil.formatWeekday(other.date) }}
                            <span class="date">{{ DateUtil.formatDayMonth(other.date) }}</span>
                        </span>
                        <span class="dish" :class="{ muted: !other.dish }">
                            {{ other.dish?.name ?? t('plan.move.empty') }}
                        </span>
                    </span>
                    <span class="action">
                        <i :class="other.dish ? Icons.move : Icons.arrowDown" />
                        {{ other.dish ? t('plan.move.swap') : t('plan.move.to') }}
                    </span>
                </button>
            </li>
        </ul>
    </Dialog>
</template>

<style scoped lang="scss">
.hint {
    margin-bottom: $spacing-sm;
    color: $text-muted-color;
    font-size: $font-size-sm;
}

.options {
    display: flex;
    flex-direction: column;
    margin: 0 (-$spacing-sm);
    padding: 0;
    list-style: none;
    max-height: 60dvh;
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

    .text {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .day {
        font-weight: $font-weight-medium;

        &::first-letter {
            text-transform: uppercase;
        }
    }

    .date {
        color: $text-muted-color;
        font-weight: $font-weight-normal;
    }

    .dish {
        font-size: $font-size-sm;
        @include ellipsis;

        &.muted {
            color: $text-muted-color;
        }
    }

    .action {
        display: inline-flex;
        align-items: center;
        gap: $spacing-xs;
        flex-shrink: 0;
        color: $primary-color;
        font-size: $font-size-sm;
        font-weight: $font-weight-medium;
    }
}
</style>
