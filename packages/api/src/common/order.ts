import { ApiException } from './api-error.js';

/** Checks that a reorder request lists every existing id exactly once */
export function assertCompleteOrder(ids: string[], existingIds: string[]): void {
    const existing = new Set(existingIds);
    const complete =
        ids.length === existing.size &&
        new Set(ids).size === ids.length &&
        ids.every((id) => existing.has(id));
    if (!complete) {
        throw ApiException.invalidRequest('The order must list every item exactly once.');
    }
}
