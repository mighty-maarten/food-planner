import { type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC } from './public.decorator.js';

// Registered globally (APP_GUARD): every route needs a valid access token, except routes marked
// @Public(). Guards only run for matched routes, so an unknown route still returns 404.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly reflector: Reflector) {
        super();
    }

    override canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, [
            context.getHandler(),
            context.getClass(),
        ]);
        return isPublic ? true : super.canActivate(context);
    }
}
