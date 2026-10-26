import type { ApiErrorCode, ErrorResponse } from '@/api/services/types/api';
import { getApiErrorCode } from '@/api/errors';
import { HttpClient } from '@/api/http-client';
import { i18n } from '@/plugins/i18n';
import type { BaseStore } from '@/stores/util';
import { AxiosError } from 'axios';
import { useToast } from 'primevue';

export function useToastMessages() {
    const toast = useToast();

    const ttl = 3000;

    function sendToast(
        severity: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast',
        title: string,
        description: string,
        life: number | undefined,
    ) {
        toast.add({
            severity,
            summary: title,
            detail: description,
            life,
        });
    }

    function infoToast(title: string, description: string) {
        sendToast('info', title, description, ttl);
    }

    function successToast(title: string, description: string) {
        sendToast('success', title, description, ttl);
    }

    function errorToast(title: string, description: string) {
        sendToast('error', title, description, undefined);
    }

    function warnToast(title: string, description: string) {
        sendToast('warn', title, description, ttl);
    }

    function storeActionToast<A extends string>(
        store: BaseStore<A>,
        action: A,
        success:
            | {
                  title: string;
                  description: string;
              }
            | undefined,
        error:
            | {
                  title: string;
                  description: string;
              }
            | undefined,
    ) {
        const errObj = store.getError(action);
        if (errObj) {
            let requestId: string | undefined = undefined;
            if (errObj instanceof AxiosError) {
                const data = errObj.response?.data as ErrorResponse | undefined;
                requestId = data?.error.requestId;
            }
            if (error)
                errorToast(
                    error.title,
                    requestId
                        ? `${error.description}\n(Request ID: ${requestId})`
                        : error.description,
                );
        } else {
            if (success) successToast(success.title, success.description);
        }
    }

    /**
     * Error toast for a failed API call: a specific message for expected error codes (e.g. a
     * CONFLICT on a duplicate name), otherwise a generic one.
     */
    function apiErrorToast(error: unknown, messages: Partial<Record<ApiErrorCode, string>> = {}) {
        const code = getApiErrorCode(error);
        const description =
            (code && messages[code]) ??
            (HttpClient.isNetworkError(error)
                ? i18n.t('common.error.offline')
                : i18n.t('common.error.description'));
        errorToast(i18n.t('common.error.title'), description);
    }

    return {
        apiErrorToast,
        infoToast,
        successToast,
        errorToast,
        warnToast,
        storeActionToast,
    };
}
