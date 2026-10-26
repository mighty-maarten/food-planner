import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { BaseEntity } from './base.entity.js';
import { DishEntity } from './dish.entity.js';
import { IngredientEntity } from './ingredient.entity.js';

/** An ingredient line of a dish */
@Entity('dish_ingredients')
export class DishIngredientEntity extends BaseEntity {
    @Column({ type: 'uuid' })
    dishId!: string;

    @ManyToOne(() => DishEntity, (dish) => dish.ingredients, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'dish_id' })
    // Relation<> keeps the circular import between the two entities out of the decorator metadata
    dish!: Relation<DishEntity>;

    @Column({ type: 'uuid' })
    ingredientId!: string;

    @ManyToOne(() => IngredientEntity, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'ingredient_id' })
    ingredient!: IngredientEntity;

    @Column({ type: 'double precision', nullable: true })
    amount!: number | null;

    @Column({ type: 'text', nullable: true })
    unit!: string | null;

    @Column({ type: 'int' })
    position!: number;
}
