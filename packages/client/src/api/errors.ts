import axios from 'axios';
import type { ApiErrorCode, ErrorResponse } from './services/types/api';

/** The error code of a failed API call, undefined for network and unexpected errors */
export function getApiErrorCode(error: unknown): ApiErrorCode | undefined {
    if (!axios.isAxiosError(error)) return undefined;
    const data = error.response?.data as Partial<ErrorResponse> | undefined;
    return data?.error?.code;
}

/** The `details` of a failed API call, e.g. the dishes using an ingredient on a CONFLICT */
export function getApiErrorDetails(error: unknown): Record<string, unknown> | undefined {
    if (!axios.isAxiosError(error)) return undefined;
    const data = error.response?.data as Partial<ErrorResponse> | undefined;
    return data?.error?.details;
}
