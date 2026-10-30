import { describe, expect, it } from 'vitest';
import { formatCardNumber, isValidCardCode } from '@/utils/store-card';

describe('isValidCardCode', () => {
    it('needs the right number of digits for EAN-13', () => {
        expect(isValidCardCode('2700123456789', 'ean13')).toBe(true);
        expect(isValidCardCode('27001234', 'ean13')).toBe(false);
        expect(isValidCardCode('270012345678X', 'ean13')).toBe(false);
    });

    it('accepts any text in a QR code, but not nothing', () => {
        expect(isValidCardCode('lidl:abc 123', 'qr')).toBe(true);
        expect(isValidCardCode('  ', 'qr')).toBe(false);
    });
});

describe('formatCardNumber', () => {
    it('groups digits per four', () => {
        expect(formatCardNumber('2700123456789')).toBe('2700 1234 5678 9');
    });

    it('leaves other codes as they are', () => {
        expect(formatCardNumber('AB-12 34')).toBe('AB-12 34');
    });
});
