<script setup lang="ts">
import { onBeforeUnmount, ref, useTemplateRef } from 'vue';
import { Button, Dialog, Message } from 'primevue';
import type { IScannerControls } from '@zxing/browser';
import { useI18n } from 'vue-i18n';
import type { StoreCardRequest } from '@/api/services/types/library';
import { Icons } from '@/types/icons';
import { SCANNED_FORMATS } from '@/utils/store-card';

defineProps<{ storeName: string }>();
const visible = defineModel<boolean>('visible', { required: true });
const emit = defineEmits<{ scanned: [card: StoreCardRequest]; typeInstead: [] }>();

const { t } = useI18n();
const video = useTemplateRef('video');
const error = ref<string | null>(null);
const unsupported = ref(false);
let controls: IScannerControls | null = null;
// Read through a function: the dialog can close while the camera starts (across the awaits)
const isOpen = () => visible.value;

/** Starts the back camera and reads codes until one of a supported type is found */
async function start() {
    error.value = null;
    unsupported.value = false;
    try {
        // Loaded only here: the scanner library is not needed anywhere else
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all(
            [import('@zxing/browser'), import('@zxing/library')],
        );
        const hints = new Map([
            [
                DecodeHintType.POSSIBLE_FORMATS,
                Object.keys(SCANNED_FORMATS).map(
                    (name) => BarcodeFormat[name as keyof typeof BarcodeFormat],
                ),
            ],
        ]);
        const reader = new BrowserMultiFormatReader(hints);
        if (!video.value || !isOpen()) return;
        controls = await reader.decodeFromConstraints(
            { video: { facingMode: 'environment' } },
            video.value,
            (result) => {
                if (!result) return;
                const format = SCANNED_FORMATS[BarcodeFormat[result.getBarcodeFormat()]];
                if (!format) {
                    unsupported.value = true;
                    return;
                }
                stop();
                visible.value = false;
                emit('scanned', { code: result.getText(), format });
            },
        );
        // Closed while the camera was starting
        if (!isOpen()) stop();
    } catch (cause) {
        error.value =
            cause instanceof DOMException && cause.name === 'NotAllowedError'
                ? t('cards.scan.denied')
                : t('cards.scan.failed');
    }
}

function stop() {
    controls?.stop();
    controls = null;
}

function typeInstead() {
    visible.value = false;
    emit('typeInstead');
}

onBeforeUnmount(stop);
</script>

<template>
    <Dialog
        v-model:visible="visible"
        :header="t('cards.scan.title', { store: storeName })"
        modal
        dismissable-mask
        :draggable="false"
        :style="{ width: 'min(30rem, 100vw)', margin: '0' }"
        @show="start"
        @hide="stop"
    >
        <div class="viewfinder">
            <video ref="video" muted playsinline />
            <div class="frame" />
        </div>
        <Message v-if="error" severity="error" variant="simple" class="message">
            {{ error }}
        </Message>
        <p v-else-if="unsupported" class="message">{{ t('cards.scan.unsupported') }}</p>
        <p v-else class="message">{{ t('cards.scan.hint') }}</p>
        <Button
            :label="t('cards.type_instead')"
            severity="secondary"
            text
            class="type-instead"
            @click="typeInstead"
        >
            <template #icon><i :class="Icons.pencil" /></template>
        </Button>
    </Dialog>
</template>

<style scoped lang="scss">
.viewfinder {
    position: relative;
    overflow: hidden;
    aspect-ratio: 4 / 3;
    border-radius: $radius-lg;
    background: var(--p-surface-950);

    video {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    // Where to hold the code
    .frame {
        position: absolute;
        inset: 20% 10%;
        border: 2px solid var(--p-surface-0);
        border-radius: $radius-lg;
        box-shadow: 0 0 0 100vmax rgb(0 0 0 / 35%);
    }
}

.message {
    margin-top: $spacing-sm-md;
    color: $text-muted-color;
    font-size: $font-size-sm;
    text-align: center;
}

.type-instead {
    width: 100%;
    margin-top: $spacing-sm;
    min-height: $touch-target;
}
</style>
