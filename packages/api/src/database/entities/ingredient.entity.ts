import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { BaseEntity } from './base.entity.js';
import { StoreEntity } from './store.entity.js';

@Entity('ingredients')
export class IngredientEntity extends BaseEntity {
    @Column({ type: 'text' })
    name!: string;

    @Column({ type: 'uuid', nullable: true })
    categoryId!: string | null;

    /** Always needed: a new plan starts with it on its shopping list */
    @Column({ type: 'boolean', default: false })
    alwaysOnList!: boolean;

    /** Where the ingredient is usually bought */
    @ManyToMany(() => StoreEntity)
    @JoinTable({
        name: 'ingredient_default_stores',
        joinColumn: { name: 'ingredient_id' },
        inverseJoinColumn: { name: 'store_id' },
    })
    stores!: StoreEntity[];
}
