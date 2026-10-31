<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue';
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
const track = useTemplateRef('track');
const index = ref(0);

const current = computed(() => props.stores[index.value] ?? props.stores[0]);

/** Jumps to a card without the swipe animation when the page opens */
function scrollTo(target: number, behavior: ScrollBehavior = 'smooth') {
    const element = track.value;
    if (!element) return;
    element.scrollTo({ left: target * element.clientWidth, behavior });
}

async function onShow() {
    const preferred = props.stores.findIndex((store) => store.id === props.preferredStoreId);
    index.value = Math.max(preferred, 0);
    await nextTick();
    scrollTo(index.value, 'instant');
}

// Follows the swipe: the card that fills most of the screen is the current one
function onScroll() {
    const element = track.value;
    if (!element?.clientWidth) return;
    index.value = Math.round(element.scrollLeft / element.clientWidth);
}
</script>

<!-- The loyalty cards, full screen: swipe sideways to the next store -->
<template>
    <Dialog
        v-model:visible="visible"
        :header="current?.name ?? t('cards.title')"
        modal
        :draggable="false"
        :style="{
            width: '100vw',
            height: '100dvh',
            maxHeight: '100dvh',
            margin: '0',
            border: 'none',
            borderRadius: '0',
        }"
        :content-style="{ display: 'flex', flexDirection: 'column', padding: '0' }"
        @show="onShow"
    >
        <div
            ref="track"
            class="track"
            tabindex="0"
            role="group"
            :aria-roledescription="t('cards.pager')"
            :aria-label="t('cards.title')"
            @scroll.passive="onScroll"
        >
            <section
                v-for="(store, i) in stores"
                :key="store.id"
                class="slide"
                :aria-label="store.name"
                :aria-hidden="i !== index"
            >
                <StoreCardCode v-if="store.card" :card="store.card" class="code" />
            </section>
        </div>
        <div v-if="stores.length > 1" class="dots" role="group" :aria-label="t('cards.choose')">
            <button
                v-for="(store, i) in stores"
                :key="store.id"
                type="button"
                class="dot"
                :class="{ active: i === index }"
                :aria-label="store.name"
                :aria-current="i === index"
                @click="scrollTo(i)"
            >
                <span />
            </button>
        </div>
        <p class="hint">{{ t('cards.brightness_hint') }}</p>
    </Dialog>
</template>

<style scoped lang="scss">
.track {
    flex: 1;
    display: flex;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;

    &::-webkit-scrollbar {
        display: none;
    }

    &:focus-visible {
        outline: 2px solid $primary-color;
        outline-offset: -2px;
    }
}

.slide {
    flex: 0 0 100%;
    display: grid;
    place-items: center;
    padding: $spacing-md;
    scroll-snap-align: center;
    scroll-snap-stop: always;
}

.code {
    width: 100%;
    max-width: 30rem;
}

.dots {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
}

// A small dot in a full-size touch target
.dot {
    display: grid;
    place-items: center;
    width: $touch-target;
    height: $touch-target;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;

    span {
        width: 10px;
        height: 10px;
        border-radius: $radius-full;
        background: $border-color;
        transition: background-color 0.2s;
    }

    &.active span {
        background: $primary-color;
    }
}

.hint {
    padding: $spacing-sm $spacing-md calc($spacing-md + env(safe-area-inset-bottom));
    color: $text-muted-color;
    font-size: $font-size-sm;
    text-align: center;
}
</style>
