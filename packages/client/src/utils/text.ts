export class TextUtil {
    /** Lowercase without accents, for searching ("Crème" matches "creme") */
    public static normalize(value: string): string {
        return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    }

    /** True when every word of the query occurs in one of the values */
    public static matches(query: string, ...values: string[]): boolean {
        const words = TextUtil.normalize(query).split(/\s+/).filter(Boolean);
        const haystack = values.map((value) => TextUtil.normalize(value));
        return words.every((word) => haystack.some((value) => value.includes(word)));
    }

    public static compare(a: string, b: string): number {
        return a.localeCompare(b, 'nl', { sensitivity: 'base' });
    }
}
