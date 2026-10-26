import { createRouter, createWebHistory } from 'vue-router';
import { commonRoutes } from './routes/common';
import { authRoutes } from './routes/auth';
import { useAuthStore } from '@/stores/auth';
import { i18n } from '@/plugins/i18n';
import { buildRoute, defaultRedirectRoute } from './utils';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [...commonRoutes, ...authRoutes],
});

router.beforeEach(async (to) => {
    const authStore = useAuthStore();
    // Restores the session from the refresh cookie (or the cached user when offline)
    await authStore.initialize();

    if (to.name === 'auth_login' && authStore.isAuthenticated) {
        return defaultRedirectRoute;
    }
    if (!to.meta.public && !authStore.isAuthenticated) {
        return buildRoute('auth_login');
    }
    return true;
});

router.afterEach((to) => {
    const appName = i18n.t('app.name');
    const title = typeof to.meta.title === 'string' ? to.meta.title : undefined;
    document.title = title ? `${i18n.t(title)} · ${appName}` : appName;
});

export default router;
