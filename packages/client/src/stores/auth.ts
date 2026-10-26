import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useStoreCreationUtils } from './util';
import { AuthApi } from '@/api/services/auth-api';
import { HttpClient } from '@/api/http-client';
import type { AuthResponse, LoginRequest, User } from '@/api/services/types/auth';
import { ShopCache } from '@/offline/shop-cache';

// The user (not the token) is cached so the installed app can start without a connection
const USER_STORAGE_KEY = 'fp_user';

function readCachedUser(): User | null {
    try {
        const raw = localStorage.getItem(USER_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as User) : null;
    } catch {
        return null;
    }
}

export const useAuthStore = defineStore('auth', () => {
    const { base, handleAction } = useStoreCreationUtils({
        actions: ['login', 'logout'],
    });

    // The access token only lives in memory, the long-lived session is an httpOnly cookie
    const accessToken = ref<string | null>(null);
    const currentUser = ref<User | null>(null);
    // Started without reaching the API, running on the cached user until the connection returns
    const isOfflineSession = ref(false);
    const isInitialized = ref(false);

    const isAuthenticated = computed(() => !!currentUser.value);

    let initializing: Promise<void> | null = null;
    let refreshing: Promise<boolean> | null = null;

    function applyAuthResponse(response: AuthResponse): void {
        accessToken.value = response.accessToken;
        currentUser.value = response.user;
        isOfflineSession.value = false;
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
    }

    function clearSession(): void {
        accessToken.value = null;
        currentUser.value = null;
        isOfflineSession.value = false;
        localStorage.removeItem(USER_STORAGE_KEY);
    }

    /**
     * Gets a new access token with the refresh cookie. Concurrent callers share one request.
     * Returns false when the session is gone; network errors keep the current state.
     */
    function refreshAccessToken(): Promise<boolean> {
        refreshing ??= (async () => {
            try {
                applyAuthResponse(await AuthApi.refresh());
                return true;
            } catch (error) {
                if (HttpClient.isNetworkError(error) && currentUser.value) {
                    isOfflineSession.value = true;
                }
                return false;
            } finally {
                refreshing = null;
            }
        })();
        return refreshing;
    }

    /** Restores the session on app start, once */
    function initialize(): Promise<void> {
        initializing ??= (async () => {
            try {
                applyAuthResponse(await AuthApi.refresh());
            } catch (error) {
                const cachedUser = readCachedUser();
                if (HttpClient.isNetworkError(error) && cachedUser) {
                    currentUser.value = cachedUser;
                    isOfflineSession.value = true;
                } else {
                    clearSession();
                }
            } finally {
                isInitialized.value = true;
            }
        })();
        return initializing;
    }

    async function login(credentials: LoginRequest): Promise<void> {
        await handleAction('login', undefined, async () => {
            applyAuthResponse(await AuthApi.login(credentials));
        });
    }

    async function logout(): Promise<void> {
        await handleAction('logout', undefined, async () => {
            try {
                await AuthApi.logout();
            } finally {
                clearSession();
                // The cached shopping list and unsent ticks belong to this session
                await ShopCache.clear();
            }
        });
    }

    return {
        ...base,
        accessToken,
        currentUser,
        isAuthenticated,
        isOfflineSession,
        isInitialized,
        initialize,
        refreshAccessToken,
        clearSession,
        login,
        logout,
    };
});
