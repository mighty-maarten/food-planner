<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button, ConfirmDialog, Menu, Toast } from 'primevue';
import type { MenuItem } from 'primevue/menuitem';
import { useOnline } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { Icons } from '@/types/icons';
import { buildRoute, type Routes } from '@/router/utils';
import OfflineBanner from '@/components/OfflineBanner.vue';
// Served from public/, also the source of the generated PWA icons
const logoUrl = '/logo.svg';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();
const isOnline = useOnline();

const navItems = computed<{ route: Routes; label: string; icon: string }[]>(() => [
    { route: 'common_plan', label: t('nav.plan'), icon: Icons.calendar },
    { route: 'common_shop', label: t('nav.shop'), icon: Icons.cart },
    { route: 'common_dishes', label: t('nav.dishes'), icon: Icons.book },
]);

const pageTitle = computed(() => (route.meta.title ? t(route.meta.title) : t('app.name')));
const initials = computed(() => authStore.currentUser?.name.slice(0, 1).toUpperCase() ?? '?');

const userMenu = ref<InstanceType<typeof Menu>>();
const userMenuItems = computed<MenuItem[]>(() => [
    {
        label: authStore.currentUser?.name,
        items: [{ label: t('auth.logout'), icon: Icons.logout, command: () => void logout() }],
    },
]);

// Leave the offline session as soon as the API can be reached again
watch(isOnline, (online) => {
    if (online && authStore.isOfflineSession) {
        void authStore.refreshAccessToken();
    }
});

async function logout() {
    await authStore.logout();
    await router.push(buildRoute('auth_login'));
}
</script>

<template>
    <Toast position="top-center" />
    <ConfirmDialog />
    <div class="app-shell">
        <aside class="sidebar">
            <div class="brand">
                <img :src="logoUrl" alt="" />
                <span>{{ t('app.name') }}</span>
            </div>
            <nav class="nav">
                <RouterLink
                    v-for="item in navItems"
                    :key="item.route"
                    :to="buildRoute(item.route)"
                    class="nav-item"
                    active-class="active"
                >
                    <i :class="item.icon" />
                    {{ item.label }}
                </RouterLink>
            </nav>
            <div class="sidebar-footer">
                <span class="avatar">{{ initials }}</span>
                <span class="user-name">{{ authStore.currentUser?.name }}</span>
                <Button
                    v-tooltip.top="t('auth.logout')"
                    :icon="Icons.logout"
                    :aria-label="t('auth.logout')"
                    text
                    rounded
                    severity="secondary"
                    @click="logout"
                />
            </div>
        </aside>

        <div class="main">
            <OfflineBanner />
            <header class="top-bar">
                <h1>{{ pageTitle }}</h1>
                <button
                    class="avatar"
                    type="button"
                    :aria-label="t('auth.account')"
                    @click="userMenu?.toggle($event)"
                >
                    {{ initials }}
                </button>
                <Menu ref="userMenu" :model="userMenuItems" popup />
            </header>
            <div class="page-view">
                <slot>
                    <RouterView />
                </slot>
            </div>
        </div>

        <nav class="bottom-nav">
            <RouterLink
                v-for="item in navItems"
                :key="item.route"
                :to="buildRoute(item.route)"
                class="bottom-nav-item"
                active-class="active"
            >
                <i :class="item.icon" />
                <span>{{ item.label }}</span>
            </RouterLink>
        </nav>
    </div>
</template>

<style scoped lang="scss">
.app-shell {
    display: flex;
    width: 100%;
    min-height: 100dvh;
}

.avatar {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: $radius-full;
    background: var(--p-primary-100);
    color: var(--p-primary-800);
    font: inherit;
    font-weight: $font-weight-semibold;

    @media (prefers-color-scheme: dark) {
        background: var(--p-primary-900);
        color: var(--p-primary-100);
    }
}

// Desktop: sidebar navigation
.sidebar {
    display: none;
    flex-direction: column;
    gap: $spacing-xl;
    position: sticky;
    top: 0;
    width: $sidebar-width;
    height: 100dvh;
    flex-shrink: 0;
    padding: $spacing-lg $spacing-md;
    background: $card-color;
    border-right: 1px solid $border-color;

    @include minb($breakpoint-lg) {
        display: flex;
    }

    .brand {
        display: flex;
        align-items: center;
        gap: $spacing-sm-md;
        padding-left: $spacing-xs;
        font-family: $font-family-heading;
        font-size: $font-size-lg;
        font-weight: $font-weight-semibold;

        img {
            width: 36px;
            height: 36px;
        }
    }

    .nav {
        display: flex;
        flex-direction: column;
        gap: $spacing-xs;
    }

    .nav-item {
        display: flex;
        align-items: center;
        gap: $spacing-sm-md;
        min-height: 44px;
        padding: 0 $spacing-sm-md;
        border-radius: $radius-lg;
        color: $text-color;
        font-weight: $font-weight-medium;
        text-decoration: none;

        &:hover {
            background: $hover-color;
        }

        &.active {
            background: var(--p-primary-50);
            color: var(--p-primary-700);

            @media (prefers-color-scheme: dark) {
                background: var(--p-primary-950);
                color: var(--p-primary-300);
            }
        }
    }

    .sidebar-footer {
        margin-top: auto;
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        padding-top: $spacing-md;
        border-top: 1px solid $border-color;

        .user-name {
            flex: 1;
            font-size: $font-size-sm;
            @include ellipsis;
        }
    }
}

.main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    // Room for the bottom navigation on mobile
    padding-bottom: calc($bottom-nav-height + env(safe-area-inset-bottom));

    @include minb($breakpoint-lg) {
        padding-bottom: 0;
    }
}

// Mobile: top bar with page title and account menu
.top-bar {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-md;
    padding: calc($spacing-sm-md + env(safe-area-inset-top)) $spacing-md $spacing-sm-md;
    background: $background-color;

    h1 {
        font-size: $font-size-xl;
    }

    @include minb($breakpoint-lg) {
        display: none;
    }
}

.page-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.bottom-nav {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 3;
    display: flex;
    padding-bottom: env(safe-area-inset-bottom);
    background: $card-color;
    border-top: 1px solid $border-color;

    @include minb($breakpoint-lg) {
        display: none;
    }

    .bottom-nav-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: $spacing-xxs;
        height: $bottom-nav-height;
        color: $text-muted-color;
        font-size: $font-size-xs;
        font-weight: $font-weight-medium;
        text-decoration: none;

        i {
            font-size: $font-size-lg;
        }

        &.active {
            color: $primary-color;
        }
    }
}
</style>
