<script setup lang="ts">
import { ref } from 'vue';
import { Button, InputText } from 'primevue';
import { useI18n } from 'vue-i18n';
import { Icons } from '@/types/icons';

const props = defineProps<{
    placeholder: string;
    loading?: boolean;
    /** Adds the item, resolves to true on success (which clears the field) */
    add: (name: string) => Promise<boolean>;
}>();

const { t } = useI18n();
const name = ref('');

async function submit() {
    const value = name.value.trim();
    if (value && (await props.add(value))) {
        name.value = '';
    }
}
</script>

<template>
    <form class="add-by-name" @submit.prevent="submit">
        <InputText
            v-model="name"
            :placeholder="placeholder"
            :aria-label="placeholder"
            :disabled="loading"
            maxlength="100"
            fluid
        />
        <Button
            type="submit"
            :icon="Icons.plus"
            :label="t('common.add')"
            :loading="loading"
            :disabled="!name.trim()"
        />
    </form>
</template>

<style scoped lang="scss">
.add-by-name {
    display: flex;
    gap: $spacing-sm;
    margin-top: $spacing-md;

    :deep(.p-inputtext),
    :deep(.p-button) {
        min-height: $touch-target;
    }

    :deep(.p-button) {
        flex-shrink: 0;
    }
}
</style>
