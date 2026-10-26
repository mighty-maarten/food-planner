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
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { ErrorResponse } from '../common/error-response.js';
import { ParseIsoDatePipe } from '../common/parse-date.pipe.js';
import { routeParams } from '../route-params.js';
import { PlansService } from './plans.service.js';
import {
    CarryOverCandidates,
    CarryOverRequest,
    ListItemRequest,
    ListItemUpdateRequest,
    Plan,
    PlanDayIngredientsRequest,
    PlanDayRequest,
    PlanRequest,
    PlanSummary,
} from './types.js';

const PLAN = `:${routeParams.planId}`;
const DAY = `${PLAN}/days/:${routeParams.date}`;
const ITEM = `${PLAN}/items/:${routeParams.itemId}`;

// Every change returns the whole plan: days, dishes and the shopping list stay consistent in
// the client with one response.
@ApiTags('plans')
@ApiBearerAuth()
@ApiNotFoundResponse({ type: ErrorResponse })
@ApiBadRequestResponse({ type: ErrorResponse })
@Controller()
export class PlansController {
    constructor(private readonly plansService: PlansService) {}

    @Get()
    @ApiOperation({ summary: 'All plans, newest first' })
    @ApiOkResponse({ type: [PlanSummary] })
    getPlans(): Promise<PlanSummary[]> {
        return this.plansService.getPlans();
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Create a plan', description: 'CONFLICT when the dates overlap.' })
    @ApiOkResponse({ type: Plan })
    @ApiConflictResponse({ type: ErrorResponse })
    createPlan(@Body() request: PlanRequest, @CurrentUserId() userId: string): Promise<Plan> {
        return this.plansService.createPlan(request, userId);
    }

    @Get(PLAN)
    @ApiOkResponse({ type: Plan })
    getPlan(@Param(routeParams.planId, ParseUUIDPipe) planId: string): Promise<Plan> {
        return this.plansService.getPlan(planId);
    }

    @Put(PLAN)
    @ApiOperation({
        summary: 'Change the dates of a plan',
        description: 'Days outside the new range lose their dish. CONFLICT when the dates overlap.',
    })
    @ApiOkResponse({ type: Plan })
    @ApiConflictResponse({ type: ErrorResponse })
    updatePlan(
        @Param(routeParams.planId, ParseUUIDPipe) planId: string,
        @Body() request: PlanRequest,
    ): Promise<Plan> {
        return this.plansService.updatePlan(planId, request);
    }

    @Delete(PLAN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse()
    deletePlan(@Param(routeParams.planId, ParseUUIDPipe) planId: string): Promise<void> {
        return this.plansService.deletePlan(planId);
    }

    @Put(DAY)
    @ApiOperation({
        summary: 'Plan a dish on a day (null: no cooking)',
        description: 'Another dish clears the ingredients picked for that day.',
    })
    @ApiOkResponse({ type: Plan })
    setPlanDayDish(
        @Param(routeParams.planId, ParseUUIDPipe) planId: string,
        @Param(routeParams.date, ParseIsoDatePipe) date: string,
        @Body() request: PlanDayRequest,
    ): Promise<Plan> {
        return this.plansService.setDayDish(planId, date, request.dishId);
    }

    @Put(`${DAY}/ingredients`)
    @ApiOperation({ summary: "Pick the ingredients of the day's dish to buy" })
    @ApiOkResponse({ type: Plan })
    setPlanDayIngredients(
        @Param(routeParams.planId, ParseUUIDPipe) planId: string,
        @Param(routeParams.date, ParseIsoDatePipe) date: string,
        @Body() request: PlanDayIngredientsRequest,
        @CurrentUserId() userId: string,
    ): Promise<Plan> {
        return this.plansService.setDayIngredients(planId, date, request.ingredientIds, userId);
    }

    @Post(`${PLAN}/items`)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Add an item without a dish',
        description: 'New names are added to the ingredient catalogue.',
    })
    @ApiOkResponse({ type: Plan })
    addListItem(
        @Param(routeParams.planId, ParseUUIDPipe) planId: string,
        @Body() request: ListItemRequest,
        @CurrentUserId() userId: string,
    ): Promise<Plan> {
        return this.plansService.addItem(planId, request, userId);
    }

    @Put(ITEM)
    @ApiOperation({ summary: 'Change the note and the needed-by date of an item' })
    @ApiOkResponse({ type: Plan })
    updateListItem(
        @Param(routeParams.planId, ParseUUIDPipe) planId: string,
        @Param(routeParams.itemId, ParseUUIDPipe) itemId: string,
        @Body() request: ListItemUpdateRequest,
    ): Promise<Plan> {
        return this.plansService.updateItem(planId, itemId, request);
    }

    @Delete(ITEM)
    @ApiOperation({ summary: 'Remove an item, also from the days it was picked for' })
    @ApiOkResponse({ type: Plan })
    deleteListItem(
        @Param(routeParams.planId, ParseUUIDPipe) planId: string,
        @Param(routeParams.itemId, ParseUUIDPipe) itemId: string,
    ): Promise<Plan> {
        return this.plansService.deleteItem(planId, itemId);
    }

    @Get(`${PLAN}/carry-over`)
    @ApiOperation({ summary: 'Open items of the previous plan that are not on this list' })
    @ApiOkResponse({ type: CarryOverCandidates })
    getCarryOverCandidates(
        @Param(routeParams.planId, ParseUUIDPipe) planId: string,
    ): Promise<CarryOverCandidates> {
        return this.plansService.getCarryOverCandidates(planId);
    }

    @Post(`${PLAN}/carry-over`)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Take over open items of the previous plan' })
    @ApiOkResponse({ type: Plan })
    carryOverItems(
        @Param(routeParams.planId, ParseUUIDPipe) planId: string,
        @Body() request: CarryOverRequest,
        @CurrentUserId() userId: string,
    ): Promise<Plan> {
        return this.plansService.carryOver(planId, request.itemIds, userId);
    }
}
