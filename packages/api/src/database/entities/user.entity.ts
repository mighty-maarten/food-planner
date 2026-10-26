import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity.js';

@Entity('users')
export class UserEntity extends BaseEntity {
    @Column({ type: 'text' })
    email!: string;

    @Column({ type: 'text' })
    name!: string;

    @Column({ type: 'text' })
    passwordHash!: string;

    @Column({ type: 'timestamptz', nullable: true })
    lastLoginAt!: Date | null;
}
