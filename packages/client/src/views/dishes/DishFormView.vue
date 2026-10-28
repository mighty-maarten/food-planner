<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import {
    AutoComplete,
    Button,
    InputNumber,
    InputText,
    Message,
    ProgressSpinner,
    Tag,
    Textarea,
} from 'primevue';
import type { AutoCompleteCompleteEvent } from 'primevue/autocomplete';
import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';
import PageHeader from '@/components/PageHeader.vue';
import {
    type DishFormState,
    duplicateLineKeys,
    emptyLine,
    isValidUrl,
    toCopyState,
    toFormState,
    toRequest,
} from '@/components/dishes/dish-form';
import { useToastMessages } from '@/composables/toast';
import { useCatalogueStore } from '@/stores/catalogue';
import { useDishesStore } from '@/stores/dishes';
import { buildRoute } from '@/router/utils';
import { Icons } from '@/types/icons';
import { TextUtil } from '@/utils/text';

const props = defineProps<{ dishId?: string }>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const confirm = useConfirm();
const { apiErrorToast, successToast } = useToastMessages();
const dishesStore = useDishesStore();
const catalogueStore = useCatalogueStore();

// Common units, offered as suggestions (any text is allowed)
const UNITS = [
    'g',
    'kg',
    'ml',
    'l',
    'stuk',
    'stuks',
    'pot',
    'blik',
    'zak',
    'doos',
    'bussel',
    'teentje',
    'el',
    'tl',
];

const form = ref<DishFormState | null>(null);
const savedSnapshot = ref('');
const submitted = ref(false);
const suggestions = ref<string[]>([]);

const isNew = computed(() => !props.dishId);
const isDirty = computed(
    () => !!form.value && JSON.stringify(toRequest(form.value)) !== savedSnapshot.value,
);
const duplicates = computed(() => duplicateLineKeys(form.value?.lines ?? []));
const nameError = computed(() => submitted.value && !form.value?.name.trim());
const urlError = computed(
    () => !!form.value?.sourceUrl.trim() && submitted.value && !isValidUrl(form.value.sourceUrl),
);
// Opened from somewhere else (e.g. a plan day): go back there after saving or cancelling.
// Only paths within the app are accepted.
const returnTo = computed(() => {
    const value = route.query.terug;
    return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
        ? value
        : undefined;
});
const backRoute = computed(
    () =>
        returnTo.value ??
        (props.dishId
            ? buildRoute('dishes_detail', { dishId: props.dishId })
            : buildRoute('common_dishes')),
);

function setForm(state: DishFormState) {
    form.value = state;
    savedSnapshot.value = JSON.stringify(toRequest(state));
}

// /gerechten/nieuw?kopie=<dishId>: a new dish filled in from an existing one
const copyOf = computed(() =>
    !props.dishId && typeof route.query.kopie === 'string' ? route.query.kopie : undefined,
);

onMounted(async () => {
    void catalogueStore.load();
    if (copyOf.value) {
        const [source] = await Promise.all([
            dishesStore.details.get(copyOf.value) ?? dishesStore.loadDish(copyOf.value),
            dishesStore.isLoaded ? undefined : dishesStore.loadDishes(),
        ]);
        // Compared with an empty form, so leaving without saving asks first
        setForm(toFormState());
        if (source) {
            form.value = toCopyState(
                source,
                dishesStore.dishes.map((dish) => dish.name),
            );
        } else {
            apiErrorToast(dishesStore.getError('loadDish', copyOf.value));
        }
        return;
    }
    if (!props.dishId) {
        setForm(toFormState());
        return;
    }
    const dish =
        dishesStore.details.get(props.dishId) ?? (await dishesStore.loadDish(props.dishId));
    if (dish) {
        setForm(toFormState(dish));
    } else {
        apiErrorToast(dishesStore.getError('loadDish', props.dishId));
        await router.replace(backRoute.value);
    }
});

function isNewIngredient(name: string): boolean {
    const key = name.trim().toLowerCase();
    return !!key && catalogueStore.isLoaded && !catalogueStore.ingredientByName.has(key);
}

function searchIngredients(event: AutoCompleteCompleteEvent) {
    const used = new Set(form.value?.lines.map((line) => line.name.trim().toLowerCase()));
    suggestions.value = catalogueStore.ingredients
        .filter(
            (ingredient) =>
                !used.has(ingredient.name.toLowerCase()) &&
                TextUtil.matches(event.query, ingredient.name),
        )
        .slice(0, 8)
        .map((ingredient) => ingredient.name);
}

async function addLine() {
    if (!form.value) return;
    const line = emptyLine();
    form.value.lines.push(line);
    await nextTick();
    document.getElementById(`ingredient-${String(line.key)}`)?.focus();
}

function removeLine(key: number) {
    if (!form.value) return;
    form.value.lines = form.value.lines.filter((line) => line.key !== key);
}

// Enter in the last ingredient field starts the next line, for quick typing
function onIngredientEnter(key: number) {
    const lines = form.value?.lines ?? [];
    if (lines[lines.length - 1]?.key === key) void addLine();
}

async function save() {
    if (!form.value) return;
    submitted.value = true;
    if (nameError.value || urlError.value || duplicates.value.size > 0) return;

    const dish = await dishesStore.saveDish(props.dishId, toRequest(form.value));
    if (!dish) {
        apiErrorToast(dishesStore.getError('saveDish'), { CONFLICT: t('dishes.form.conflict') });
        return;
    }
    setForm(toFormState(dish));
    successToast(t('dishes.form.saved'), dish.name);
    await router.replace(returnTo.value ?? buildRoute('dishes_detail', { dishId: dish.id }));
}

onBeforeRouteLeave(() => {
    if (!isDirty.value) return true;
    return new Promise<boolean>((resolve) => {
        confirm.require({
            header: t('dishes.form.leave_title'),
            message: t('dishes.form.leave_confirm'),
            acceptProps: { label: t('dishes.form.leave'), severity: 'danger' },
            rejectProps: { label: t('dishes.form.stay'), severity: 'secondary', outlined: true },
            accept: () => {
                resolve(true);
            },
            reject: () => {
                resolve(false);
            },
            onHide: () => {
                resolve(false);
            },
        });
    });
});
</script>

<template>
    <main class="page">
        <PageHeader
            :title="
                copyOf
                    ? t('dishes.form.title_copy')
                    : isNew
                      ? t('dishes.form.title_new')
                      : t('dishes.form.title_edit')
            "
            :back="backRoute"
        />

        <div v-if="!form" class="center"><ProgressSpinner /></div>

        <form v-else class="form" novalidate @submit.prevent>
            <div class="field">
                <label for="dish-name">{{ t('dishes.form.name') }}</label>
                <InputText
                    id="dish-name"
                    v-model="form.name"
                    :placeholder="t('dishes.form.name_placeholder')"
                    :invalid="nameError"
                    maxlength="200"
                    fluid
                />
                <Message v-if="nameError" severity="error" size="small" variant="simple">
                    {{ t('dishes.form.name_required') }}
                </Message>
            </div>

            <fieldset class="field">
                <legend>{{ t('dishes.form.ingredients') }}</legend>
                <ul class="lines">
                    <li v-for="line in form.lines" :key="line.key" class="line">
                        <div class="ingredient">
                            <AutoComplete
                                v-model="line.name"
                                :input-id="`ingredient-${line.key}`"
                                :suggestions="suggestions"
                                :placeholder="t('dishes.form.ingredient_placeholder')"
                                :invalid="duplicates.has(line.key)"
                                :delay="0"
                                :maxlength="100"
                                fluid
                                @complete="searchIngredients"
                                @keydown.enter="onIngredientEnter(line.key)"
                            />
                            <Tag
                                v-if="isNewIngredient(line.name)"
                                :value="t('dishes.form.new_ingredient')"
                                severity="secondary"
                                class="new-tag"
                            />
                        </div>
                        <InputNumber
                            v-model="line.amount"
                            :placeholder="t('dishes.form.amount_placeholder')"
                            :aria-label="t('dishes.form.amount_placeholder')"
                            :min-fraction-digits="0"
                            :max-fraction-digits="3"
                            :min="0"
                            locale="nl-BE"
                            class="amount"
                            fluid
                        />
                        <InputText
                            v-model="line.unit"
                            :placeholder="t('dishes.form.unit_placeholder')"
                            :aria-label="t('dishes.form.unit_placeholder')"
                            list="dish-units"
                            maxlength="30"
                            class="unit"
                        />
                        <Button
                            :icon="Icons.times"
                            :aria-label="t('dishes.form.remove_ingredient')"
                            text
                            rounded
                            severity="secondary"
                            class="remove"
                            @click="removeLine(line.key)"
                        />
                        <Message
                            v-if="duplicates.has(line.key)"
                            severity="error"
                            size="small"
                            variant="simple"
                            class="line-error"
                        >
                            {{ t('dishes.form.duplicate_ingredient') }}
                        </Message>
                    </li>
                </ul>
                <datalist id="dish-units">
                    <option v-for="unit in UNITS" :key="unit" :value="unit" />
                </datalist>
                <Button
                    :icon="Icons.plus"
                    :label="t('dishes.form.add_ingredient')"
                    severity="secondary"
                    outlined
                    class="add-line"
                    @click="addLine"
                />
            </fieldset>

            <div class="row">
                <div class="field servings">
                    <label for="dish-servings">{{ t('dishes.form.servings') }}</label>
                    <InputNumber
                        v-model="form.servings"
                        input-id="dish-servings"
                        :min="1"
                        :max="100"
                        show-buttons
                        button-layout="horizontal"
                        fluid
                    >
                        <template #incrementbuttonicon><i :class="Icons.plus" /></template>
                        <template #decrementbuttonicon><i class="pi pi-minus" /></template>
                    </InputNumber>
                </div>
                <div class="field source">
                    <label for="dish-source">{{ t('dishes.form.source_url') }}</label>
                    <InputText
                        id="dish-source"
                        v-model="form.sourceUrl"
                        type="url"
                        inputmode="url"
                        :placeholder="t('dishes.form.source_url_placeholder')"
                        :invalid="urlError"
                        maxlength="2000"
                        autocapitalize="none"
                        fluid
                    />
                    <Message v-if="urlError" severity="error" size="small" variant="simple">
                        {{ t('dishes.form.source_url_invalid') }}
                    </Message>
                </div>
            </div>

            <div class="field">
                <label for="dish-recipe">{{ t('dishes.form.recipe') }}</label>
                <Textarea id="dish-recipe" v-model="form.recipe" rows="6" auto-resize fluid />
                <small class="hint">{{ t('dishes.form.recipe_hint') }}</small>
            </div>

            <div class="actions">
                <Button
                    :label="t('common.cancel')"
                    severity="secondary"
                    outlined
                    @click="router.push(backRoute)"
                />
                <Button
                    :icon="Icons.check"
                    :label="t('common.save')"
                    :loading="dishesStore.isLoading('saveDish')"
                    @click="save"
                />
            </div>
        </form>
    </main>
</template>

<style scoped lang="scss">
.page {
    @include page;
}

.center {
    display: grid;
    place-items: center;
    padding: $spacing-2xl 0;
}

.form {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;

    :deep(.p-inputtext),
    :deep(.p-inputnumber-button) {
        min-height: $touch-target;
    }
}

.field {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: none;

    label,
    legend {
        padding: 0;
        margin-bottom: $spacing-xs;
        font-weight: $font-weight-medium;
    }
}

.lines {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm-md;
    padding: 0;
    list-style: none;
}

// Phone: the ingredient on its own row, amount and unit below it
.line {
    display: grid;
    grid-template-columns: 1fr 1fr $touch-target;
    grid-template-areas:
        'ingredient ingredient remove'
        'amount unit .'
        'error error error';
    gap: $spacing-xs $spacing-sm;
    padding-bottom: $spacing-sm-md;
    border-bottom: 1px dashed $border-color;

    @include minb($breakpoint-sm) {
        grid-template-columns: 7rem 7rem 1fr $touch-target;
        grid-template-areas:
            'amount unit ingredient remove'
            'error error error error';
        padding-bottom: 0;
        border-bottom: none;
    }

    .ingredient {
        grid-area: ingredient;
        position: relative;
        min-width: 0;
    }

    .new-tag {
        position: absolute;
        top: 50%;
        right: $spacing-sm;
        transform: translateY(-50%);
        pointer-events: none;
    }

    .amount {
        grid-area: amount;
        min-width: 0;
    }

    .unit {
        grid-area: unit;
        min-width: 0;
    }

    .remove {
        grid-area: remove;
        width: $touch-target;
        height: $touch-target;
    }

    .line-error {
        grid-area: error;
    }
}

.add-line {
    align-self: flex-start;
    min-height: $touch-target;
}

.row {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-lg;

    .servings {
        flex: 0 0 10rem;
    }

    .source {
        flex: 1 1 16rem;
    }
}

.hint {
    color: $text-muted-color;
}

.actions {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-sm;

    :deep(.p-button) {
        min-height: $touch-target;
    }

    @include maxb($breakpoint-sm) {
        :deep(.p-button) {
            flex: 1;
        }
    }
}
</style>
