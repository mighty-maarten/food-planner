// Parses the Apple Notes export of old week menus: one line per day ("Do: risotto met pompoen"),
// weeks separated by blank lines, no dates. Only the dishes are of interest.

export type EntryKind = 'dish' | 'no-cooking' | 'not-a-dish';

export interface NoteEntry {
    /** The line as it was in the export */
    line: string;
    kind: EntryKind;
    /** The dish name: no URL, notes or punctuation around it */
    name: string;
    sourceUrl: string | null;
    /** Ingredients listed between parentheses, e.g. "Cantonese rijst (ei, hesp, prei)" */
    listedIngredients: string[];
}

// "Do: ...", "do ...", "Vr. ...", "- [ ] Ma: ..." (a checklist line)
const DAY_LINE = /^\s*(?:-\s*\[[ xX]?\]\s*)?(?:ma|di|wo|do|vr|za|zo)\b\s*[:.;]?\s*(.*)$/i;
const URL = /\(?\s*(https?:\/\/[^\s)]+)\)?/i;
// A label before the dish: "middag: zalm ...", "reco: ...", "ij: ..."
const LABEL = /^[a-z]{1,8}:\s+/i;
// Plans that are not a dish cooked at home
const NOT_A_DISH = [
    /^uit eten\b/i,
    /^ergens eten\b/i,
    /^(op (het )?)?werk\b/i,
    /^bij mama\b/i,
    /^mama\b/i,
    /^bestellen\b/i,
    /^oudejaarsavond\b/i,
    /^kerst(avond|dag)?\b/i,
    /^restaurant\b/i,
    /^etentje\b/i,
    /^feest(je)?\b/i,
    /^matts\b/i,
];
// Notes about this one time, not part of the dish
const NOTE = /^(zonder|geen|glutenvrij|lactosevrij|ok|op werk|x\d+|diepvries|…|\.\.\.)\b/i;

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Splits a list of ingredients: "ei, hesp, prei en wortel" */
export function splitList(value: string): string[] {
    return value
        .split(/,|\+|\/|\s+(?:en|of)\s+/i)
        .map((part) => part.replace(/[…?!.]+$/g, '').trim())
        .filter((part) => part.length > 0 && !/^(\.\.|…)$/.test(part));
}

export function parseLine(line: string): NoteEntry | null {
    const match = DAY_LINE.exec(line);
    if (!match) return null;
    let text = (match[1] ?? '').trim();

    // A change of plan: "Belga => Griekse pasta" is the Greek pasta
    const changed = /(?:=>|->)\s*(.+)$/.exec(text);
    if (changed?.[1]) text = changed[1].trim();

    // "/" (or nothing) is a day without cooking, also "/ (quiche voor maud)"
    if (!text || (/^[/xX?-]/.test(text) && !/^x\w/i.test(text))) {
        return { line, kind: 'no-cooking', name: '', sourceUrl: null, listedIngredients: [] };
    }

    const url = URL.exec(text);
    const sourceUrl = url?.[1]?.replace(/[).,]+$/, '') ?? null;
    if (url) text = text.replace(url[0], ' ');

    text = text.replace(LABEL, '');
    // A tentative plan in parentheses: "(pizza)"
    const wrapped = /^\((.*)\)$/.exec(text.trim());
    if (wrapped?.[1]) text = wrapped[1];

    const listedIngredients: string[] = [];
    text = text.replace(/\(([^)]*)\)?/g, (_all, inner: string) => {
        const content = inner.trim();
        if (content && !NOTE.test(content)) listedIngredients.push(...splitList(content));
        return ' ';
    });

    const name = capitalize(
        text
            .replace(/\s+-\s+.*$/, '') // "ovenschotel - krieltjes, wortel": a note after a dash
            .replace(/[?!]+/g, '')
            .replace(/\s*,\s*/g, ', ')
            .replace(/\s+/g, ' ')
            .replace(/[\s,.:;-]+$/, '')
            .trim(),
    );
    if (!name) {
        return { line, kind: 'no-cooking', name: '', sourceUrl, listedIngredients };
    }
    const kind: EntryKind = NOT_A_DISH.some((pattern) => pattern.test(name))
        ? 'not-a-dish'
        : 'dish';
    return { line, kind, name, sourceUrl, listedIngredients };
}

export function parseExport(text: string): NoteEntry[] {
    return text.split(/\r?\n/).flatMap((line) => {
        const entry = parseLine(line);
        return entry ? [entry] : [];
    });
}
