<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button, Menu, ProgressSpinner } from 'primevue';
import type { MenuItem } from 'primevue/menuitem';
import { useEventListener } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import EmptyState from '@/components/EmptyState.vue';
import type { ListItem } from '@/api/services/types/plans';
import { useAuthStore } from '@/stores/auth';
import { useShopStore } from '@/stores/shop';
import { buildRoute } from '@/router/utils';
import { Icons } from '@/types/icons';
import { DateUtil } from '@/utils/date';
import { buildShopList, isForStore, isNeededSoon, storeNames } from '@/utils/shop';
import { useToastMessages } from '@/composables/toast';

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

const { infoToast } = useToastMessages();

const storeMenu = ref<InstanceType<typeof Menu>>();
const itemMenu = ref<InstanceType<typeof Menu>>();
const menuItem = ref<ListItem | null>(null);

/** Where the item is bought, when it was chosen for this list (deviates from the default) */
function storeTag(item: ListItem): string | null {
    if (!item.storeOverride) return null;
    return storeNames(item.storeIds, shop.stores) ?? t('shop.item_store.any');
}

const itemMenuItems = computed<MenuItem[]>(() => {
    const item = menuItem.value;
    if (!item) return [];
    const choose = (override: boolean, storeId: string | null) => () => {
        void moveItem(item, override, storeId);
    };
    const isAny = item.storeOverride && item.storeIds.length === 0;
    return [
        {
            label: t('shop.item_store.title', { name: item.name }),
            items: [
                {
                    label: t('shop.item_store.default', {
                        stores:
                            storeNames(item.defaultStoreIds, shop.stores) ??
                            t('shop.item_store.none'),
                    }),
                    icon: item.storeOverride ? undefined : Icons.check,
                    command: choose(false, null),
                },
                ...shop.stores.map((store) => ({
                    label: store.name,
                    icon:
                        item.storeOverride && item.storeIds[0] === store.id
                            ? Icons.check
                            : undefined,
                    command: choose(true, store.id),
                })),
                {
                    label: t('shop.item_store.any'),
                    icon: isAny ? Icons.check : undefined,
                    command: choose(true, null),
                },
            ],
        },
    ];
});

function openItemMenu(event: Event, item: ListItem) {
    menuItem.value = item;
    itemMenu.value?.toggle(event);
}

async function moveItem(item: ListItem, override: boolean, storeId: string | null) {
    await shop.setItemStore(item, override, storeId);
    // Moved out of the store being shopped: say where it went, it leaves the list
    const moved = shop.plan?.items.find((i) => i.id === item.id);
    if (moved && !isForStore(moved, shop.storeId)) {
        infoToast(
            t('shop.item_store.moved', {
                name: item.name,
                store: storeNames(moved.storeIds, shop.stores) ?? t('shop.item_store.any'),
            }),
            '',
        );
    }
}
const storeLabel = computed(
    () => shop.stores.find((store) => store.id === shop.storeId)?.name ?? t('shop.all_stores'),
);
const storeMenuItems = computed<MenuItem[]>(() => [
    {
        label: t('shop.choose_store'),
        items: [{ id: null, name: t('shop.all_stores') }, ...shop.stores].map((store) => ({
            label: store.name,
            icon: store.id === shop.storeId ? Icons.check : undefined,
            command: () => {
                shop.setStoreFilter(store.id);
            },
        })),
    },
]);

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
            <!-- One slim bar: the list starts right below it -->
            <div class="toolbar">
                <span v-if="total" class="count" :aria-label="t('shop.progress', { done, total })">
                    {{ t('shop.progress_short', { done, total }) }}
                </span>
                <!-- The store filter lives behind the filter button, but stays visible when on -->
                <span v-if="shop.storeId" class="active-store">
                    <i :class="Icons.shop" />{{ storeLabel }}
                </span>
                <span class="spacer" />
                <Menu ref="storeMenu" :model="storeMenuItems" popup />
                <Menu ref="itemMenu" :model="itemMenuItems" popup class="item-menu" />
                <span
                    v-if="shop.queue.length || shop.isOffline"
                    v-tooltip.bottom="t('shop.status.offline_hint', { time: savedTime })"
                    class="status offline"
                    :aria-label="
                        shop.queue.length
                            ? t('shop.status.pending', shop.queue.length)
                            : t('shop.status.offline')
                    "
                >
                    <i :class="shop.queue.length ? Icons.refresh : Icons.wifiOff" />
                    <template v-if="shop.queue.length">{{ shop.queue.length }}</template>
                </span>
                <span
                    v-else-if="shop.isLive"
                    v-tooltip.bottom="t('shop.status.live_hint')"
                    class="status live"
                    :aria-label="t('shop.status.live')"
                >
                    <span class="dot" />
                </span>
                <button
                    v-if="shop.stores.length"
                    v-tooltip.left="t('shop.filter')"
                    type="button"
                    class="filter"
                    :class="{ active: shop.storeId }"
                    :aria-label="t('shop.filter')"
                    aria-haspopup="true"
                    @click="storeMenu?.toggle($event)"
                >
                    <!-- Filled while a store filter is on -->
                    <i :class="shop.storeId ? Icons.filterFill : Icons.filter" />
                </button>
                <div
                    v-if="total"
                    class="bar"
                    role="progressbar"
                    :aria-valuenow="done"
                    :aria-valuemax="total"
                >
                    <div class="fill" :style="{ width: `${(done / total) * 100}%` }" />
                </div>
            </div>

            <EmptyState
                v-if="total === 0"
                :icon="Icons.cart"
                :title="t('shop.empty.title')"
                :description="t('shop.empty.description')"
            />

            <template v-else>
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
                    <h3 class="label">
                        {{
                            (group.categoryId && categoryNames.get(group.categoryId)) ??
                            t('shop.uncategorised')
                        }}
                    </h3>
                    <ul class="items">
                        <li v-for="item in group.items" :key="item.id" class="row">
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
                                    <span v-if="item.note || storeTag(item)" class="note">
                                        <span v-if="storeTag(item)" class="store-tag">
                                            <i :class="Icons.shop" />{{ storeTag(item) }}
                                        </span>
                                        {{ item.note }}
                                    </span>
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
                            <button
                                type="button"
                                class="more"
                                :aria-label="t('shop.item_store.more', { name: item.name })"
                                aria-haspopup="true"
                                @click="openItemMenu($event, item)"
                            >
                                <i :class="Icons.ellipsis" />
                            </button>
                        </li>
                    </ul>
                </section>

                <section v-if="list.checked.length" class="group checked">
                    <h3 class="label">{{ t('shop.in_cart', list.checked.length) }}</h3>
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

// Sticky, so the store and the count stay in reach while scrolling the list
.toolbar {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    min-height: calc($touch-target + $spacing-sm + env(safe-area-inset-top));
    margin: (-$spacing-md) (-$spacing-md) $spacing-sm;
    padding: calc($spacing-xs + env(safe-area-inset-top)) $spacing-md $spacing-xs;
    background: $background-color;

    .active-store {
        display: inline-flex;
        align-items: center;
        gap: $spacing-xs;
        min-width: 0;
        color: $primary-color;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        i {
            font-size: $font-size-xs;
        }
    }

    .filter {
        display: grid;
        place-items: center;
        flex-shrink: 0;
        width: $touch-target;
        height: $touch-target;
        margin-right: -$spacing-sm;
        border: none;
        border-radius: $radius-full;
        background: none;
        color: $text-muted-color;
        font-size: $font-size-lg;
        cursor: pointer;

        &:active {
            background: $hover-color;
        }

        &.active {
            color: $primary-color;
        }

        i {
            font-size: inherit;
        }
    }

    .spacer {
        flex: 1;
    }

    .status {
        display: inline-flex;
        align-items: center;
        gap: $spacing-xs;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;

        &.offline {
            padding: $spacing-xxs $spacing-sm;
            border-radius: $radius-full;
            background: $saffron-surface-color;
            color: $on-saffron-surface-color;
        }

        .dot {
            width: 8px;
            height: 8px;
            border-radius: $radius-full;
            background: $herb-color;
        }
    }

    .count {
        color: $text-muted-color;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        font-variant-numeric: tabular-nums;
    }

    // The progress is the bottom edge of the bar
    .bar {
        position: absolute;
        inset: auto 0 0 0;
        height: 3px;
        background: $border-color;

        .fill {
            height: 100%;
            background: $herb-color;
            transition: width 0.3s ease;
        }
    }
}

.group {
    margin-bottom: $spacing-sm-md;

    .label {
        margin: 0 0 $spacing-xs $spacing-xs;
        color: $text-muted-color;
        font-family: inherit;
        font-size: $font-size-xs;
        font-weight: $font-weight-semibold;
        letter-spacing: 0.06em;
        text-transform: uppercase;
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

.row {
    display: flex;
    align-items: stretch;
}

// The ⋮ button: a full-height target at the end of the row, apart from the tick target
.more {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: $touch-target;
    border: none;
    background: none;
    color: $text-muted-color;
    cursor: pointer;

    &:active {
        background: $hover-color;
    }
}

.store-tag {
    display: inline-flex;
    align-items: center;
    gap: $spacing-xs;
    margin-right: $spacing-xs;
    color: $primary-color;
    font-weight: $font-weight-medium;

    i {
        font-size: $font-size-xs;
    }
}

// The whole row is the tap target: one thumb, no aiming
.item {
    display: flex;
    align-items: center;
    gap: $spacing-sm-md;
    width: 100%;
    min-height: 56px;
    padding: $spacing-xs $spacing-md;
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
            background: $saffron-surface-color;
            color: $on-saffron-surface-color;
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
