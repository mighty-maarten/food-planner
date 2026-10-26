<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Button, ProgressSpinner } from 'primevue';
import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import { getApiErrorCode } from '@/api/errors';
import { useToastMessages } from '@/composables/toast';
import { useDishesStore } from '@/stores/dishes';
import { buildRoute } from '@/router/utils';
import { Icons } from '@/types/icons';
import { formatAmount } from '@/utils/amount';
import { renderMarkdown } from '@/utils/markdown';

const props = defineProps<{ dishId: string }>();

const { t } = useI18n();
const router = useRouter();
const confirm = useConfirm();
const { apiErrorToast, successToast } = useToastMessages();
const dishesStore = useDishesStore();

const dish = computed(() => dishesStore.details.get(props.dishId));
// Shown while the full dish loads
const listItem = computed(() => dishesStore.dishes.find((d) => d.id === props.dishId));
const loadError = computed(() => dishesStore.getError('loadDish', props.dishId));
const notFound = computed(() => getApiErrorCode(loadError.value) === 'NOT_FOUND');
const recipeHtml = computed(() => (dish.value?.recipe ? renderMarkdown(dish.value.recipe) : ''));
const sourceHost = computed(() => {
    if (!dish.value?.sourceUrl) return '';
    try {
        return new URL(dish.value.sourceUrl).hostname.replace(/^www\./, '');
    } catch {
        return dish.value.sourceUrl;
    }
});

onMounted(() => void dishesStore.loadDish(props.dishId));

function confirmDelete() {
    const name = dish.value?.name ?? '';
    confirm.require({
        message: t('dishes.delete.confirm', { name }),
        header: t('common.delete'),
        acceptProps: { label: t('common.delete'), severity: 'danger' },
        rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
        accept: () => void deleteDish(name),
    });
}

async function deleteDish(name: string) {
    if (await dishesStore.deleteDish(props.dishId)) {
        successToast(t('dishes.delete.done'), name);
        await router.replace(buildRoute('common_dishes'));
    } else {
        apiErrorToast(dishesStore.getError('deleteDish', props.dishId));
    }
}
</script>

<template>
    <main class="page">
        <PageHeader :title="dish?.name ?? listItem?.name ?? ''" :back="buildRoute('common_dishes')">
            <template v-if="dish" #actions>
                <Button
                    v-tooltip.bottom="t('common.edit')"
                    :icon="Icons.pencil"
                    :aria-label="t('common.edit')"
                    text
                    rounded
                    size="large"
                    @click="router.push(buildRoute('dishes_edit', { dishId }))"
                />
            </template>
        </PageHeader>

        <EmptyState v-if="notFound" :icon="Icons.book" :title="t('dishes.detail.not_found')" />
        <EmptyState
            v-else-if="!dish && loadError"
            :icon="Icons.book"
            :title="t('common.error.title')"
            :description="t('common.error.load')"
        >
            <Button :label="t('common.retry')" @click="dishesStore.loadDish(dishId)" />
        </EmptyState>
        <div v-else-if="!dish" class="center"><ProgressSpinner /></div>

        <template v-else>
            <p v-if="dish.servings || dish.sourceUrl" class="meta">
                <span v-if="dish.servings">
                    <i :class="Icons.users" />
                    {{ t('dishes.detail.servings', dish.servings) }}
                </span>
                <a
                    v-if="dish.sourceUrl"
                    :href="dish.sourceUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <i :class="Icons.link" />
                    {{ sourceHost }}
                </a>
            </p>

            <section class="card">
                <h3>{{ t('dishes.detail.ingredients') }}</h3>
                <p v-if="dish.ingredients.length === 0" class="muted">
                    {{ t('dishes.no_ingredients') }}
                </p>
                <ul v-else class="ingredients">
                    <li v-for="line in dish.ingredients" :key="line.ingredientId">
                        <span class="amount">{{ formatAmount(line.amount, line.unit) }}</span>
                        <span>{{ line.name }}</span>
                    </li>
                </ul>
            </section>

            <section class="card">
                <h3>{{ t('dishes.detail.recipe') }}</h3>
                <!-- eslint-disable-next-line vue/no-v-html -- markdown-it with raw HTML disabled -->
                <div v-if="recipeHtml" class="recipe" v-html="recipeHtml" />
                <p v-else class="muted">{{ t('dishes.detail.no_recipe') }}</p>
            </section>

            <Button
                :icon="Icons.trash"
                :label="t('common.delete')"
                :loading="dishesStore.isLoading('deleteDish', dishId)"
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

.meta {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm $spacing-lg;
    margin-bottom: $spacing-md;
    color: $text-muted-color;

    span,
    a {
        display: inline-flex;
        align-items: center;
        gap: $spacing-sm;
        min-height: $touch-target;
    }

    a {
        color: $primary-color;
        font-weight: $font-weight-medium;
    }
}

.card {
    margin-bottom: $spacing-md;
    padding: $spacing-md;
    background: $card-color;
    border: 1px solid $border-color;
    border-radius: $radius-xl;

    h3 {
        margin-bottom: $spacing-sm-md;
        font-size: $font-size-lg;
    }
}

.muted {
    color: $text-muted-color;
}

.ingredients {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    padding: 0;
    list-style: none;

    li {
        display: flex;
        gap: $spacing-sm;
    }

    .amount {
        min-width: 4.5rem;
        color: $text-muted-color;
        font-variant-numeric: tabular-nums;
    }
}

.recipe {
    line-height: 1.6;
    overflow-wrap: anywhere;

    :deep(p),
    :deep(ul),
    :deep(ol) {
        margin: 0 0 $spacing-sm-md;
    }

    :deep(:last-child) {
        margin-bottom: 0;
    }

    :deep(h1),
    :deep(h2),
    :deep(h3) {
        margin: $spacing-md 0 $spacing-sm;
        font-size: $font-size-md;
    }

    :deep(a) {
        color: $primary-color;
    }
}

.delete {
    min-height: $touch-target;
}
</style>
