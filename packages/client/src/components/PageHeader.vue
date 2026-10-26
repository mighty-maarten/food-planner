<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Icons } from '@/types/icons';

defineProps<{
    title: string;
    /** Shows a back button to this route */
    back?: RouteLocationRaw;
}>();

const { t } = useI18n();
</script>

<template>
    <header class="page-header">
        <RouterLink v-if="back" :to="back" class="back" :aria-label="t('common.back')">
            <i :class="Icons.arrowLeft" />
        </RouterLink>
        <h2>{{ title }}</h2>
        <div v-if="$slots.actions" class="actions">
            <slot name="actions" />
        </div>
    </header>
</template>

<style scoped lang="scss">
.page-header {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    margin-bottom: $spacing-md;

    h2 {
        flex: 1;
        min-width: 0;
        font-size: $font-size-xl;
        overflow-wrap: anywhere;
    }

    .back {
        display: grid;
        place-items: center;
        flex-shrink: 0;
        width: $touch-target;
        height: $touch-target;
        margin-left: -$spacing-sm-md;
        border-radius: $radius-full;
        color: $text-color;

        &:hover {
            background: $hover-color;
        }
    }

    .actions {
        display: flex;
        gap: $spacing-xs;
        flex-shrink: 0;
    }
}
</style>
