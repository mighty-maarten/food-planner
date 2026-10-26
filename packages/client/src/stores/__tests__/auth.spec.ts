import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AxiosError, AxiosHeaders } from 'axios';
import { useAuthStore } from '@/stores/auth';
import { AuthApi } from '@/api/services/auth-api';

vi.mock('@/api/services/auth-api', () => ({
    AuthApi: {
        login: vi.fn(),
        refresh: vi.fn(),
        logout: vi.fn(),
        getCurrentUser: vi.fn(),
    },
}));

vi.mock('@/composables/toast', () => ({
    useToastMessages: () => ({}),
}));

const user = { id: 'user-1', email: 'jane@example.com', name: 'Jane' };
const authResponse = { accessToken: 'token-123', user };

const networkError = () => new AxiosError('Network Error', AxiosError.ERR_NETWORK);
const unauthorizedError = () =>
    new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, undefined, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        data: {},
        headers: {},
        config: { headers: new AxiosHeaders() },
    });

describe('auth store', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
        vi.mocked(AuthApi.login).mockReset();
        vi.mocked(AuthApi.refresh).mockReset();
        vi.mocked(AuthApi.logout).mockReset();
    });

    it('keeps the token in memory and caches only the user after login', async () => {
        vi.mocked(AuthApi.login).mockResolvedValue(authResponse);
        const store = useAuthStore();

        await store.login({ email: 'jane@example.com', password: 'secret' });

        expect(store.isAuthenticated).toBe(true);
        expect(store.accessToken).toBe('token-123');
        expect(JSON.parse(localStorage.getItem('fp_user') ?? 'null')).toEqual(user);
        expect(JSON.stringify(localStorage)).not.toContain('token-123');
    });

    it('keeps the user logged out when login fails', async () => {
        vi.mocked(AuthApi.login).mockRejectedValue(unauthorizedError());
        const store = useAuthStore();

        await store.login({ email: 'jane@example.com', password: 'wrong' });

        expect(store.isAuthenticated).toBe(false);
        expect(store.hasError('login')).toBe(true);
    });

    it('restores the session from the refresh cookie on start', async () => {
        vi.mocked(AuthApi.refresh).mockResolvedValue(authResponse);
        const store = useAuthStore();

        await store.initialize();

        expect(store.isAuthenticated).toBe(true);
        expect(store.isOfflineSession).toBe(false);
    });

    it('starts offline with the cached user when the API is unreachable', async () => {
        localStorage.setItem('fp_user', JSON.stringify(user));
        vi.mocked(AuthApi.refresh).mockRejectedValue(networkError());
        const store = useAuthStore();

        await store.initialize();

        expect(store.isAuthenticated).toBe(true);
        expect(store.isOfflineSession).toBe(true);
        expect(store.accessToken).toBeNull();
    });

    it('logs out when the session has expired', async () => {
        localStorage.setItem('fp_user', JSON.stringify(user));
        vi.mocked(AuthApi.refresh).mockRejectedValue(unauthorizedError());
        const store = useAuthStore();

        await store.initialize();

        expect(store.isAuthenticated).toBe(false);
        expect(localStorage.getItem('fp_user')).toBeNull();
    });

    it('shares one refresh request between concurrent callers', async () => {
        vi.mocked(AuthApi.refresh).mockResolvedValue(authResponse);
        const store = useAuthStore();

        const results = await Promise.all([store.refreshAccessToken(), store.refreshAccessToken()]);

        expect(results).toEqual([true, true]);
        expect(AuthApi.refresh).toHaveBeenCalledTimes(1);
    });

    it('clears the session on logout, even if the API call fails', async () => {
        vi.mocked(AuthApi.login).mockResolvedValue(authResponse);
        vi.mocked(AuthApi.logout).mockRejectedValue(networkError());
        const store = useAuthStore();
        await store.login({ email: 'jane@example.com', password: 'secret' });

        await store.logout();

        expect(store.isAuthenticated).toBe(false);
        expect(store.accessToken).toBeNull();
        expect(localStorage.getItem('fp_user')).toBeNull();
    });
});
