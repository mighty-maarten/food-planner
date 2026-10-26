import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { User } from '../users/types.js';

export const REFRESH_COOKIE_NAME = 'fp_refresh';
export const REFRESH_COOKIE_PATH = '/api/auth';

export class LoginRequest {
    @ApiProperty()
    @IsEmail()
    @IsNotEmpty()
    public email!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    public password!: string;
}

export class AuthResponse {
    @ApiProperty()
    public accessToken: string;

    @ApiProperty({ type: User })
    public user: User;

    constructor(accessToken: string, user: User) {
        this.accessToken = accessToken;
        this.user = user;
    }
}

export interface JwtPayload {
    sub: string;
    email: string;
    name: string;
}

/** Result of a login or refresh: the response body plus the refresh token for the cookie */
export interface AuthResult {
    response: AuthResponse;
    refreshToken: string;
    refreshExpiresAt: Date;
}
