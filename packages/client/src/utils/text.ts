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

    /**
     * The value split into the parts that match a word of the query and the parts in between, for
     * showing the matches in bold. Matches like `matches`: case and accents are ignored.
     */
    public static highlight(query: string, value: string): { text: string; match: boolean }[] {
        const words = TextUtil.normalize(query).split(/\s+/).filter(Boolean);
        // Normalize per character, remembering which character each normalized one came from
        // Code points, so an emoji isn't split in half
        const chars = Array.from(value);
        let normalized = '';
        const origin: number[] = [];
        chars.forEach((char, index) => {
            const folded = char
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();
            normalized += folded;
            origin.push(...new Array<number>(folded.length).fill(index));
        });

        const marked = new Array<boolean>(chars.length).fill(false);
        for (const word of words) {
            for (
                let at = normalized.indexOf(word);
                at !== -1;
                at = normalized.indexOf(word, at + 1)
            ) {
                for (let i = at; i < at + word.length; i++) marked[origin[i] ?? 0] = true;
            }
        }

        const parts: { text: string; match: boolean }[] = [];
        chars.forEach((char, index) => {
            const match = marked[index] ?? false;
            const last = parts[parts.length - 1];
            if (last?.match === match) last.text += char;
            else parts.push({ text: char, match });
        });
        return parts;
    }

    public static compare(a: string, b: string): number {
        return a.localeCompare(b, 'nl', { sensitivity: 'base' });
    }
}
