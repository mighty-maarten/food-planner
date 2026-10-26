<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Button, ProgressSpinner } from 'primevue';
import { useI18n } from 'vue-i18n';
import AddByName from '@/components/AddByName.vue';
import EmptyState from '@/components/EmptyState.vue';
import LibraryTabs from '@/components/dishes/LibraryTabs.vue';
import { useToastMessages } from '@/composables/toast';
import { useCatalogueStore } from '@/stores/catalogue';
import { buildRoute } from '@/router/utils';
import { Icons } from '@/types/icons';

const { t } = useI18n();
const router = useRouter();
const { apiErrorToast } = useToastMessages();
const catalogueStore = useCatalogueStore();

const stores = computed(() =>
    catalogueStore.stores.map((store) => ({
        ...store,
        ingredientCount: catalogueStore.ingredients.filter((i) => i.storeIds.includes(store.id))
            .length,
    })),
);

async function add(name: string): Promise<boolean> {
    const store = await catalogueStore.createStore(name);
    if (store) {
        // Next step is setting the route through the new store
        await router.push(buildRoute('dishes_store', { storeId: store.id }));
        return true;
    }
    apiErrorToast(catalogueStore.getError('saveStore'), { CONFLICT: t('stores.conflict') });
    return false;
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
            :icon="Icons.shop"
            :title="t('common.error.title')"
            :description="t('common.error.load')"
        >
            <Button :label="t('common.retry')" @click="catalogueStore.load(true)" />
        </EmptyState>

        <template v-else>
            <p class="intro">{{ t('stores.intro') }}</p>
            <EmptyState
                v-if="stores.length === 0"
                :icon="Icons.shop"
                :title="t('stores.empty.title')"
                :description="t('stores.empty.description')"
            />
            <ul v-else class="list">
                <li v-for="store in stores" :key="store.id">
                    <RouterLink
                        :to="buildRoute('dishes_store', { storeId: store.id })"
                        class="store"
                    >
                        <i :class="Icons.shop" class="icon" />
                        <span class="text">
                            <span class="name">{{ store.name }}</span>
                            <span class="count">
                                {{ t('stores.ingredient_count', store.ingredientCount) }}
                            </span>
                        </span>
                        <i :class="Icons.chevronRight" class="chevron" />
                    </RouterLink>
                </li>
            </ul>
            <AddByName
                :placeholder="t('stores.new_placeholder')"
                :loading="catalogueStore.isLoading('saveStore')"
                :add="add"
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

.intro {
    margin-bottom: $spacing-md;
    color: $text-muted-color;
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

.store {
    @include list-row;
    border-bottom: none;
    color: $text-color;
    text-decoration: none;

    &:hover {
        background: $hover-color;
    }

    .icon {
        color: $primary-color;
    }

    .text {
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    .name {
        font-weight: $font-weight-semibold;
    }

    .count {
        color: $text-muted-color;
        font-size: $font-size-sm;
    }

    .chevron {
        color: $text-muted-color;
        font-size: $font-size-sm;
    }
}
</style>
