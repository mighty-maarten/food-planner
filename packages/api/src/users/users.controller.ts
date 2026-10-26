import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { User } from './types.js';
import { routeParams } from '../route-params.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller()
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @ApiOkResponse({ type: [User] })
    async getUsers(): Promise<User[]> {
        return this.usersService.getUsers();
    }

    @Get(`:${routeParams.userId}`)
    @ApiOkResponse({ type: User })
    async getUser(@Param(routeParams.userId, ParseUUIDPipe) userId: string): Promise<User> {
        return this.usersService.getUser(userId);
    }
}
