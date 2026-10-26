import { HttpClient } from '@/api/http-client';
import type { AuthResponse, LoginRequest, User } from './types/auth';

class ApiUrls {
    public static auth = '/auth';
}

export class AuthApi {
    public static async login(credentials: LoginRequest): Promise<AuthResponse> {
        return HttpClient.post<AuthResponse>(`${ApiUrls.auth}/login`, credentials);
    }

    /** Uses the httpOnly refresh cookie to get a new access token */
    public static async refresh(): Promise<AuthResponse> {
        return HttpClient.post<AuthResponse>(`${ApiUrls.auth}/refresh`);
    }

    public static async logout(): Promise<void> {
        await HttpClient.post(`${ApiUrls.auth}/logout`);
    }

    public static async getCurrentUser(): Promise<User> {
        return HttpClient.get<User>(`${ApiUrls.auth}/current-user`);
    }
}
