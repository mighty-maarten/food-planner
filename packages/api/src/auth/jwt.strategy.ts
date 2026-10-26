import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../config/app-config.service.js';
import { JwtPayload } from './types.js';
import { AuthService } from './auth.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: AppConfigService,
        private authService: AuthService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET'),
        });
    }

    async validate(payload: JwtPayload): Promise<JwtPayload> {
        if (!payload.sub || !payload.email || !payload.name) {
            throw new UnauthorizedException();
        }

        try {
            const userValid = await this.authService.validateUser(payload.sub);
            if (userValid) {
                return payload;
            } else {
                throw new UnauthorizedException('User is not valid');
            }
        } catch {
            throw new UnauthorizedException('User is not valid');
        }
    }
}
