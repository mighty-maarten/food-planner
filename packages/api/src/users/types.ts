import { ApiProperty } from '@nestjs/swagger';
import type { UserEntity } from '../database/entities/user.entity.js';

export class User {
    @ApiProperty()
    public id: string;
    @ApiProperty()
    public email: string;
    @ApiProperty()
    public name: string;

    constructor(user: Pick<UserEntity, 'id' | 'email' | 'name'>) {
        this.id = user.id;
        this.email = user.email;
        this.name = user.name;
    }
}
