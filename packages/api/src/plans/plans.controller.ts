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
    Sse,
    type MessageEvent,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiProduces,
    ApiTags,
} from '@nestjs/swagger';
import { interval, map, merge, type Observable } from 'rxjs';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { ErrorResponse } from '../common/error-response.js';
import { ParseIsoDatePipe } from '../common/parse-date.pipe.js';
import { routeParams } from '../route-params.js';
import { PlanEventsService } from './plan-events.service.js';
import { PlansService } from './plans.service.js';
import {
    CarryOverCandidates,
    CarryOverRequest,
    ListItem,
    ListItemCheckRequest,
    ListItemRequest,
    ListItemStoreRequest,
    ListItemUpdateRequest,
    Plan,
    PlanEvent,
    PlanEventKind,
    PlanDayIngredientsRequest,
    PlanDayRequest,
    PlanDaySwapRequest,
    PlanRequest,
    PlanSummary,
} from './types.js';

const PLAN = `:${routeParams.planId}`;
const DAY = `${PLAN}/days/:${routeParams.date}`;
const ITEM = `${PLAN}/items/:${routeParams.itemId}`;

// Below the idle timeouts of proxies (Caddy keeps idle upstream connections for 2 minutes)
const PING_INTERVAL_MS = 25_000;

// Every change returns the whole plan: days, dishes and the shopping list stay consistent in
// the client with one response.
@ApiTags('plans')
@ApiBearerAuth()
@ApiNotFoundResponse({ type: ErrorResponse })
@ApiBadRequestResponse({ type: ErrorResponse })
@Controller()
export class PlansController {
    constructor(
        private readonly plansService: PlansService,
        private readonly planEvents: PlanEventsService,
    ) {}

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
        @CurrentUserId() userId: string,
    ): Promise<Plan> {
        return this.plansService.updatePlan(planId, request, userId);
    }

    @Delete(PLAN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse()
    deletePlan(
        @Param(routeParams.planId, ParseUUIDPipe) planId: string,
        @CurrentUserId() userId: string,
    ): Promise<void> {
        return this.plansService.deletePlan(planId, userId);
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
        @CurrentUserId() userId: string,
    ): Promise<Plan> {
        return this.plansService.setDayDish(planId, date, request.dishId, userId);
    }

    @Post(`${DAY}/swap`)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Swap two days of the plan',
        description:
            'Swaps the dishes and the ingredients picked for them; to an empty day it is a move.',
    })
    @ApiOkResponse({ type: Plan })
    swapPlanDays(
        @Param(routeParams.planId, ParseUUIDPipe) planId: string,
        @Param(routeParams.date, ParseIsoDatePipe) date: string,
        @Body() request: PlanDaySwapRequest,
        @CurrentUserId() userId: string,
    ): Promise<Plan> {
        return this.plansService.swapDays(planId, date, request.date, userId);
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
        @CurrentUserId() userId: string,
    ): Promise<Plan> {
        return this.plansService.updateItem(planId, itemId, request, userId);
    }

    @Delete(ITEM)
    @ApiOperation({ summary: 'Remove an item, also from the days it was picked for' })
    @ApiOkResponse({ type: Plan })
    deleteListItem(
        @Param(routeParams.planId, ParseUUIDPipe) planId: string,
        @Param(routeParams.itemId, ParseUUIDPipe) itemId: string,
        @CurrentUserId() userId: string,
    ): Promise<Plan> {
        return this.plansService.deleteItem(planId, itemId, userId);
    }

    @Put(`${ITEM}/checked`)
    @ApiOperation({
        summary: 'Tick an item off (or back on) in shop mode',
        description:
            'The last tick wins, by the time it was made on the device. Returns the current ' +
            'state of the item, also when a newer tick was already there.',
    })
    @ApiOkResponse({ type: ListItem })
    setListItemChecked(
        @Param(routeParams.planId, ParseUUIDPipe) planId: string,
        @Param(routeParams.itemId, ParseUUIDPipe) itemId: string,
        @Body() request: ListItemCheckRequest,
        @CurrentUserId() userId: string,
    ): Promise<ListItem> {
        return this.plansService.setItemChecked(planId, itemId, request, userId);
    }

    @Put(`${ITEM}/store`)
    @ApiOperation({
        summary: 'Choose where an item is bought on this list',
        description: "`override: false` goes back to the ingredient's default stores.",
    })
    @ApiOkResponse({ type: ListItem })
    setListItemStore(
        @Param(routeParams.planId, ParseUUIDPipe) planId: string,
        @Param(routeParams.itemId, ParseUUIDPipe) itemId: string,
        @Body() request: ListItemStoreRequest,
        @CurrentUserId() userId: string,
    ): Promise<ListItem> {
        return this.plansService.setItemStore(planId, itemId, request, userId);
    }

    @Sse(`${PLAN}/events`)
    @ApiOperation({
        summary: 'Live updates of a plan (server-sent events)',
        description:
            'Every message has a PlanEvent as JSON `data`. A ping is sent every 25 seconds. ' +
            'Needs the Authorization header, so clients read it with fetch, not EventSource.',
    })
    @ApiProduces('text/event-stream')
    @ApiOkResponse({ type: PlanEvent })
    getPlanEvents(
        @Param(routeParams.planId, ParseUUIDPipe) planId: string,
    ): Observable<MessageEvent> {
        const ping = interval(PING_INTERVAL_MS).pipe(
            map((): PlanEvent => ({ kind: PlanEventKind.PING })),
        );
        return merge(this.planEvents.forPlan(planId), ping).pipe(
            map((event): MessageEvent => ({ data: event })),
        );
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
