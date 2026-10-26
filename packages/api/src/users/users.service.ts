import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserEntity } from '../database/entities/user.entity.js';
import { ApiException } from '../common/api-error.js';
import { User } from './types.js';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
    ) {}

    public async getUsers(): Promise<User[]> {
        const users = await this.userRepository.find({
            order: { name: 'ASC' },
        });
        return users.map((user) => new User(user));
    }

    public async getUser(userId: string): Promise<User> {
        const user = await this.findById(userId);
        if (user) {
            return new User(user);
        }
        throw ApiException.notFound(`User '${userId}' was not found`);
    }

    public async findById(userId: string): Promise<UserEntity | null> {
        return await this.userRepository.findOne({ where: { id: userId } });
    }

    public async findByEmail(email: string): Promise<UserEntity | null> {
        return await this.userRepository.findOne({
            where: { email: email.trim().toLowerCase() },
        });
    }

    public async updateLastLogin(userId: string, at: Date): Promise<void> {
        await this.userRepository.update(userId, { lastLoginAt: at });
    }
}
