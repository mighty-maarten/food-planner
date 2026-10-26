import { Module } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './jwt.strategy.js';
import { SessionsService } from './sessions.service.js';
import { UsersModule } from '../users/users.module.js';
import { AppConfigModule } from '../config/app-config.module.js';
import { AppConfigService } from '../config/app-config.service.js';
import { SessionEntity } from '../database/entities/session.entity.js';

@Module({
    imports: [
        UsersModule,
        PassportModule,
        AppConfigModule,
        TypeOrmModule.forFeature([SessionEntity]),
        // Limits are set per route with @Throttle
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
        JwtModule.registerAsync({
            imports: [AppConfigModule],
            inject: [AppConfigService],
            useFactory: (configService: AppConfigService): JwtModuleOptions => ({
                secret: configService.get('JWT_SECRET'),
                signOptions: {
                    // Values like '15m' or '1h' (format validated by the config schema)
                    expiresIn: configService.get(
                        'JWT_EXPIRES_IN',
                    ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, SessionsService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule {}
