import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity.js';

@Entity('plans')
export class PlanEntity extends BaseEntity {
    /** YYYY-MM-DD */
    @Column({ type: 'date' })
    startDate!: string;

    /** YYYY-MM-DD, inclusive */
    @Column({ type: 'date' })
    endDate!: string;

    @Column({ type: 'uuid', nullable: true })
    createdById!: string | null;
}
