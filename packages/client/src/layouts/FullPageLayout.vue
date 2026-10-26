<script setup lang="ts">
import { ConfirmDialog, Toast } from 'primevue';
</script>

<template>
    <Toast position="top-center" />
    <ConfirmDialog />
    <div class="full-page-wrapper">
        <slot>
            <RouterView />
        </slot>
    </div>
</template>

<style scoped lang="scss">
.full-page-wrapper {
    display: flex;
    width: 100%;
    min-height: 100dvh;
}
</style>
