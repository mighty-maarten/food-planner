import { Column, Entity, PrimaryColumn } from 'typeorm';

/** The dish of a day in a plan */
@Entity('plan_days')
export class PlanDayEntity {
    @PrimaryColumn({ type: 'uuid' })
    planId!: string;

    /** YYYY-MM-DD */
    @PrimaryColumn({ type: 'date' })
    date!: string;

    @Column({ type: 'uuid' })
    dishId!: string;
}
