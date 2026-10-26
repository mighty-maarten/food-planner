import { describe, expect, it } from 'vitest';
import type { PlanSummary } from '@/api/services/types/plans';
import { DateUtil } from '@/utils/date';
import { defaultPlanDates, isValidPlanRange, pickCurrentPlan } from '@/utils/plan';

const plan = (id: string, startDate: string, endDate: string): PlanSummary => ({
    id,
    startDate,
    endDate,
    dishCount: 0,
    itemCount: 0,
    openItemCount: 0,
});

// Newest first, as the API returns them
const plans = [
    plan('next', '2026-11-05', '2026-11-11'),
    plan('current', '2026-10-29', '2026-11-04'),
    plan('previous', '2026-10-22', '2026-10-28'),
];

describe('pickCurrentPlan', () => {
    it('takes the plan with today in it', () => {
        expect(pickCurrentPlan(plans, '2026-11-04')?.id).toBe('current');
    });

    it('takes the first plan coming up between plans', () => {
        const withGap = [plan('later', '2026-11-20', '2026-11-26'), ...plans];
        expect(pickCurrentPlan(withGap, '2026-11-15')?.id).toBe('later');
        expect(pickCurrentPlan(plans, '2026-10-01')?.id).toBe('previous');
    });

    it('takes the most recent plan when all are over', () => {
        expect(pickCurrentPlan(plans, '2026-12-01')?.id).toBe('next');
    });

    it('has nothing without plans', () => {
        expect(pickCurrentPlan([], '2026-12-01')).toBeUndefined();
    });
});

describe('defaultPlanDates', () => {
    it('runs from the coming Thursday to Wednesday', () => {
        // Monday 26 October 2026
        expect(defaultPlanDates([], '2026-10-26')).toEqual({
            startDate: '2026-10-29',
            endDate: '2026-11-04',
        });
        // On a Thursday it starts today
        expect(defaultPlanDates([], '2026-10-29').startDate).toBe('2026-10-29');
    });

    it('starts after the last plan', () => {
        expect(defaultPlanDates(plans, '2026-10-26')).toEqual({
            startDate: '2026-11-12',
            endDate: '2026-11-18',
        });
    });

    it('ends on the first Wednesday after a start on another weekday', () => {
        // The last plan ended on a Sunday
        expect(defaultPlanDates([plan('short', '2026-10-29', '2026-11-01')], '2026-10-26')).toEqual(
            { startDate: '2026-11-02', endDate: '2026-11-04' },
        );
    });
});

describe('isValidPlanRange', () => {
    it.each([
        ['2026-10-29', '2026-10-29', true],
        ['2026-10-29', '2026-11-28', true],
        ['2026-10-29', '2026-11-29', false],
        ['2026-10-29', '2026-10-28', false],
    ])('%s to %s is %s', (startDate, endDate, valid) => {
        expect(isValidPlanRange({ startDate, endDate })).toBe(valid);
    });
});

describe('DateUtil', () => {
    it('formats days in Dutch', () => {
        expect(DateUtil.formatShort('2026-10-29')).toBe('do 29 okt');
        expect(DateUtil.formatWeekday('2026-10-29')).toBe('donderdag');
        expect(DateUtil.formatRange('2026-10-29', '2026-11-04')).toBe('do 29 okt – wo 4 nov');
    });

    it('counts days across the change to winter time', () => {
        expect(DateUtil.daysBetween('2026-10-24', '2026-10-26')).toBe(2);
        expect(DateUtil.addDays('2026-10-24', 2)).toBe('2026-10-26');
    });
});
