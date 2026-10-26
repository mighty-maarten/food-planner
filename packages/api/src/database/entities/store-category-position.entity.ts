import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Position of a category on the route through a store */
@Entity('store_category_positions')
export class StoreCategoryPositionEntity {
    @PrimaryColumn({ type: 'uuid' })
    storeId!: string;

    @PrimaryColumn({ type: 'uuid' })
    categoryId!: string;

    @Column({ type: 'int' })
    position!: number;
}
