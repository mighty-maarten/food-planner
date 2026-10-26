<script setup lang="ts">
import { Button } from 'primevue';
import { useI18n } from 'vue-i18n';
import { Icons } from '@/types/icons';

const props = defineProps<{
    items: { id: string; label: string; description?: string }[];
    disabled?: boolean;
}>();

const emit = defineEmits<{
    /** The new order of all ids */
    reorder: [ids: string[]];
    select: [id: string];
}>();

const { t } = useI18n();

// Up and down buttons instead of drag and drop: reliable with one thumb on a phone
function move(index: number, offset: -1 | 1) {
    const ids = props.items.map((item) => item.id);
    const target = index + offset;
    const moved = ids[index];
    const other = ids[target];
    if (moved === undefined || other === undefined) return;
    ids[index] = other;
    ids[target] = moved;
    emit('reorder', ids);
}
</script>

<template>
    <TransitionGroup tag="ul" name="reorder" class="reorder-list">
        <li v-for="(item, index) in items" :key="item.id" class="row">
            <button type="button" class="label" @click="emit('select', item.id)">
                <span class="name">{{ item.label }}</span>
                <span v-if="item.description" class="description">{{ item.description }}</span>
            </button>
            <Button
                :icon="Icons.arrowUp"
                :aria-label="`${t('common.move_up')}: ${item.label}`"
                :disabled="disabled || index === 0"
                text
                rounded
                severity="secondary"
                class="move"
                @click="move(index, -1)"
            />
            <Button
                :icon="Icons.arrowDown"
                :aria-label="`${t('common.move_down')}: ${item.label}`"
                :disabled="disabled || index === items.length - 1"
                text
                rounded
                severity="secondary"
                class="move"
                @click="move(index, 1)"
            />
        </li>
    </TransitionGroup>
</template>

<style scoped lang="scss">
.reorder-list {
    @include list-card;
    position: relative;
}

.row {
    @include list-row;
    gap: 0;
    padding: 0 $spacing-xs 0 0;
    background: $card-color;

    .label {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        min-width: 0;
        min-height: $touch-target + $spacing-sm;
        padding: $spacing-sm $spacing-md;
        border: none;
        background: none;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;

        &:hover {
            background: $hover-color;
        }
    }

    .name {
        font-weight: $font-weight-medium;
        overflow-wrap: anywhere;
    }

    .description {
        color: $text-muted-color;
        font-size: $font-size-sm;
    }

    .move {
        flex-shrink: 0;
        width: $touch-target;
        height: $touch-target;
    }
}

.reorder-move {
    transition: transform 0.2s ease;
}
</style>
