import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayUnique,
    IsArray,
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
}

/** A dish using an ingredient, returned when the ingredient cannot be deleted */
export interface IngredientUsage {
    id: string;
    name: string;
}
