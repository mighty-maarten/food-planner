<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { buildRoute, type Routes } from '@/router/utils';

const { t } = useI18n();

const nav = useTemplateRef('nav');

// On a phone not every tab fits: keep the active one in view
onMounted(() => {
    nav.value?.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
});

const tabs = computed<{ route: Routes; label: string }[]>(() => [
    { route: 'common_dishes', label: t('dishes.tabs.dishes') },
    { route: 'dishes_ingredients', label: t('dishes.tabs.ingredients') },
    { route: 'dishes_categories', label: t('dishes.tabs.categories') },
    { route: 'dishes_stores', label: t('dishes.tabs.stores') },
]);
</script>

<template>
    <nav ref="nav" class="library-tabs">
        <RouterLink
            v-for="tab in tabs"
            :key="tab.route"
            :to="buildRoute(tab.route)"
            class="tab"
            exact-active-class="active"
        >
            {{ tab.label }}
        </RouterLink>
    </nav>
</template>

<style scoped lang="scss">
.library-tabs {
    display: flex;
    gap: $spacing-sm;
    margin: 0 (-$spacing-md) $spacing-md;
    padding: 0 $spacing-md;
    overflow-x: auto;
    scrollbar-width: none;

    .tab {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
        min-height: 40px;
        padding: 0 $spacing-md;
        border: 1px solid $border-color;
        border-radius: $radius-full;
        background: $card-color;
        color: $text-color;
        font-size: $font-size-sm;
        font-weight: $font-weight-medium;
        text-decoration: none;

        &.active {
            border-color: $primary-color;
            background: $primary-color;
            color: $primary-contrast-color;
        }
    }
}
</style>
