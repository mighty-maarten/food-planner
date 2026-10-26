import { AppConfig } from '@/app.config';
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
// Circular imports (store and router use the API), safe because they are only used inside functions
import { useAuthStore } from '@/stores/auth';
import router from '@/router';

// Auth endpoints handle their own 401s, everything else gets one silent refresh and retry
const AUTH_URL_PATTERN = /^\/auth\/(login|refresh|logout)$/;

type RetriableRequest = InternalAxiosRequestConfig & { _retried?: boolean };

export class HttpClient {
    private static instance: AxiosInstance | undefined;

    public static async get<TResp>(
        url: string,
        searchParameters?: URLSearchParams,
    ): Promise<TResp> {
        const response = await this.client().get<TResp>(url, { params: searchParameters });
        return response.data;
    }

    public static async post<TResp = unknown>(
        url: string,
        payload?: unknown,
        searchParameters?: URLSearchParams,
    ): Promise<TResp> {
        const response = await this.client().post<TResp>(url, payload, {
            params: searchParameters,
        });
        return response.data;
    }

    public static async put<TResp = unknown>(
        url: string,
        payload: unknown,
        searchParameters?: URLSearchParams,
    ): Promise<TResp> {
        const response = await this.client().put<TResp>(url, payload, {
            params: searchParameters,
        });
        return response.data;
    }

    public static async patch<TResp = unknown>(
        url: string,
        payload: unknown,
        searchParameters?: URLSearchParams,
    ): Promise<TResp> {
        const response = await this.client().patch<TResp>(url, payload, {
            params: searchParameters,
        });
        return response.data;
    }

    public static async delete<TResp = unknown>(
        url: string,
        searchParameters?: URLSearchParams,
    ): Promise<TResp> {
        const response = await this.client().delete<TResp>(url, { params: searchParameters });
        return response.data;
    }

    /** True when the request never reached the API (offline, server down) */
    public static isNetworkError(error: unknown): boolean {
        return axios.isAxiosError(error) && !error.response;
    }

    public static isUnauthorized(error: unknown): boolean {
        return axios.isAxiosError(error) && error.response?.status === 401;
    }

    private static client(): AxiosInstance {
        if (this.instance) return this.instance;

        const instance = axios.create({
            baseURL: AppConfig.apiUrl,
            headers: { Accept: 'application/json' },
        });

        instance.interceptors.request.use((config) => {
            const token = useAuthStore().accessToken;
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        instance.interceptors.response.use(
            (response) => response,
            async (error: unknown) => {
                const request = axios.isAxiosError(error)
                    ? (error.config as RetriableRequest | undefined)
                    : undefined;
                if (
                    !this.isUnauthorized(error) ||
                    !request ||
                    request._retried ||
                    AUTH_URL_PATTERN.test(request.url ?? '')
                ) {
                    throw error;
                }

                const authStore = useAuthStore();
                if (await authStore.refreshAccessToken()) {
                    request._retried = true;
                    return instance(request);
                }

                authStore.clearSession();
                await router.push({ name: 'auth_login' });
                throw error;
            },
        );

        this.instance = instance;
        return instance;
    }
}
