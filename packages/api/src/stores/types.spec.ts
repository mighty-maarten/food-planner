import { cardCodeError, Store } from './types.js';

describe('cardCodeError', () => {
    it('accepts EAN-13 with or without its check digit', () => {
        expect(cardCodeError('2700123456789', 'ean13')).toBeNull();
        expect(cardCodeError('270012345678', 'ean13')).toBeNull();
    });

    it('rejects letters or a wrong length in a digits-only format', () => {
        expect(cardCodeError('27001234567X9', 'ean13')).not.toBeNull();
        expect(cardCodeError('123', 'ean8')).not.toBeNull();
        expect(cardCodeError('12345', 'itf')).not.toBeNull();
    });

    it('accepts any text in QR and Code 128', () => {
        expect(cardCodeError('LIDL-PLUS:abc 123', 'qr')).toBeNull();
        expect(cardCodeError('AB-12', 'code128')).toBeNull();
    });
});

describe('Store', () => {
    it('has a card only when both code and format are set', () => {
        const base = { id: 's', name: 'Colruyt', cardCode: null, cardFormat: null };
        expect(new Store(base, []).card).toBeNull();
        expect(
            new Store({ ...base, cardCode: '2700123456789', cardFormat: 'ean13' }, []).card,
        ).toEqual({ code: '2700123456789', format: 'ean13' });
    });
});
