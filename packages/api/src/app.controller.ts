import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './auth/public.decorator.js';

const HEALTH_CHECK_ENDPOINT = 'status';
export const HEALTH_CHECK_PATH = `/${HEALTH_CHECK_ENDPOINT}`;

@ApiTags('health')
@Controller()
export class AppController {
    @Public()
    @Get(HEALTH_CHECK_ENDPOINT)
    @ApiOperation({ operationId: 'getStatus', summary: 'Health check, no authentication' })
    @ApiOkResponse({ schema: { type: 'object', properties: { status: { example: 'ok' } } } })
    public getStatus() {
        return { status: 'ok' };
    }
}
