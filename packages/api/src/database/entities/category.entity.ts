import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity.js';

@Entity('categories')
export class CategoryEntity extends BaseEntity {
    @Column({ type: 'text' })
    name!: string;

    /** Default order, used when no store is selected */
    @Column({ type: 'int' })
    position!: number;
}
