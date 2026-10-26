import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiConflictResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { CategoryOrderRequest } from '../categories/types.js';
import { ErrorResponse } from '../common/error-response.js';
import { routeParams } from '../route-params.js';
import { StoresService } from './stores.service.js';
import { Store, StoreRequest } from './types.js';

@ApiTags('stores')
@ApiBearerAuth()
@Controller()
export class StoresController {
    constructor(private readonly storesService: StoresService) {}

    @Get()
    @ApiOkResponse({ type: [Store] })
    getStores(): Promise<Store[]> {
        return this.storesService.getStores();
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: Store })
    @ApiConflictResponse({ type: ErrorResponse })
    createStore(@Body() request: StoreRequest): Promise<Store> {
        return this.storesService.createStore(request);
    }

    @Put(`:${routeParams.storeId}`)
    @ApiOkResponse({ type: Store })
    @ApiNotFoundResponse({ type: ErrorResponse })
    @ApiConflictResponse({ type: ErrorResponse })
    updateStore(
        @Param(routeParams.storeId, ParseUUIDPipe) storeId: string,
        @Body() request: StoreRequest,
    ): Promise<Store> {
        return this.storesService.updateStore(storeId, request);
    }

    @Put(`:${routeParams.storeId}/category-order`)
    @ApiOperation({ summary: 'Set the order of the categories on the route through the store' })
    @ApiOkResponse({ type: Store })
    @ApiNotFoundResponse({ type: ErrorResponse })
    updateStoreCategoryOrder(
        @Param(routeParams.storeId, ParseUUIDPipe) storeId: string,
        @Body() request: CategoryOrderRequest,
    ): Promise<Store> {
        return this.storesService.updateStoreCategoryOrder(storeId, request.categoryIds);
    }

    @Delete(`:${routeParams.storeId}`)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse()
    @ApiNotFoundResponse({ type: ErrorResponse })
    deleteStore(@Param(routeParams.storeId, ParseUUIDPipe) storeId: string): Promise<void> {
        return this.storesService.deleteStore(storeId);
    }
}
