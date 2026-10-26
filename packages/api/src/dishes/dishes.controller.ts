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
import { ErrorResponse } from '../common/error-response.js';
import { routeParams } from '../route-params.js';
import { DishesService } from './dishes.service.js';
import { Dish, DishListItem, DishRequest } from './types.js';

@ApiTags('dishes')
@ApiBearerAuth()
@Controller()
export class DishesController {
    constructor(private readonly dishesService: DishesService) {}

    @Get()
    @ApiOperation({ summary: 'All dishes sorted by name, without the recipe texts' })
    @ApiOkResponse({ type: [DishListItem] })
    getDishes(): Promise<DishListItem[]> {
        return this.dishesService.getDishes();
    }

    @Get(`:${routeParams.dishId}`)
    @ApiOkResponse({ type: Dish })
    @ApiNotFoundResponse({ type: ErrorResponse })
    getDish(@Param(routeParams.dishId, ParseUUIDPipe) dishId: string): Promise<Dish> {
        return this.dishesService.getDish(dishId);
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Create a dish, new ingredient names are added to the catalogue' })
    @ApiOkResponse({ type: Dish })
    @ApiConflictResponse({ type: ErrorResponse })
    createDish(@Body() request: DishRequest): Promise<Dish> {
        return this.dishesService.createDish(request);
    }

    @Put(`:${routeParams.dishId}`)
    @ApiOperation({
        summary: 'Replace a dish and its ingredient lines',
        description: 'New ingredient names are added to the catalogue.',
    })
    @ApiOkResponse({ type: Dish })
    @ApiNotFoundResponse({ type: ErrorResponse })
    @ApiConflictResponse({ type: ErrorResponse })
    updateDish(
        @Param(routeParams.dishId, ParseUUIDPipe) dishId: string,
        @Body() request: DishRequest,
    ): Promise<Dish> {
        return this.dishesService.updateDish(dishId, request);
    }

    @Delete(`:${routeParams.dishId}`)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse()
    @ApiNotFoundResponse({ type: ErrorResponse })
    deleteDish(@Param(routeParams.dishId, ParseUUIDPipe) dishId: string): Promise<void> {
        return this.dishesService.deleteDish(dishId);
    }
}
