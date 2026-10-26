import { Column, Entity, OneToMany, type Relation } from 'typeorm';
import { BaseEntity } from './base.entity.js';
import { DishIngredientEntity } from './dish-ingredient.entity.js';

@Entity('dishes')
export class DishEntity extends BaseEntity {
    @Column({ type: 'text' })
    name!: string;

    /** Markdown */
    @Column({ type: 'text', nullable: true })
    recipe!: string | null;

    @Column({ type: 'text', nullable: true })
    sourceUrl!: string | null;

    @Column({ type: 'int', nullable: true })
    servings!: number | null;

    @OneToMany(() => DishIngredientEntity, (line) => line.dish)
    ingredients!: Relation<DishIngredientEntity>[];
}
