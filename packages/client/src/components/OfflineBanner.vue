<script setup lang="ts">
import { computed } from 'vue';
import { useOnline } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { Icons } from '@/types/icons';

const { t } = useI18n();
const isOnline = useOnline();
const authStore = useAuthStore();

const isOffline = computed(() => !isOnline.value || authStore.isOfflineSession);
</script>

<template>
    <div v-if="isOffline" class="offline-banner" role="status">
        <i :class="Icons.wifiOff" />
        {{ t('common.offline') }}
    </div>
</template>

<style scoped lang="scss">
.offline-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-sm;
    padding: $spacing-xs $spacing-md;
    background: $saffron-surface-color;
    color: $on-saffron-surface-color;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
}
</style>
