<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button, IconField, InputIcon, InputText, ProgressSpinner, Tag } from 'primevue';
import { useI18n } from 'vue-i18n';
import EmptyState from '@/components/EmptyState.vue';
import FabButton from '@/components/FabButton.vue';
import IngredientDialog from '@/components/dishes/IngredientDialog.vue';
import LibraryTabs from '@/components/dishes/LibraryTabs.vue';
import type { Ingredient } from '@/api/services/types/library';
import { useCatalogueStore } from '@/stores/catalogue';
import { Icons } from '@/types/icons';
import { TextUtil } from '@/utils/text';

const { t } = useI18n();
const catalogueStore = useCatalogueStore();

const query = ref('');
const dialogVisible = ref(false);
const selected = ref<Ingredient | null>(null);

const filtered = computed(() =>
    query.value.trim()
        ? catalogueStore.ingredients.filter((i) => TextUtil.matches(query.value, i.name))
        : catalogueStore.ingredients,
);

// Uncategorised first, so they get noticed and categorised; then the default category order
const groups = computed(() => {
    const byCategory = new Map<string | null, Ingredient[]>();
    for (const ingredient of filtered.value) {
        const key = catalogueStore.categoryById.has(ingredient.categoryId ?? '')
            ? ingredient.categoryId
            : null;
        byCategory.set(key, [...(byCategory.get(key) ?? []), ingredient]);
    }
    return [
        { id: 'none', name: t('ingredients.uncategorised'), items: byCategory.get(null) ?? [] },
        ...catalogueStore.categories.map((category) => ({
            id: category.id,
            name: category.name,
            items: byCategory.get(category.id) ?? [],
        })),
    ].filter((group) => group.items.length > 0);
});

function storeNames(ingredient: Ingredient): string[] {
    return ingredient.storeIds.flatMap((id) => catalogueStore.storeById.get(id)?.name ?? []);
}

function open(ingredient: Ingredient | null) {
    selected.value = ingredient;
    dialogVisible.value = true;
}

onMounted(() => void catalogueStore.load(true));
</script>

<template>
    <main class="page">
        <LibraryTabs />

        <div v-if="!catalogueStore.isLoaded && catalogueStore.isLoading('load')" class="center">
            <ProgressSpinner />
        </div>

        <EmptyState
            v-else-if="!catalogueStore.isLoaded"
            :icon="Icons.tag"
            :title="t('common.error.title')"
            :description="t('common.error.load')"
        >
            <Button :label="t('common.retry')" @click="catalogueStore.load(true)" />
        </EmptyState>

        <EmptyState
            v-else-if="catalogueStore.ingredients.length === 0"
            :icon="Icons.tag"
            :title="t('ingredients.empty.title')"
            :description="t('ingredients.empty.description')"
        >
            <Button :icon="Icons.plus" :label="t('ingredients.new')" @click="open(null)" />
        </EmptyState>

        <template v-else>
            <IconField class="search">
                <InputIcon :class="Icons.search" />
                <InputText
                    v-model="query"
                    type="search"
                    :placeholder="t('ingredients.search_placeholder')"
                    :aria-label="t('common.search')"
                    fluid
                />
            </IconField>

            <p class="count">{{ t('ingredients.count', filtered.length) }}</p>
            <p v-if="filtered.length === 0" class="count">
                {{ t('common.no_results', { query }) }}
            </p>

            <section v-for="group in groups" :key="group.id" class="group">
                <h3>{{ group.name }}</h3>
                <ul class="list">
                    <li v-for="ingredient in group.items" :key="ingredient.id">
                        <button type="button" class="ingredient" @click="open(ingredient)">
                            <span class="text">
                                <span class="name">{{ ingredient.name }}</span>
                                <span class="usage">
                                    {{
                                        ingredient.dishCount
                                            ? t('ingredients.used_in', ingredient.dishCount)
                                            : t('ingredients.not_used')
                                    }}
                                </span>
                            </span>
                            <span class="stores">
                                <Tag
                                    v-for="name in storeNames(ingredient)"
                                    :key="name"
                                    :value="name"
                                    severity="secondary"
                                />
                            </span>
                        </button>
                    </li>
                </ul>
            </section>

            <FabButton :icon="Icons.plus" :label="t('ingredients.new')" @click="open(null)" />
        </template>

        <IngredientDialog v-model:visible="dialogVisible" :ingredient="selected" />
    </main>
</template>

<style scoped lang="scss">
.page {
    @include page;
    padding-bottom: 96px;
}

.center {
    display: grid;
    place-items: center;
    padding: $spacing-2xl 0;
}

.search :deep(.p-inputtext) {
    min-height: $touch-target;
}

.count {
    margin: $spacing-sm-md 0 $spacing-sm;
    color: $text-muted-color;
    font-size: $font-size-sm;
}

.group {
    margin-bottom: $spacing-lg;

    h3 {
        margin-bottom: $spacing-sm;
        font-size: $font-size-md;
    }
}

.list {
    @include list-card;

    li {
        border-bottom: 1px solid $border-color;

        &:last-child {
            border-bottom: none;
        }
    }
}

.ingredient {
    @include list-row;
    width: 100%;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
        background: $hover-color;
    }

    .text {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .name {
        font-weight: $font-weight-medium;
    }

    .usage {
        color: $text-muted-color;
        font-size: $font-size-sm;
    }

    .stores {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: $spacing-xs;
    }
}
</style>
