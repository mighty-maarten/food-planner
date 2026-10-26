import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    ArrayUnique,
    IsArray,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    ValidateIf,
} from 'class-validator';
import { IsIsoDate } from '../common/is-iso-date.decorator.js';
import { Trim, TrimToNull } from '../common/transforms.js';
import { DishIngredient } from '../dishes/types.js';

export class UserReference {
    @ApiProperty()
    public id!: string;
    @ApiProperty()
    public name!: string;
}

export class PlanSummary {
    @ApiProperty()
    public id!: string;
    @ApiProperty({ description: 'YYYY-MM-DD' })
    public startDate!: string;
    @ApiProperty({ description: 'YYYY-MM-DD, included' })
    public endDate!: string;
    @ApiProperty({ description: 'Days with a dish.' })
    public dishCount!: number;
    @ApiProperty()
    public itemCount!: number;
    @ApiProperty({ description: 'Items not ticked off yet.' })
    public openItemCount!: number;
}

export class PlanDish {
    @ApiProperty()
    public id!: string;
    @ApiProperty()
    public name!: string;
    @ApiProperty({ type: [DishIngredient] })
    public ingredients!: DishIngredient[];
}

export class PlanDay {
    @ApiProperty({ description: 'YYYY-MM-DD' })
    public date!: string;
    @ApiProperty({ type: PlanDish, nullable: true, description: 'Null: no cooking.' })
    public dish!: PlanDish | null;
    @ApiProperty({
        type: [String],
        description: 'Ingredients of the dish that are on the shopping list for this day.',
    })
    public selectedIngredientIds!: string[];
}

export class ListItemSource {
    @ApiProperty({ description: 'YYYY-MM-DD' })
    public date!: string;
    @ApiProperty()
    public dishId!: string;
    @ApiProperty()
    public dishName!: string;
    @ApiProperty({ type: Number, nullable: true })
    public amount!: number | null;
    @ApiProperty({ type: String, nullable: true })
    public unit!: string | null;
}

export class ListItem {
    @ApiProperty()
    public id!: string;
    @ApiProperty()
    public ingredientId!: string;
    @ApiProperty()
    public name!: string;
    @ApiProperty({ type: String, nullable: true })
    public categoryId!: string | null;
    @ApiProperty({ type: [String], description: 'Default stores of the ingredient.' })
    public storeIds!: string[];
    @ApiProperty({ type: String, nullable: true })
    public note!: string | null;
    @ApiProperty({
        type: String,
        nullable: true,
        description:
            'YYYY-MM-DD: the override, else the first day a planned dish uses it. Null: no date.',
    })
    public neededBy!: string | null;
    @ApiProperty({ description: 'neededBy was set by hand.' })
    public neededByOverride!: boolean;
    @ApiProperty({ description: 'Added freely or carried over, not (only) for a dish.' })
    public manual!: boolean;
    @ApiProperty({ type: [ListItemSource], description: 'The planned dishes it is bought for.' })
    public sources!: ListItemSource[];
    @ApiProperty({ type: UserReference, nullable: true })
    public addedBy!: UserReference | null;
    @ApiProperty({ type: String, nullable: true, description: 'ISO timestamp.' })
    public checkedAt!: string | null;
    @ApiProperty({ type: UserReference, nullable: true })
    public checkedBy!: UserReference | null;
}

export class Plan {
    @ApiProperty()
    public id!: string;
    @ApiProperty({ description: 'YYYY-MM-DD' })
    public startDate!: string;
    @ApiProperty({ description: 'YYYY-MM-DD, included' })
    public endDate!: string;
    @ApiProperty({ type: [PlanDay], description: 'Every day of the plan, in order.' })
    public days!: PlanDay[];
    @ApiProperty({ type: [ListItem] })
    public items!: ListItem[];
}

export class PlanRange {
    @ApiProperty()
    public id!: string;
    @ApiProperty({ description: 'YYYY-MM-DD' })
    public startDate!: string;
    @ApiProperty({ description: 'YYYY-MM-DD, included' })
    public endDate!: string;
}

export class CarryOverCandidates {
    @ApiProperty({ type: PlanRange, nullable: true, description: 'The previous plan.' })
    public plan!: PlanRange | null;
    @ApiProperty({ type: [ListItem], description: 'Its open items that are not on this list.' })
    public items!: ListItem[];
}

export class PlanRequest {
    @ApiProperty({ description: 'YYYY-MM-DD' })
    @IsIsoDate()
    public startDate!: string;

    @ApiProperty({ description: 'YYYY-MM-DD, included, at most 30 days after the start' })
    @IsIsoDate()
    public endDate!: string;
}

export class PlanDayRequest {
    @ApiProperty({ type: String, nullable: true, description: 'Null: no cooking.' })
    @ValidateIf((_object, value) => value !== null)
    @IsUUID()
    public dishId!: string | null;
}

export class PlanDayIngredientsRequest {
    @ApiProperty({
        type: [String],
        description: 'The ingredients of the dish to buy for this day (replaces the selection).',
    })
    @IsArray()
    @ArrayUnique()
    @ArrayMaxSize(100)
    @IsUUID('all', { each: true })
    public ingredientIds!: string[];
}

export class ListItemRequest {
    @ApiProperty({ description: 'Ingredient name, added to the catalogue if it is new.' })
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    public name!: string;

    @ApiProperty({ type: String, nullable: true, required: false })
    @TrimToNull()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    public note?: string | null;

    @ApiProperty({ type: String, nullable: true, required: false, description: 'YYYY-MM-DD' })
    @IsOptional()
    @IsIsoDate()
    public neededBy?: string | null;
}

export class ListItemUpdateRequest {
    @ApiProperty({ type: String, nullable: true })
    @TrimToNull()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    public note!: string | null;

    @ApiProperty({
        type: String,
        nullable: true,
        description: 'YYYY-MM-DD. Null: derived from the planned dishes again.',
    })
    @IsOptional()
    @IsIsoDate()
    public neededBy!: string | null;
}

export class CarryOverRequest {
    @ApiProperty({ type: [String], description: 'Items of the previous plan to take over.' })
    @IsArray()
    @ArrayUnique()
    @ArrayMaxSize(500)
    @IsUUID('all', { each: true })
    public itemIds!: string[];
}
