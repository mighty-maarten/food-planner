<script setup lang="ts">
import { computed, ref } from 'vue';
import { Button, InputText, Message, Select } from 'primevue';
import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';
import CardScannerDialog from '@/components/CardScannerDialog.vue';
import StoreCardCode from '@/components/StoreCardCode.vue';
import type { Store, StoreCardFormat, StoreCardRequest } from '@/api/services/types/library';
import { useToastMessages } from '@/composables/toast';
import { useCatalogueStore } from '@/stores/catalogue';
import { Icons } from '@/types/icons';
import { CARD_FORMATS, isValidCardCode } from '@/utils/store-card';

const props = defineProps<{ store: Store }>();

const { t } = useI18n();
const confirm = useConfirm();
const { apiErrorToast, successToast } = useToastMessages();
const catalogueStore = useCatalogueStore();

const scannerVisible = ref(false);
const typing = ref(false);
const code = ref('');
const format = ref<StoreCardFormat>('ean13');
const submitted = ref(false);

const formatOptions = computed(() =>
    CARD_FORMATS.map((value) => ({ value, label: t(`cards.formats.${value}`) })),
);
const codeError = computed(() => submitted.value && !isValidCardCode(code.value, format.value));
const saving = computed(() => catalogueStore.isLoading('saveCard', props.store.id));

async function save(card: StoreCardRequest | null) {
    if (await catalogueStore.setStoreCard(props.store.id, card)) {
        successToast(card ? t('cards.saved') : t('cards.removed'), props.store.name);
        typing.value = false;
    } else {
        apiErrorToast(catalogueStore.getError('saveCard', props.store.id));
    }
}

function startTyping() {
    code.value = props.store.card?.code ?? '';
    format.value = props.store.card?.format ?? 'ean13';
    submitted.value = false;
    typing.value = true;
}

function saveTyped() {
    submitted.value = true;
    if (!isValidCardCode(code.value, format.value)) return;
    void save({ code: code.value.trim(), format: format.value });
}

function confirmRemove() {
    confirm.require({
        header: t('cards.remove'),
        message: t('cards.remove_confirm', { store: props.store.name }),
        acceptProps: { label: t('cards.remove'), severity: 'danger' },
        rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
        accept: () => void save(null),
    });
}
</script>

<template>
    <section class="store-card-section">
        <h3>{{ t('cards.title') }}</h3>
        <p class="hint">{{ t('cards.hint') }}</p>

        <StoreCardCode v-if="store.card && !typing" :card="store.card" class="preview" />

        <form v-if="typing" class="typed" novalidate @submit.prevent="saveTyped">
            <label for="card-code">{{ t('cards.number') }}</label>
            <InputText
                id="card-code"
                v-model="code"
                :invalid="codeError"
                inputmode="text"
                autocapitalize="none"
                maxlength="500"
                fluid
            />
            <Message v-if="codeError" severity="error" size="small" variant="simple">
                {{ t('cards.number_invalid') }}
            </Message>
            <label for="card-format">{{ t('cards.format') }}</label>
            <Select
                v-model="format"
                input-id="card-format"
                :options="formatOptions"
                option-label="label"
                option-value="value"
                fluid
            />
            <div class="actions">
                <Button
                    :label="t('common.cancel')"
                    severity="secondary"
                    outlined
                    @click="typing = false"
                />
                <Button type="submit" :label="t('common.save')" :loading="saving" />
            </div>
        </form>

        <div v-else class="actions">
            <Button
                :label="store.card ? t('cards.scan_again') : t('cards.scan.action')"
                :loading="saving"
                @click="scannerVisible = true"
            >
                <template #icon><i :class="Icons.camera" /></template>
            </Button>
            <Button
                :label="t('cards.type_instead')"
                severity="secondary"
                outlined
                @click="startTyping"
            />
            <Button
                v-if="store.card"
                :icon="Icons.trash"
                :aria-label="t('cards.remove')"
                severity="danger"
                text
                @click="confirmRemove"
            />
        </div>

        <CardScannerDialog
            v-model:visible="scannerVisible"
            :store-name="store.name"
            @scanned="save"
            @type-instead="startTyping"
        />
    </section>
</template>

<style scoped lang="scss">
.store-card-section {
    margin-bottom: $spacing-lg;
}

h3 {
    font-size: $font-size-lg;
}

.hint {
    margin: $spacing-xs 0 $spacing-sm-md;
    color: $text-muted-color;
}

.preview {
    margin-bottom: $spacing-sm-md;
    border: 1px solid $border-color;
}

.typed {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;

    label {
        font-weight: $font-weight-medium;
    }
}

.actions {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;
    margin-top: $spacing-xs;

    :deep(.p-button) {
        min-height: $touch-target;
    }
}
</style>
