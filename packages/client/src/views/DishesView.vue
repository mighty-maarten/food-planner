<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import EmptyState from '@/components/EmptyState.vue';
import { Icons } from '@/types/icons';

const { t } = useI18n();
</script>

<template>
    <main class="page">
        <EmptyState
            :icon="Icons.book"
            :title="t('dishes.empty.title')"
            :description="t('dishes.empty.description')"
        />
    </main>
</template>

<style scoped lang="scss">
.page {
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    padding: $spacing-md;
}
</style>
