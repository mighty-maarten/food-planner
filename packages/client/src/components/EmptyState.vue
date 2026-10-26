<script setup lang="ts">
defineProps<{
    icon: string;
    title: string;
    description?: string;
}>();
</script>

<template>
    <div class="empty-state">
        <span class="icon"><i :class="icon" /></span>
        <h2>{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
        <slot />
    </div>
</template>

<style scoped lang="scss">
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-sm-md;
    padding: $spacing-2xl $spacing-lg;
    text-align: center;

    .icon {
        display: grid;
        place-items: center;
        width: 72px;
        height: 72px;
        border-radius: $radius-full;
        background: var(--p-primary-100);
        color: var(--p-primary-700);
        font-size: $font-size-xl;

        @media (prefers-color-scheme: dark) {
            background: var(--p-primary-950);
            color: var(--p-primary-300);
        }

        i {
            font-size: inherit;
        }
    }

    h2 {
        font-size: $font-size-xl;
    }

    p {
        max-width: 36ch;
        color: $text-muted-color;
    }
}
</style>
