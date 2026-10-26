import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity.js';

@Entity('stores')
export class StoreEntity extends BaseEntity {
    @Column({ type: 'text' })
    name!: string;
}
