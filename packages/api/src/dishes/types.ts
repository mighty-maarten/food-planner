import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    IsUrl,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { Trim, TrimToNull } from '../common/transforms.js';

export class DishIngredient {
    @ApiProperty()
    public ingredientId!: string;
    @ApiProperty()
    public name!: string;
    @ApiProperty({ type: String, nullable: true })
    public categoryId!: string | null;
    @ApiProperty({ type: Number, nullable: true })
    public amount!: number | null;
    @ApiProperty({ type: String, nullable: true })
    public unit!: string | null;

    constructor(line: DishIngredient) {
        Object.assign(this, line);
    }
}

export class Dish {
    @ApiProperty()
    public id!: string;
    @ApiProperty()
    public name!: string;
    @ApiProperty({ type: String, nullable: true, description: 'Markdown.' })
    public recipe!: string | null;
    @ApiProperty({ type: String, nullable: true })
    public sourceUrl!: string | null;
    @ApiProperty({ type: Number, nullable: true })
    public servings!: number | null;
    @ApiProperty({ type: [DishIngredient] })
    public ingredients!: DishIngredient[];

    constructor(dish: Dish) {
        Object.assign(this, dish);
    }
}

/** A dish in the library list, without the recipe text */
export class DishListItem {
    @ApiProperty()
    public id!: string;
    @ApiProperty()
    public name!: string;
    @ApiProperty({ type: [String], description: 'Ingredient names in the order of the dish.' })
    public ingredientNames!: string[];
    @ApiProperty({ description: 'Has a recipe text or a source URL.' })
    public hasRecipe!: boolean;
    @ApiProperty({
        description: 'How often it was planned: in the app plus before it (imported menus).',
    })
    public timesPlanned!: number;

    constructor(dish: DishListItem) {
        Object.assign(this, dish);
    }
}

export class DishIngredientRequest {
    @ApiProperty({ description: 'Ingredient name, added to the catalogue if it is new.' })
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    public name!: string;

    @ApiProperty({ type: Number, nullable: true, required: false })
    @IsOptional()
    @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 3 })
    @IsPositive()
    @Max(100_000)
    public amount?: number | null;

    @ApiProperty({ type: String, nullable: true, required: false })
    @TrimToNull()
    @IsOptional()
    @IsString()
    @MaxLength(30)
    public unit?: string | null;
}

export class DishRequest {
    @ApiProperty()
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    public name!: string;

    @ApiProperty({ type: String, nullable: true, required: false, description: 'Markdown.' })
    @TrimToNull()
    @IsOptional()
    @IsString()
    @MaxLength(50_000)
    public recipe?: string | null;

    @ApiProperty({ type: String, nullable: true, required: false })
    @TrimToNull()
    @IsOptional()
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
    @MaxLength(2000)
    public sourceUrl?: string | null;

    @ApiProperty({ type: Number, nullable: true, required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    public servings?: number | null;

    @ApiProperty({ type: [DishIngredientRequest] })
    @IsArray()
    @ArrayMaxSize(100)
    @ValidateNested({ each: true })
    @Type(() => DishIngredientRequest)
    public ingredients!: DishIngredientRequest[];
}
