import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity.js';

@Entity('stores')
export class StoreEntity extends BaseEntity {
    @Column({ type: 'text' })
    name!: string;

    /** The loyalty card: its number and code type (StoreCardFormat), both or neither */
    @Column({ type: 'text', nullable: true })
    cardCode!: string | null;

    @Column({ type: 'text', nullable: true })
    cardFormat!: string | null;
}
