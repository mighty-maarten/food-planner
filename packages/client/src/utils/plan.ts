import type { PlanRequest, PlanSummary } from '@/api/services/types/plans';
import { DateUtil, Weekday } from './date';

/**
 * The plan to show by default: the one with today in it, else the first one coming up, else the
 * most recent one. `plans` is sorted newest first, as the API returns them.
 */
export function pickCurrentPlan(plans: PlanSummary[], today: string): PlanSummary | undefined {
    const upcoming = plans.filter((plan) => plan.startDate > today);
    return (
        plans.find((plan) => plan.startDate <= today && today <= plan.endDate) ??
        upcoming[upcoming.length - 1] ??
        plans.find((plan) => plan.endDate < today)
    );
}

/**
 * Dates for a new plan: Thursday to Wednesday, starting on the coming Thursday, or the day after
 * the last plan if that runs longer. The end is the first Wednesday after the start.
 */
export function defaultPlanDates(plans: PlanSummary[], today: string): PlanRequest {
    const thursday = DateUtil.nextWeekday(today, Weekday.THURSDAY);
    const lastEnd = plans.reduce<string | undefined>(
        (latest, plan) => (!latest || plan.endDate > latest ? plan.endDate : latest),
        undefined,
    );
    const afterLast = lastEnd ? DateUtil.addDays(lastEnd, 1) : undefined;
    const startDate = afterLast && afterLast > thursday ? afterLast : thursday;
    const endDate = DateUtil.nextWeekday(DateUtil.addDays(startDate, 1), Weekday.WEDNESDAY);
    return { startDate, endDate };
}

/** Longest plan, as the API allows */
export const MAX_PLAN_DAYS = 31;

export function isValidPlanRange(range: PlanRequest): boolean {
    const length = DateUtil.daysBetween(range.startDate, range.endDate) + 1;
    return length >= 1 && length <= MAX_PLAN_DAYS;
}
