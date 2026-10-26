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
import { CategoriesService } from './categories.service.js';
import { Category, CategoryOrderRequest, CategoryRequest } from './types.js';

@ApiTags('categories')
@ApiBearerAuth()
@Controller()
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Get()
    @ApiOperation({ summary: 'All categories in their default order' })
    @ApiOkResponse({ type: [Category] })
    getCategories(): Promise<Category[]> {
        return this.categoriesService.getCategories();
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: Category })
    @ApiConflictResponse({ type: ErrorResponse })
    createCategory(@Body() request: CategoryRequest): Promise<Category> {
        return this.categoriesService.createCategory(request);
    }

    // Before the `:categoryId` routes, so `order` is not taken for an id
    @Put('order')
    @ApiOperation({ summary: 'Change the default order of the categories' })
    @ApiOkResponse({ type: [Category] })
    reorderCategories(@Body() request: CategoryOrderRequest): Promise<Category[]> {
        return this.categoriesService.reorderCategories(request.categoryIds);
    }

    @Put(`:${routeParams.categoryId}`)
    @ApiOkResponse({ type: Category })
    @ApiNotFoundResponse({ type: ErrorResponse })
    @ApiConflictResponse({ type: ErrorResponse })
    updateCategory(
        @Param(routeParams.categoryId, ParseUUIDPipe) categoryId: string,
        @Body() request: CategoryRequest,
    ): Promise<Category> {
        return this.categoriesService.updateCategory(categoryId, request);
    }

    @Delete(`:${routeParams.categoryId}`)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a category, its ingredients become uncategorised' })
    @ApiNoContentResponse()
    @ApiNotFoundResponse({ type: ErrorResponse })
    deleteCategory(
        @Param(routeParams.categoryId, ParseUUIDPipe) categoryId: string,
    ): Promise<void> {
        return this.categoriesService.deleteCategory(categoryId);
    }
}
