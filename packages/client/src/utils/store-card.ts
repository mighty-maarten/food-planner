import type { StoreCardFormat } from '@/api/services/types/library';

/** The code types the scanner looks for (zxing's names) and what they are called here */
export const SCANNED_FORMATS: Record<string, StoreCardFormat> = {
    QR_CODE: 'qr',
    EAN_13: 'ean13',
    EAN_8: 'ean8',
    UPC_A: 'upca',
    CODE_128: 'code128',
    CODE_39: 'code39',
    ITF: 'itf',
    CODABAR: 'codabar',
};

/** For typing a number by hand, the most common first */
export const CARD_FORMATS: StoreCardFormat[] = [
    'ean13',
    'qr',
    'code128',
    'ean8',
    'upca',
    'code39',
    'itf',
    'codabar',
];

/** JsBarcode's names of the barcode formats */
export const JSBARCODE_FORMATS: Record<Exclude<StoreCardFormat, 'qr'>, string> = {
    ean13: 'EAN13',
    ean8: 'EAN8',
    upca: 'UPC',
    code128: 'CODE128',
    code39: 'CODE39',
    itf: 'ITF',
    codabar: 'codabar',
};

const DIGITS: Partial<Record<StoreCardFormat, RegExp>> = {
    ean13: /^\d{12,13}$/,
    ean8: /^\d{7,8}$/,
    upca: /^\d{11,12}$/,
    itf: /^(\d\d)+$/,
};

/** The same check as the API: digits-only formats need the right number of digits */
export function isValidCardCode(code: string, format: StoreCardFormat): boolean {
    const trimmed = code.trim();
    return !!trimmed && (DIGITS[format]?.test(trimmed) ?? true);
}

/** "2700 1234 5678 9": digits in groups of four, easier to read out at the till */
export function formatCardNumber(code: string): string {
    return /^\d+$/.test(code) ? (code.match(/\d{1,4}/g) ?? []).join(' ') : code;
}
