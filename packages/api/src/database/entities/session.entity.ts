import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity.js';
import { UserEntity } from './user.entity.js';

@Entity('sessions')
export class SessionEntity extends BaseEntity {
    @Column({ type: 'uuid' })
    userId!: string;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: UserEntity;

    @Column({ type: 'text' })
    tokenHash!: string;

    @Column({ type: 'text', nullable: true })
    userAgent!: string | null;

    @Column({ type: 'timestamptz' })
    expiresAt!: Date;

    @Column({ type: 'timestamptz' })
    lastUsedAt!: Date;
}
