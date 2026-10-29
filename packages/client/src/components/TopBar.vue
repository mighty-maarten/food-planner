<script setup lang="ts">
defineProps<{
    /** Shown when the page puts nothing else in the top bar */
    title?: string;
}>();
</script>

<!-- What the page shows in the app's top bar, left of the account button (see DefaultLayout) -->
<template>
    <Teleport defer to="#top-bar-content">
        <slot>
            <h2 class="title">{{ title }}</h2>
        </slot>
    </Teleport>
</template>

<style scoped lang="scss">
.title {
    flex: 1;
    min-width: 0;
    font-size: $font-size-xl;
    @include ellipsis;
}
</style>
