import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';
import { Trim } from '../common/transforms.js';

export class Ingredient {
    @ApiProperty()
    public id!: string;
    @ApiProperty()
    public name!: string;
    @ApiProperty({ type: String, nullable: true })
    public categoryId!: string | null;
    @ApiProperty({ type: [String], description: 'Stores where it is usually bought.' })
    public storeIds!: string[];
    @ApiProperty({ description: 'Number of dishes using this ingredient.' })
    public dishCount!: number;
    @ApiProperty({ description: 'Always needed: a new plan starts with it on its shopping list.' })
    public alwaysOnList!: boolean;

    constructor(ingredient: Ingredient) {
        Object.assign(this, ingredient);
    }
}

export class IngredientRequest {
    @ApiProperty()
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    public name!: string;

    @ApiProperty({ type: String, nullable: true, required: false })
    @IsOptional()
    @IsUUID()
    public categoryId?: string | null;

    @ApiProperty({ type: [String] })
    @IsArray()
    @ArrayUnique()
    @IsUUID('all', { each: true })
    public storeIds!: string[];

    @ApiProperty({
        required: false,
        description:
            'Always needed: a new plan starts with it. Left out: false for a new ' +
            'ingredient, unchanged on an update.',
    })
    @IsOptional()
    @IsBoolean()
    public alwaysOnList?: boolean;
}

/** A dish using an ingredient, returned when the ingredient cannot be deleted */
export interface IngredientUsage {
    id: string;
    name: string;
}
