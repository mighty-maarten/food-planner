<script setup lang="ts">
import { Button } from 'primevue';

defineOptions({ inheritAttrs: false });
defineProps<{ icon: string; label: string }>();
</script>

<template>
    <!--
        Floating main action, in reach of the thumb above the bottom navigation. Positioned by a
        wrapper: the ripple directive sets an inline position: relative on the button itself.
    -->
    <div class="fab">
        <Button v-bind="$attrs" :icon="icon" :label="label" rounded size="large" />
    </div>
</template>

<style scoped lang="scss">
.fab {
    position: fixed;
    right: $spacing-md;
    bottom: calc($bottom-nav-height + env(safe-area-inset-bottom) + $spacing-md);
    z-index: 2;

    @include minb($breakpoint-lg) {
        bottom: $spacing-lg;
        right: $spacing-lg;
    }

    :deep(.p-button) {
        min-height: 56px;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
    }
}
</style>
