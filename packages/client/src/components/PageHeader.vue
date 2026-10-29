<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Icons } from '@/types/icons';
import TopBar from '@/components/TopBar.vue';

defineProps<{
    title: string;
    /** Shows a back button to this route */
    back?: RouteLocationRaw;
}>();

const { t } = useI18n();
</script>

<!-- Back button, title and actions, in the app's top bar -->
<template>
    <TopBar>
        <header class="page-header">
            <RouterLink v-if="back" :to="back" class="back" :aria-label="t('common.back')">
                <i :class="Icons.arrowLeft" />
            </RouterLink>
            <h2>{{ title }}</h2>
            <div v-if="$slots.actions" class="actions">
                <slot name="actions" />
            </div>
        </header>
    </TopBar>
</template>

<style scoped lang="scss">
.page-header {
    display: flex;
    align-items: center;
    flex: 1;
    gap: $spacing-sm;
    min-width: 0;

    // Long dish names: two lines at most
    h2 {
        flex: 1;
        min-width: 0;
        font-size: $font-size-lg;
        overflow-wrap: anywhere;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
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
