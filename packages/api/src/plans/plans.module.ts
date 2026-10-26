import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListItemSourceEntity } from '../database/entities/list-item-source.entity.js';
import { ListItemEntity } from '../database/entities/list-item.entity.js';
import { PlanDayEntity } from '../database/entities/plan-day.entity.js';
import { PlanEntity } from '../database/entities/plan.entity.js';
import { IngredientsModule } from '../ingredients/ingredients.module.js';
import { PlansController } from './plans.controller.js';
import { PlanEventsService } from './plan-events.service.js';
import { PlansService } from './plans.service.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([PlanEntity, PlanDayEntity, ListItemEntity, ListItemSourceEntity]),
        IngredientsModule,
    ],
    controllers: [PlansController],
    providers: [PlansService, PlanEventsService],
})
export class PlansModule {}
