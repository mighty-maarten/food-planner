// Calendar dates as 'YYYY-MM-DD' strings, the format of PostgreSQL DATE columns. Calculations
// use UTC so they never shift with the server's timezone.

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const toUtc = (date: string): Date => new Date(`${date}T00:00:00Z`);

export const IsoDate = {
    /** True for an existing calendar date in YYYY-MM-DD format (rejects 2026-02-30) */
    isValid(value: string): boolean {
        if (!ISO_DATE_PATTERN.test(value)) return false;
        const date = toUtc(value);
        return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
    },

    addDays(date: string, days: number): string {
        return new Date(toUtc(date).getTime() + days * DAY_MS).toISOString().slice(0, 10);
    },

    /** Number of days from `from` to `to` (negative when `to` is earlier) */
    daysBetween(from: string, to: string): number {
        return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / DAY_MS);
    },

    /** Every date from start to end, both included */
    range(start: string, end: string): string[] {
        const length = IsoDate.daysBetween(start, end) + 1;
        return Array.from({ length: Math.max(length, 0) }, (_, index) =>
            IsoDate.addDays(start, index),
        );
    },
};
