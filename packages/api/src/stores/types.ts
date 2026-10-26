import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../common/transforms.js';

export class Store {
    @ApiProperty()
    public id: string;
    @ApiProperty()
    public name: string;
    @ApiProperty({
        type: [String],
        description:
            'Every category id in the order of the route through this store. Categories without ' +
            'a position in this store follow in their default order.',
    })
    public categoryIds: string[];

    constructor(store: { id: string; name: string }, categoryIds: string[]) {
        this.id = store.id;
        this.name = store.name;
        this.categoryIds = categoryIds;
    }
}

export class StoreRequest {
    @ApiProperty()
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    public name!: string;
}
