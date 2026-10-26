import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

// Every route needs a valid access token (global JwtAuthGuard) unless it is marked @Public().
export const Public = () => SetMetadata(IS_PUBLIC, true);
