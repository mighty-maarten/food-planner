// Calendar dates as 'YYYY-MM-DD' strings (as the API sends them), in the local timezone

const pad = (value: number) => String(value).padStart(2, '0');

function toDate(date: string): Date {
    const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function toIso(date: Date): string {
    return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const weekdayLong = new Intl.DateTimeFormat('nl-BE', { weekday: 'long' });
const dayMonthLong = new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'long' });
const short = new Intl.DateTimeFormat('nl-BE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
});

export const Weekday = { WEDNESDAY: 3, THURSDAY: 4 } as const;

export class DateUtil {
    public static today(now = new Date()): string {
        return toIso(now);
    }

    public static addDays(date: string, days: number): string {
        const result = toDate(date);
        result.setDate(result.getDate() + days);
        return toIso(result);
    }

    public static daysBetween(from: string, to: string): number {
        // Noon avoids an hour lost or gained with daylight saving time
        const noon = (date: string) => toDate(date).getTime() + 12 * 3600 * 1000;
        return Math.round((noon(to) - noon(from)) / (24 * 3600 * 1000));
    }

    /** 0 = Sunday ... 6 = Saturday */
    public static weekday(date: string): number {
        return toDate(date).getDay();
    }

    /** The first date on or after `date` that falls on `weekday` */
    public static nextWeekday(date: string, weekday: number): string {
        return DateUtil.addDays(date, (weekday - DateUtil.weekday(date) + 7) % 7);
    }

    /** "donderdag" */
    public static formatWeekday(date: string): string {
        return weekdayLong.format(toDate(date));
    }

    /** "29 oktober" */
    public static formatDayMonth(date: string): string {
        return dayMonthLong.format(toDate(date));
    }

    /** "do 29 okt" */
    public static formatShort(date: string): string {
        return short.format(toDate(date)).replace(/\./g, '');
    }

    /** "do 29 okt – wo 4 nov" */
    public static formatRange(start: string, end: string): string {
        return `${DateUtil.formatShort(start)} – ${DateUtil.formatShort(end)}`;
    }
}
