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

    /** Lowercase, sorted, unique */
    @Column({ type: 'text', array: true, default: () => "'{}'" })
    tags!: string[];

    /** How often it was planned before the app (imported) */
    @Column({ type: 'int', default: 0 })
    historicalCount!: number;

    @OneToMany(() => DishIngredientEntity, (line) => line.dish)
    ingredients!: Relation<DishIngredientEntity>[];
}
