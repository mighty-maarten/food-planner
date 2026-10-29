<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button, IconField, InputIcon, InputText, ProgressSpinner } from 'primevue';
import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';
import EmptyState from '@/components/EmptyState.vue';
import FabButton from '@/components/FabButton.vue';
import LibraryTabs from '@/components/dishes/LibraryTabs.vue';
import TagFilter from '@/components/dishes/TagFilter.vue';
import type { DishListItem } from '@/api/services/types/library';
import { useToastMessages } from '@/composables/toast';
import { useDishesStore } from '@/stores/dishes';
import { buildRoute } from '@/router/utils';
import { Icons } from '@/types/icons';
import { TextUtil } from '@/utils/text';

const { t } = useI18n();
const router = useRouter();
const dishesStore = useDishesStore();
const confirm = useConfirm();
const { apiErrorToast, successToast } = useToastMessages();

const query = ref('');
const tag = ref<string | null>(null);

const filteredDishes = computed(() =>
    dishesStore.dishes.filter(
        (dish) =>
            (!tag.value || dish.tags.includes(tag.value)) &&
            TextUtil.matches(query.value, dish.name, ...dish.ingredientNames),
    ),
);

const isInitialLoad = computed(() => !dishesStore.isLoaded && dishesStore.isLoading('loadDishes'));
const loadFailed = computed(() => !dishesStore.isLoaded && dishesStore.hasError('loadDishes'));

function confirmDelete(dish: DishListItem) {
    confirm.require({
        header: t('common.delete'),
        message: t('dishes.delete.confirm', { name: dish.name }),
        acceptProps: { label: t('common.delete'), severity: 'danger' },
        rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
        accept: () => void deleteDish(dish),
    });
}

async function deleteDish(dish: DishListItem) {
    if (await dishesStore.deleteDish(dish.id)) {
        successToast(t('dishes.delete.done'), dish.name);
    } else {
        apiErrorToast(dishesStore.getError('deleteDish', dish.id));
    }
}

onMounted(() => void dishesStore.loadDishes());
</script>

<template>
    <main class="page">
        <LibraryTabs />

        <div v-if="isInitialLoad" class="center"><ProgressSpinner /></div>

        <EmptyState
            v-else-if="loadFailed"
            :icon="Icons.book"
            :title="t('common.error.title')"
            :description="t('common.error.load')"
        >
            <Button :label="t('common.retry')" @click="dishesStore.loadDishes()" />
        </EmptyState>

        <EmptyState
            v-else-if="dishesStore.dishes.length === 0"
            :icon="Icons.book"
            :title="t('dishes.empty.title')"
            :description="t('dishes.empty.description')"
        >
            <Button
                :icon="Icons.plus"
                :label="t('dishes.new')"
                @click="router.push(buildRoute('dishes_new'))"
            />
        </EmptyState>

        <template v-else>
            <IconField class="search">
                <InputIcon :class="Icons.search" />
                <InputText
                    v-model="query"
                    type="search"
                    :placeholder="t('dishes.search_placeholder')"
                    :aria-label="t('common.search')"
                    fluid
                />
            </IconField>

            <TagFilter v-model="tag" :tags="dishesStore.tags" class="tags" />

            <p class="count">{{ t('dishes.count', filteredDishes.length) }}</p>

            <p v-if="filteredDishes.length === 0" class="no-results">
                {{ t('common.no_results', { query: query.trim() || tag }) }}
            </p>
            <ul v-else class="dish-list">
                <li v-for="dish in filteredDishes" :key="dish.id" class="row">
                    <RouterLink :to="buildRoute('dishes_detail', { dishId: dish.id })" class="dish">
                        <span class="text">
                            <span class="name">{{ dish.name }}</span>
                            <span class="ingredients">
                                {{
                                    dish.ingredientNames.length
                                        ? dish.ingredientNames.join(', ')
                                        : t('dishes.no_ingredients')
                                }}
                            </span>
                        </span>
                        <i
                            v-if="dish.hasRecipe"
                            v-tooltip.left="t('dishes.has_recipe')"
                            :class="Icons.file"
                            class="recipe"
                            :aria-label="t('dishes.has_recipe')"
                        />
                    </RouterLink>
                    <!-- Apart from the link: the whole row opens the dish, this only deletes -->
                    <Button
                        :icon="Icons.trash"
                        :aria-label="`${t('common.delete')}: ${dish.name}`"
                        :loading="dishesStore.isLoading('deleteDish', dish.id)"
                        text
                        rounded
                        severity="secondary"
                        class="delete"
                        @click="confirmDelete(dish)"
                    />
                </li>
            </ul>

            <FabButton
                :icon="Icons.plus"
                :label="t('dishes.new')"
                @click="router.push(buildRoute('dishes_new'))"
            />
        </template>
    </main>
</template>

<style scoped lang="scss">
.page {
    @include page;
    // Room for the floating button below the last dish
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

.tags {
    margin-top: $spacing-sm;
}

.count,
.no-results {
    margin: $spacing-sm-md 0 $spacing-sm;
    color: $text-muted-color;
    font-size: $font-size-sm;
}

.dish-list {
    @include list-card;

    li {
        border-bottom: 1px solid $border-color;

        &:last-child {
            border-bottom: none;
        }
    }

    .row {
        display: flex;
        align-items: center;
        padding-right: $spacing-xs;
    }

    .delete {
        flex-shrink: 0;
        width: $touch-target;
        height: $touch-target;
    }
}

.dish {
    @include list-row;
    flex: 1;
    min-width: 0;
    border-bottom: none;
    color: $text-color;
    text-decoration: none;

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
        font-weight: $font-weight-semibold;
    }

    .ingredients {
        color: $text-muted-color;
        font-size: $font-size-sm;
        @include ellipsis;
    }

    .recipe {
        color: $herb-color;
    }
}
</style>
