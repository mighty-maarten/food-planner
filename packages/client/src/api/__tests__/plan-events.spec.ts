import { describe, expect, it } from 'vitest';
import { parseSseBuffer } from '@/api/plan-events';

describe('parseSseBuffer', () => {
    it('returns the data of complete events and keeps the rest', () => {
        const { data, rest } = parseSseBuffer(
            ':\n\nid: 1\ndata: {"kind":"ping"}\n\nid: 2\ndata: {"kind":',
        );

        expect(data).toEqual(['{"kind":"ping"}']);
        expect(rest).toBe('id: 2\ndata: {"kind":');
    });

    it('joins multi-line data and accepts CRLF', () => {
        expect(parseSseBuffer('data: a\r\ndata: b\r\n\r\n').data).toEqual(['a\nb']);
    });

    it('continues with the rest of a previous chunk', () => {
        const first = parseSseBuffer('data: {"kind":"pl');
        const second = parseSseBuffer(`${first.rest}an-changed"}\n\n`);
        expect(second.data).toEqual(['{"kind":"plan-changed"}']);
    });
});
