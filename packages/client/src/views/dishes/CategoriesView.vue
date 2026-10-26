<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button, ProgressSpinner } from 'primevue';
import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';
import AddByName from '@/components/AddByName.vue';
import EmptyState from '@/components/EmptyState.vue';
import NameDialog from '@/components/NameDialog.vue';
import ReorderList from '@/components/ReorderList.vue';
import LibraryTabs from '@/components/dishes/LibraryTabs.vue';
import type { Category } from '@/api/services/types/library';
import { useToastMessages } from '@/composables/toast';
import { useCatalogueStore } from '@/stores/catalogue';
import { Icons } from '@/types/icons';

const { t } = useI18n();
const confirm = useConfirm();
const { apiErrorToast, successToast } = useToastMessages();
const catalogueStore = useCatalogueStore();

const selectedId = ref<string | null>(null);
const dialogVisible = ref(false);
const selected = computed(() =>
    selectedId.value ? catalogueStore.categoryById.get(selectedId.value) : undefined,
);

const items = computed(() => {
    const counts = new Map<string, number>();
    for (const ingredient of catalogueStore.ingredients) {
        if (ingredient.categoryId) {
            counts.set(ingredient.categoryId, (counts.get(ingredient.categoryId) ?? 0) + 1);
        }
    }
    return catalogueStore.categories.map((category) => ({
        id: category.id,
        label: category.name,
        description: t('categories.ingredient_count', counts.get(category.id) ?? 0),
    }));
});

const conflictMessage = computed(() => ({ CONFLICT: t('categories.conflict') }));

async function add(name: string): Promise<boolean> {
    if (await catalogueStore.createCategory(name)) return true;
    apiErrorToast(catalogueStore.getError('saveCategory'), conflictMessage.value);
    return false;
}

async function reorder(ids: string[]) {
    await catalogueStore.reorderCategories(ids);
    if (catalogueStore.hasError('reorder')) apiErrorToast(catalogueStore.getError('reorder'));
}

function select(id: string) {
    selectedId.value = id;
    dialogVisible.value = true;
}

async function rename(name: string) {
    const category = selected.value;
    if (!category) return;
    if (await catalogueStore.updateCategory(category.id, name)) {
        dialogVisible.value = false;
    } else {
        apiErrorToast(catalogueStore.getError('saveCategory', category.id), conflictMessage.value);
    }
}

function confirmDelete() {
    const category = selected.value;
    if (!category) return;
    confirm.require({
        header: t('common.delete'),
        message: t('categories.delete.confirm', { name: category.name }),
        acceptProps: { label: t('common.delete'), severity: 'danger' },
        rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
        accept: () => void deleteCategory(category),
    });
}

onMounted(() => void catalogueStore.load(true));

async function deleteCategory(category: Category) {
    if (await catalogueStore.deleteCategory(category.id)) {
        dialogVisible.value = false;
        successToast(t('categories.delete.done'), category.name);
    } else {
        apiErrorToast(catalogueStore.getError('deleteCategory', category.id));
    }
}
</script>

<template>
    <main class="page">
        <LibraryTabs />

        <div v-if="!catalogueStore.isLoaded && catalogueStore.isLoading('load')" class="center">
            <ProgressSpinner />
        </div>

        <EmptyState
            v-else-if="!catalogueStore.isLoaded"
            :icon="Icons.list"
            :title="t('common.error.title')"
            :description="t('common.error.load')"
        >
            <Button :label="t('common.retry')" @click="catalogueStore.load(true)" />
        </EmptyState>

        <template v-else>
            <p class="intro">{{ t('categories.intro') }}</p>
            <ReorderList
                v-if="items.length"
                :items="items"
                :disabled="catalogueStore.isLoading('reorder')"
                @reorder="reorder"
                @select="select"
            />
            <AddByName
                :placeholder="t('categories.new_placeholder')"
                :loading="catalogueStore.isLoading('saveCategory')"
                :add="add"
            />
        </template>

        <NameDialog
            v-model:visible="dialogVisible"
            :title="t('categories.rename')"
            :label="t('categories.name')"
            :name="selected?.name ?? ''"
            :saving="!!selected && catalogueStore.isLoading('saveCategory', selected.id)"
            :deleting="!!selected && catalogueStore.isLoading('deleteCategory', selected.id)"
            @save="rename"
            @delete="confirmDelete"
        />
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

.intro {
    margin-bottom: $spacing-md;
    color: $text-muted-color;
}
</style>
