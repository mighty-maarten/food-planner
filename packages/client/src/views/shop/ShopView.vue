<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Button, ProgressSpinner } from 'primevue';
import { useEventListener } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import EmptyState from '@/components/EmptyState.vue';
import type { ListItem } from '@/api/services/types/plans';
import { useAuthStore } from '@/stores/auth';
import { useShopStore } from '@/stores/shop';
import { buildRoute } from '@/router/utils';
import { Icons } from '@/types/icons';
import { DateUtil } from '@/utils/date';
import { buildShopList, isForStore, isNeededSoon } from '@/utils/shop';

const { t } = useI18n();
const router = useRouter();
const shop = useShopStore();
const authStore = useAuthStore();

const today = DateUtil.today();

const list = computed(() =>
    shop.plan ? buildShopList(shop.plan, shop.storeId, shop.categories, shop.stores) : null,
);
const total = computed(
    () => shop.plan?.items.filter((item) => isForStore(item, shop.storeId)).length ?? 0,
);
const done = computed(() => list.value?.checked.length ?? 0);
const categoryNames = computed(() => new Map(shop.categories.map((c) => [c.id, c.name])));
const savedTime = computed(() =>
    shop.savedAt
        ? new Date(shop.savedAt).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })
        : '',
);

function tick(item: ListItem) {
    // A short buzz confirms the tick without looking (Android; iOS Safari has no vibrate)
    if ('vibrate' in navigator) navigator.vibrate(10);
    void shop.toggle(item);
}

onMounted(() => void shop.start());
onUnmounted(() => {
    shop.stop();
});

// Sync as soon as the connection is back, and catch up when the app returns to the foreground
useEventListener(window, 'online', () => void shop.resume());
useEventListener(document, 'visibilitychange', () => {
    if (document.visibilityState === 'visible') void shop.resume();
});
</script>

<template>
    <main class="page">
        <div v-if="!shop.plan && shop.isLoading" class="center"><ProgressSpinner /></div>

        <EmptyState
            v-else-if="!shop.plan && shop.isOffline"
            :icon="Icons.wifiOff"
            :title="t('shop.offline_no_cache.title')"
            :description="t('shop.offline_no_cache.description')"
        />

        <EmptyState
            v-else-if="!shop.plan"
            :icon="Icons.calendar"
            :title="t('shop.no_plan.title')"
            :description="t('shop.no_plan.description')"
        >
            <Button
                :label="t('shop.no_plan.action')"
                @click="router.push(buildRoute('common_plan'))"
            />
        </EmptyState>

        <template v-else-if="list">
            <header class="shop-header">
                <span class="range">
                    {{ DateUtil.formatRange(shop.plan.startDate, shop.plan.endDate) }}
                </span>
                <span v-if="shop.isOffline || shop.queue.length" class="status offline">
                    <i :class="Icons.wifiOff" />
                    {{
                        shop.queue.length
                            ? t('shop.status.pending', shop.queue.length)
                            : t('shop.status.offline')
                    }}
                </span>
                <span v-else-if="shop.isLive" class="status live">
                    <span class="dot" />
                    {{ t('shop.status.live') }}
                </span>
            </header>
            <p v-if="shop.isOffline && savedTime" class="saved-at">
                {{ t('shop.status.saved_at', { time: savedTime }) }}
            </p>

            <nav v-if="shop.stores.length" class="stores">
                <button
                    type="button"
                    class="store"
                    :class="{ active: !shop.storeId }"
                    :aria-pressed="!shop.storeId"
                    @click="shop.setStoreFilter(null)"
                >
                    {{ t('shop.all_stores') }}
                </button>
                <button
                    v-for="store in shop.stores"
                    :key="store.id"
                    type="button"
                    class="store"
                    :class="{ active: shop.storeId === store.id }"
                    :aria-pressed="shop.storeId === store.id"
                    @click="shop.setStoreFilter(store.id)"
                >
                    <i :class="Icons.shop" />
                    {{ store.name }}
                </button>
            </nav>

            <EmptyState
                v-if="total === 0"
                :icon="Icons.cart"
                :title="t('shop.empty.title')"
                :description="t('shop.empty.description')"
            />

            <template v-else>
                <div class="progress">
                    <span>{{ t('shop.progress', { done, total }) }}</span>
                    <div
                        class="bar"
                        role="progressbar"
                        :aria-valuenow="done"
                        :aria-valuemax="total"
                    >
                        <div class="fill" :style="{ width: `${(done / total) * 100}%` }" />
                    </div>
                </div>

                <EmptyState
                    v-if="list.groups.length === 0"
                    :icon="Icons.check"
                    :title="t('shop.done.title')"
                    :description="t('shop.done.description')"
                />

                <section
                    v-for="group in list.groups"
                    :key="group.categoryId ?? 'none'"
                    class="group"
                >
                    <h3>
                        {{
                            (group.categoryId && categoryNames.get(group.categoryId)) ??
                            t('shop.uncategorised')
                        }}
                    </h3>
                    <ul class="items">
                        <li v-for="item in group.items" :key="item.id">
                            <button
                                type="button"
                                role="checkbox"
                                :aria-checked="false"
                                class="item"
                                @click="tick(item)"
                            >
                                <span class="box" />
                                <span class="text">
                                    <span class="name">{{ item.name }}</span>
                                    <span v-if="item.note" class="note">{{ item.note }}</span>
                                </span>
                                <i
                                    v-if="shop.pendingItemIds.has(item.id)"
                                    :class="Icons.refresh"
                                    class="pending"
                                    :aria-label="t('shop.pending_item')"
                                />
                                <span
                                    v-if="item.neededBy"
                                    class="needed"
                                    :class="{ soon: isNeededSoon(item.neededBy, today) }"
                                >
                                    {{ DateUtil.formatShort(item.neededBy) }}
                                </span>
                            </button>
                        </li>
                    </ul>
                </section>

                <section v-if="list.checked.length" class="group checked">
                    <h3>{{ t('shop.in_cart', list.checked.length) }}</h3>
                    <ul class="items">
                        <li v-for="item in list.checked" :key="item.id">
                            <button
                                type="button"
                                role="checkbox"
                                :aria-checked="true"
                                class="item"
                                @click="tick(item)"
                            >
                                <span class="box"><i :class="Icons.check" /></span>
                                <span class="text">
                                    <span class="name">{{ item.name }}</span>
                                    <span
                                        v-if="
                                            item.checkedBy &&
                                            item.checkedBy.id !== authStore.currentUser?.id
                                        "
                                        class="note"
                                    >
                                        {{ t('shop.by', { name: item.checkedBy.name }) }}
                                    </span>
                                </span>
                                <i
                                    v-if="shop.pendingItemIds.has(item.id)"
                                    :class="Icons.refresh"
                                    class="pending"
                                    :aria-label="t('shop.pending_item')"
                                />
                            </button>
                        </li>
                    </ul>
                </section>
            </template>
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

.shop-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-sm;
    min-height: 32px;

    .range {
        color: $text-muted-color;
        font-weight: $font-weight-medium;
    }

    .status {
        display: inline-flex;
        align-items: center;
        gap: $spacing-xs;
        padding: $spacing-xxs $spacing-sm;
        border-radius: $radius-full;
        font-size: $font-size-xs;
        font-weight: $font-weight-semibold;

        &.offline {
            background: $saffron-color;
            color: var(--p-surface-950);
        }

        &.live {
            color: $herb-color;
        }

        .dot {
            width: 8px;
            height: 8px;
            border-radius: $radius-full;
            background: $herb-color;
        }
    }
}

.saved-at {
    color: $text-muted-color;
    font-size: $font-size-xs;
}

.stores {
    display: flex;
    gap: $spacing-sm;
    margin: $spacing-sm-md (-$spacing-md) 0;
    padding: 0 $spacing-md;
    overflow-x: auto;
    scrollbar-width: none;

    .store {
        display: inline-flex;
        align-items: center;
        gap: $spacing-sm;
        flex-shrink: 0;
        min-height: $touch-target;
        padding: 0 $spacing-md;
        border: 1px solid $border-color;
        border-radius: $radius-full;
        background: $card-color;
        color: $text-color;
        font: inherit;
        font-weight: $font-weight-medium;
        cursor: pointer;

        &.active {
            border-color: $primary-color;
            background: $primary-color;
            color: $primary-contrast-color;
        }
    }
}

.progress {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    margin: $spacing-md 0;
    color: $text-muted-color;
    font-size: $font-size-sm;

    .bar {
        height: 6px;
        border-radius: $radius-full;
        background: $border-color;
        overflow: hidden;
    }

    .fill {
        height: 100%;
        border-radius: $radius-full;
        background: $herb-color;
        transition: width 0.3s ease;
    }
}

.group {
    margin-bottom: $spacing-lg;

    h3 {
        margin-bottom: $spacing-sm;
        font-size: $font-size-md;
    }
}

.items {
    @include list-card;

    li {
        border-bottom: 1px solid $border-color;

        &:last-child {
            border-bottom: none;
        }
    }
}

// The whole row is the tap target: one thumb, no aiming
.item {
    display: flex;
    align-items: center;
    gap: $spacing-sm-md;
    width: 100%;
    min-height: 64px;
    padding: $spacing-sm $spacing-md;
    border: none;
    background: none;
    color: $text-color;
    font: inherit;
    text-align: left;
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;

    &:active {
        background: $hover-color;
    }

    .box {
        display: grid;
        place-items: center;
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        border: 2px solid $border-color;
        border-radius: $radius-full;
        color: $primary-contrast-color;

        i {
            font-size: $font-size-sm;
        }
    }

    .text {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .name {
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;
        overflow-wrap: anywhere;
    }

    .note {
        color: $text-muted-color;
        font-size: $font-size-sm;
    }

    .pending {
        color: $text-muted-color;
        font-size: $font-size-sm;
    }

    .needed {
        flex-shrink: 0;
        padding: $spacing-xxs $spacing-sm;
        border-radius: $radius-full;
        background: $hover-color;
        color: $text-muted-color;
        font-size: $font-size-xs;
        font-weight: $font-weight-medium;

        &.soon {
            background: $saffron-color;
            color: var(--p-surface-950);
        }
    }
}

.checked {
    .item {
        .box {
            border-color: $herb-color;
            background: $herb-color;
        }

        .name {
            color: $text-muted-color;
            font-weight: $font-weight-medium;
            text-decoration: line-through;
        }
    }
}
</style>
