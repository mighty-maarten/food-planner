import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiCookieAuth,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiTooManyRequestsResponse,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ErrorResponse } from '../common/error-response.js';
import { AppConfigService } from '../config/app-config.service.js';
import { User } from '../users/types.js';
import { AuthService } from './auth.service.js';
import { Public } from './public.decorator.js';
import {
    AuthResponse,
    type AuthResult,
    type JwtPayload,
    LoginRequest,
    REFRESH_COOKIE_NAME,
    REFRESH_COOKIE_PATH,
} from './types.js';

@ApiTags('auth')
@ApiUnauthorizedResponse({ type: ErrorResponse })
@Controller()
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: AppConfigService,
    ) {}

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @UseGuards(ThrottlerGuard)
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @ApiOperation({ summary: 'Login with email and password, sets the refresh cookie' })
    @ApiOkResponse({ type: AuthResponse })
    @ApiTooManyRequestsResponse({ type: ErrorResponse })
    public async login(
        @Body() loginRequest: LoginRequest,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AuthResponse> {
        const result = await this.authService.login(
            loginRequest.email,
            loginRequest.password,
            req.get('user-agent') ?? null,
        );
        return this.respond(result, res);
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @UseGuards(ThrottlerGuard)
    @Throttle({ default: { limit: 60, ttl: 60_000 } })
    @ApiCookieAuth(REFRESH_COOKIE_NAME)
    @ApiOperation({ summary: 'Get a new access token with the refresh cookie' })
    @ApiOkResponse({ type: AuthResponse })
    @ApiTooManyRequestsResponse({ type: ErrorResponse })
    public async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AuthResponse> {
        const token = AuthController.getRefreshToken(req);
        if (!token) {
            throw new UnauthorizedException('No session');
        }
        try {
            return this.respond(await this.authService.refresh(token), res);
        } catch (error) {
            this.clearCookie(res);
            throw error;
        }
    }

    @Public()
    @Post('logout')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'End the session of this device' })
    @ApiNoContentResponse()
    public async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<void> {
        await this.authService.logout(AuthController.getRefreshToken(req));
        this.clearCookie(res);
    }

    @Get('current-user')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user information' })
    @ApiOkResponse({ type: User })
    public getCurrentUser(@Req() req: Request): User {
        const user = req.user as JwtPayload;
        return new User({ id: user.sub, email: user.email, name: user.name });
    }

    private respond(result: AuthResult, res: Response): AuthResponse {
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
            ...this.cookieOptions(),
            expires: result.refreshExpiresAt,
        });
        return result.response;
    }

    private clearCookie(res: Response): void {
        res.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions());
    }

    private cookieOptions() {
        return {
            httpOnly: true,
            secure: this.configService.get('COOKIE_SECURE'),
            sameSite: 'strict' as const,
            path: REFRESH_COOKIE_PATH,
        };
    }

    private static getRefreshToken(req: Request): string | undefined {
        const cookies = req.cookies as Record<string, string | undefined>;
        return cookies[REFRESH_COOKIE_NAME] ?? undefined;
    }
}
