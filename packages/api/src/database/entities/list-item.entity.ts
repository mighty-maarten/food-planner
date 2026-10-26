import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity.js';

/** A line on the shopping list of a plan, one per ingredient */
@Entity('list_items')
export class ListItemEntity extends BaseEntity {
    @Column({ type: 'uuid' })
    planId!: string;

    @Column({ type: 'uuid' })
    ingredientId!: string;

    /** Added freely or carried over: stays when no planned dish needs it */
    @Column({ type: 'boolean', default: false })
    manual!: boolean;

    @Column({ type: 'text', nullable: true })
    note!: string | null;

    /** Overrides the date derived from the sources (YYYY-MM-DD) */
    @Column({ type: 'date', nullable: true })
    neededBy!: string | null;

    @Column({ type: 'uuid', nullable: true })
    addedById!: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    checkedAt!: Date | null;

    @Column({ type: 'uuid', nullable: true })
    checkedById!: string | null;
}
