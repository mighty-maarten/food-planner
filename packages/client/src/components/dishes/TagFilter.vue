<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{ tags: string[] }>();
/** The chosen tag, null for all */
const selected = defineModel<string | null>({ required: true });

const { t } = useI18n();
</script>

<!-- One tag at a time; tapping the chosen tag again shows everything -->
<template>
    <div v-if="tags.length" class="tag-filter" role="group" :aria-label="t('dishes.tags.filter')">
        <button
            v-for="tag in tags"
            :key="tag"
            type="button"
            class="chip"
            :class="{ active: selected === tag }"
            :aria-pressed="selected === tag"
            @click="selected = selected === tag ? null : tag"
        >
            {{ tag }}
        </button>
    </div>
</template>

<style scoped lang="scss">
.tag-filter {
    display: flex;
    gap: $spacing-xs;
    margin: 0 (-$spacing-md);
    padding: 0 $spacing-md;
    overflow-x: auto;
    scrollbar-width: none;
}

.chip {
    flex-shrink: 0;
    min-height: 36px;
    padding: 0 $spacing-sm-md;
    border: 1px solid $border-color;
    border-radius: $radius-full;
    background: $card-color;
    color: $text-color;
    font: inherit;
    font-size: $font-size-sm;
    cursor: pointer;

    &.active {
        border-color: $primary-color;
        background: $primary-color;
        color: $primary-contrast-color;
    }
}
</style>
