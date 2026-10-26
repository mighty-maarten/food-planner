<script setup lang="ts">
import { ref, watch } from 'vue';
import { Button, Dialog, InputText } from 'primevue';
import { useI18n } from 'vue-i18n';
import { useSheetDialog } from '@/composables/sheet-dialog';
import { Icons } from '@/types/icons';

const props = defineProps<{
    title: string;
    label: string;
    name: string;
    saving?: boolean;
    deleting?: boolean;
}>();

const visible = defineModel<boolean>('visible', { required: true });
const emit = defineEmits<{ save: [name: string]; delete: [] }>();

const { t } = useI18n();
const dialogProps = useSheetDialog();
const value = ref('');

watch(visible, (open) => {
    if (open) value.value = props.name;
});

function submit() {
    const name = value.value.trim();
    if (name) emit('save', name);
}
</script>

<template>
    <Dialog v-model:visible="visible" :header="title" v-bind="dialogProps">
        <form id="name-dialog-form" class="form" @submit.prevent="submit">
            <label for="name-dialog-input">{{ label }}</label>
            <InputText id="name-dialog-input" v-model="value" maxlength="100" fluid autofocus />
        </form>
        <template #footer>
            <Button
                :icon="Icons.trash"
                :label="t('common.delete')"
                :loading="deleting"
                severity="danger"
                text
                class="delete"
                @click="emit('delete')"
            />
            <Button
                type="submit"
                form="name-dialog-form"
                :label="t('common.save')"
                :loading="saving"
                :disabled="!value.trim()"
            />
        </template>
    </Dialog>
</template>

<style scoped lang="scss">
.form {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;

    label {
        font-weight: $font-weight-medium;
    }

    :deep(.p-inputtext) {
        min-height: $touch-target;
    }
}

.delete {
    margin-right: auto;
}
</style>
