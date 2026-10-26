import { Entity, PrimaryColumn, Column } from 'typeorm';

/** A planned day (dish) a list item is bought for */
@Entity('list_item_sources')
export class ListItemSourceEntity {
    @PrimaryColumn({ type: 'uuid' })
    listItemId!: string;

    /** YYYY-MM-DD */
    @PrimaryColumn({ type: 'date' })
    date!: string;

    @Column({ type: 'uuid' })
    planId!: string;
}
