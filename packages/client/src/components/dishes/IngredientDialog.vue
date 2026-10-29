<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button, Dialog, InputText, Select, SelectButton, ToggleSwitch } from 'primevue';
import { useI18n } from 'vue-i18n';
import { getApiErrorDetails } from '@/api/errors';
import type { Ingredient, IngredientRequest } from '@/api/services/types/library';
import { useSheetDialog } from '@/composables/sheet-dialog';
import { useToastMessages } from '@/composables/toast';
import { useCatalogueStore } from '@/stores/catalogue';
import { Icons } from '@/types/icons';

/** Edits `ingredient`, or creates a new one when it is null */
const props = defineProps<{ ingredient: Ingredient | null }>();
const visible = defineModel<boolean>('visible', { required: true });

const { t } = useI18n();
const dialogProps = useSheetDialog();
const { apiErrorToast, errorToast, successToast } = useToastMessages();
const catalogueStore = useCatalogueStore();

const form = ref<IngredientRequest>({
    name: '',
    categoryId: null,
    storeIds: [],
    alwaysOnList: false,
});

const saveKey = computed(() => props.ingredient?.id);
const isSaving = computed(() =>
    saveKey.value
        ? catalogueStore.isLoading('saveIngredient', saveKey.value)
        : catalogueStore.isLoading('saveIngredient'),
);

watch(visible, (open) => {
    if (!open) return;
    form.value = {
        name: props.ingredient?.name ?? '',
        categoryId: props.ingredient?.categoryId ?? null,
        storeIds: [...(props.ingredient?.storeIds ?? [])],
        alwaysOnList: props.ingredient?.alwaysOnList ?? false,
    };
});

async function save() {
    const request = { ...form.value, name: form.value.name.trim() };
    if (!request.name) return;
    const saved = props.ingredient
        ? await catalogueStore.updateIngredient(props.ingredient.id, request)
        : await catalogueStore.createIngredient(request);
    if (saved) {
        visible.value = false;
    } else {
        apiErrorToast(catalogueStore.getError('saveIngredient', saveKey.value), {
            CONFLICT: t('ingredients.form.conflict'),
        });
    }
}

async function remove() {
    const ingredient = props.ingredient;
    if (!ingredient) return;
    if (await catalogueStore.deleteIngredient(ingredient.id)) {
        visible.value = false;
        successToast(t('ingredients.delete.done'), ingredient.name);
        return;
    }
    const error = catalogueStore.getError('deleteIngredient', ingredient.id);
    const dishes = getApiErrorDetails(error)?.dishes as { name: string }[] | undefined;
    if (dishes) {
        errorToast(
            t('common.error.title'),
            t('ingredients.delete.in_use', {
                name: ingredient.name,
                dishes: dishes.map((dish) => dish.name).join(', '),
            }),
        );
    } else {
        apiErrorToast(error);
    }
}
</script>

<template>
    <Dialog
        v-model:visible="visible"
        :header="ingredient ? t('ingredients.edit') : t('ingredients.new')"
        v-bind="dialogProps"
    >
        <form id="ingredient-form" class="form" @submit.prevent="save">
            <div class="field">
                <label for="ingredient-name">{{ t('ingredients.form.name') }}</label>
                <InputText
                    id="ingredient-name"
                    v-model="form.name"
                    maxlength="100"
                    fluid
                    autofocus
                />
            </div>
            <div class="field">
                <label for="ingredient-category">{{ t('ingredients.form.category') }}</label>
                <Select
                    v-model="form.categoryId"
                    input-id="ingredient-category"
                    :options="catalogueStore.categories"
                    option-label="name"
                    option-value="id"
                    :placeholder="t('ingredients.form.category_placeholder')"
                    show-clear
                    fluid
                />
            </div>
            <div class="field">
                <span class="label">{{ t('ingredients.form.stores') }}</span>
                <SelectButton
                    v-if="catalogueStore.stores.length"
                    v-model="form.storeIds"
                    :options="catalogueStore.stores"
                    option-label="name"
                    option-value="id"
                    multiple
                    class="stores"
                />
                <small class="hint">
                    {{
                        catalogueStore.stores.length
                            ? t('ingredients.form.stores_hint')
                            : t('ingredients.form.no_stores')
                    }}
                </small>
            </div>
            <label class="always" for="ingredient-always">
                <span class="text">
                    <span class="label">{{ t('ingredients.form.always_on_list') }}</span>
                    <small class="hint">{{ t('ingredients.form.always_on_list_hint') }}</small>
                </span>
                <ToggleSwitch v-model="form.alwaysOnList" input-id="ingredient-always" />
            </label>
        </form>
        <template #footer>
            <Button
                v-if="ingredient"
                :icon="Icons.trash"
                :label="t('common.delete')"
                :loading="catalogueStore.isLoading('deleteIngredient', ingredient.id)"
                severity="danger"
                text
                class="delete"
                @click="remove"
            />
            <Button
                type="submit"
                form="ingredient-form"
                :label="t('common.save')"
                :loading="isSaving"
                :disabled="!form.name.trim()"
            />
        </template>
    </Dialog>
</template>

<style scoped lang="scss">
.form {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;

    :deep(.p-inputtext),
    :deep(.p-select) {
        min-height: $touch-target;
    }

    :deep(.p-select) {
        align-items: center;
    }
}

.field {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;

    label,
    .label {
        font-weight: $font-weight-medium;
    }
}

.stores {
    flex-wrap: wrap;

    :deep(.p-togglebutton) {
        min-height: $touch-target;
    }

    // The default checked style is too subtle to see at a glance
    :deep(.p-togglebutton-checked .p-togglebutton-content) {
        background: $primary-color;
        color: $primary-contrast-color;
    }
}

.hint {
    color: $text-muted-color;
}

// The whole row toggles: a big target, the switch alone is small
.always {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    min-height: $touch-target;
    cursor: pointer;

    .text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: $spacing-xxs;
    }

    .label {
        font-weight: $font-weight-medium;
    }
}

.delete {
    margin-right: auto;
}
</style>
