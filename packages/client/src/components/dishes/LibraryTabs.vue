<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { buildRoute, type Routes } from '@/router/utils';
import TopBar from '@/components/TopBar.vue';

const { t } = useI18n();

const nav = useTemplateRef('nav');

// On a phone not every tab fits: keep the active one in view
// (watched: the tabs mount after the page, in the top bar)
watch(nav, (element) => {
    element?.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
});

const tabs = computed<{ route: Routes; label: string }[]>(() => [
    { route: 'common_dishes', label: t('dishes.tabs.dishes') },
    { route: 'dishes_ingredients', label: t('dishes.tabs.ingredients') },
    { route: 'dishes_categories', label: t('dishes.tabs.categories') },
    { route: 'dishes_stores', label: t('dishes.tabs.stores') },
]);
</script>

<!-- In the app's top bar -->
<template>
    <TopBar>
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
    </TopBar>
</template>

<style scoped lang="scss">
.library-tabs {
    flex: 1;
    display: flex;
    gap: $spacing-sm;
    min-width: 0;
    // Scrolls to the screen edge on the left
    margin-left: -$spacing-md;
    padding: 0 $spacing-lg 0 $spacing-md;
    overflow-x: auto;
    // Fades out under the account button: there are more tabs to scroll to
    mask-image: linear-gradient(to right, #000 calc(100% - #{$spacing-lg}), transparent);
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
