import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { Trim } from '../common/transforms.js';
import type { CategoryEntity } from '../database/entities/category.entity.js';

export class Category {
    @ApiProperty()
    public id: string;
    @ApiProperty()
    public name: string;
    @ApiProperty({ description: 'Default order, used when no store is selected.' })
    public position: number;

    constructor(category: Pick<CategoryEntity, 'id' | 'name' | 'position'>) {
        this.id = category.id;
        this.name = category.name;
        this.position = category.position;
    }
}

export class CategoryRequest {
    @ApiProperty()
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    public name!: string;
}

export class CategoryOrderRequest {
    @ApiProperty({ type: [String], description: 'Every category id, in the new order.' })
    @IsArray()
    @ArrayUnique()
    @IsUUID('all', { each: true })
    public categoryIds!: string[];
}
