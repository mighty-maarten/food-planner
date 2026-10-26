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
    ApiBadRequestResponse,
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
import { IngredientsService } from './ingredients.service.js';
import { Ingredient, IngredientRequest } from './types.js';

@ApiTags('ingredients')
@ApiBearerAuth()
@Controller()
export class IngredientsController {
    constructor(private readonly ingredientsService: IngredientsService) {}

    @Get()
    @ApiOperation({ summary: 'The whole ingredient catalogue, sorted by name' })
    @ApiOkResponse({ type: [Ingredient] })
    getIngredients(): Promise<Ingredient[]> {
        return this.ingredientsService.getIngredients();
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: Ingredient })
    @ApiBadRequestResponse({ type: ErrorResponse })
    @ApiConflictResponse({ type: ErrorResponse })
    createIngredient(@Body() request: IngredientRequest): Promise<Ingredient> {
        return this.ingredientsService.createIngredient(request);
    }

    @Put(`:${routeParams.ingredientId}`)
    @ApiOkResponse({ type: Ingredient })
    @ApiBadRequestResponse({ type: ErrorResponse })
    @ApiNotFoundResponse({ type: ErrorResponse })
    @ApiConflictResponse({ type: ErrorResponse })
    updateIngredient(
        @Param(routeParams.ingredientId, ParseUUIDPipe) ingredientId: string,
        @Body() request: IngredientRequest,
    ): Promise<Ingredient> {
        return this.ingredientsService.updateIngredient(ingredientId, request);
    }

    @Delete(`:${routeParams.ingredientId}`)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Delete an ingredient',
        description:
            'Fails with CONFLICT while dishes use it; `details.dishes` lists them ({ id, name }).',
    })
    @ApiNoContentResponse()
    @ApiNotFoundResponse({ type: ErrorResponse })
    @ApiConflictResponse({ type: ErrorResponse })
    deleteIngredient(
        @Param(routeParams.ingredientId, ParseUUIDPipe) ingredientId: string,
    ): Promise<void> {
        return this.ingredientsService.deleteIngredient(ingredientId);
    }
}
