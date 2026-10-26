<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Button, InputText, ProgressSpinner } from 'primevue';
import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import ReorderList from '@/components/ReorderList.vue';
import { useToastMessages } from '@/composables/toast';
import { useCatalogueStore } from '@/stores/catalogue';
import { buildRoute } from '@/router/utils';
import { Icons } from '@/types/icons';

const props = defineProps<{ storeId: string }>();

const { t } = useI18n();
const router = useRouter();
const confirm = useConfirm();
const { apiErrorToast, successToast } = useToastMessages();
const catalogueStore = useCatalogueStore();

const store = computed(() => catalogueStore.storeById.get(props.storeId));
const name = ref('');
const isNameChanged = computed(
    () => !!store.value && !!name.value.trim() && name.value.trim() !== store.value.name,
);

const route = computed(() =>
    (store.value?.categoryIds ?? []).flatMap((id) => {
        const category = catalogueStore.categoryById.get(id);
        return category ? [{ id, label: category.name }] : [];
    }),
);

watch(
    () => store.value?.name,
    (storeName) => {
        name.value = storeName ?? '';
    },
    { immediate: true },
);

async function saveName() {
    if (!isNameChanged.value) return;
    const saved = await catalogueStore.updateStore(props.storeId, name.value.trim());
    if (saved) {
        successToast(t('stores.saved'), saved.name);
    } else {
        apiErrorToast(catalogueStore.getError('saveStore', props.storeId), {
            CONFLICT: t('stores.conflict'),
        });
    }
}

async function reorder(ids: string[]) {
    await catalogueStore.updateStoreCategoryOrder(props.storeId, ids);
    const error = catalogueStore.getError('reorder', props.storeId);
    if (error) apiErrorToast(error);
}

function confirmDelete() {
    const storeName = store.value?.name ?? '';
    confirm.require({
        header: t('common.delete'),
        message: t('stores.delete.confirm', { name: storeName }),
        acceptProps: { label: t('common.delete'), severity: 'danger' },
        rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
        accept: () => void deleteStore(storeName),
    });
}

onMounted(() => void catalogueStore.load());

async function deleteStore(storeName: string) {
    if (await catalogueStore.deleteStore(props.storeId)) {
        successToast(t('stores.delete.done'), storeName);
        await router.replace(buildRoute('dishes_stores'));
    } else {
        apiErrorToast(catalogueStore.getError('deleteStore', props.storeId));
    }
}
</script>

<template>
    <main class="page">
        <PageHeader :title="store?.name ?? ''" :back="buildRoute('dishes_stores')" />

        <div v-if="!catalogueStore.isLoaded && catalogueStore.isLoading('load')" class="center">
            <ProgressSpinner />
        </div>

        <EmptyState
            v-else-if="!store"
            :icon="Icons.shop"
            :title="catalogueStore.isLoaded ? t('stores.not_found') : t('common.error.title')"
        />

        <template v-else>
            <form class="name-form" @submit.prevent="saveName">
                <label for="store-name">{{ t('stores.name') }}</label>
                <div class="name-row">
                    <InputText id="store-name" v-model="name" maxlength="100" fluid />
                    <Button
                        type="submit"
                        :label="t('common.save')"
                        :disabled="!isNameChanged"
                        :loading="catalogueStore.isLoading('saveStore', storeId)"
                    />
                </div>
            </form>

            <section>
                <h3>{{ t('stores.route') }}</h3>
                <p class="hint">{{ t('stores.route_hint') }}</p>
                <ReorderList
                    :items="route"
                    :disabled="catalogueStore.isLoading('reorder', storeId)"
                    @reorder="reorder"
                />
            </section>

            <Button
                :icon="Icons.trash"
                :label="t('common.delete')"
                :loading="catalogueStore.isLoading('deleteStore', storeId)"
                severity="danger"
                text
                class="delete"
                @click="confirmDelete"
            />
        </template>
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

.name-form {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    margin-bottom: $spacing-lg;

    label {
        font-weight: $font-weight-medium;
    }

    .name-row {
        display: flex;
        gap: $spacing-sm;

        :deep(.p-inputtext),
        :deep(.p-button) {
            min-height: $touch-target;
        }

        :deep(.p-button) {
            flex-shrink: 0;
        }
    }
}

h3 {
    font-size: $font-size-lg;
}

.hint {
    margin: $spacing-xs 0 $spacing-sm-md;
    color: $text-muted-color;
}

.delete {
    margin-top: $spacing-lg;
    min-height: $touch-target;
}
</style>
