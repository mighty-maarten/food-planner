<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Dialog } from 'primevue';
import { useI18n } from 'vue-i18n';
import StoreCardCode from '@/components/StoreCardCode.vue';
import type { Store } from '@/api/services/types/library';

const props = defineProps<{
    /** Stores with a card */
    stores: Store[];
    /** Shown first when it has a card: the store being shopped */
    preferredStoreId: string | null;
}>();
const visible = defineModel<boolean>('visible', { required: true });

const { t } = useI18n();
const selectedId = ref<string | null>(null);

const selected = computed(
    () => props.stores.find((store) => store.id === selectedId.value) ?? props.stores[0],
);

watch(visible, (open) => {
    if (open) selectedId.value = props.preferredStoreId;
});
</script>

<template>
    <Dialog
        v-model:visible="visible"
        :header="selected?.name ?? t('cards.title')"
        modal
        dismissable-mask
        :draggable="false"
        :style="{ width: 'min(30rem, 100vw)', margin: '0' }"
    >
        <div v-if="stores.length > 1" class="stores" role="group" :aria-label="t('cards.choose')">
            <button
                v-for="store in stores"
                :key="store.id"
                type="button"
                class="chip"
                :class="{ active: store.id === selected?.id }"
                :aria-pressed="store.id === selected?.id"
                @click="selectedId = store.id"
            >
                {{ store.name }}
            </button>
        </div>
        <StoreCardCode v-if="selected?.card" :card="selected.card" />
        <p class="hint">{{ t('cards.brightness_hint') }}</p>
    </Dialog>
</template>

<style scoped lang="scss">
.stores {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
    margin-bottom: $spacing-md;
}

.chip {
    min-height: 40px;
    padding: 0 $spacing-md;
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

.hint {
    margin-top: $spacing-sm-md;
    color: $text-muted-color;
    font-size: $font-size-sm;
    text-align: center;
}
</style>
