/**
 * The order of the categories in a store: first the categories with a position in that store,
 * then the others in their default order (e.g. categories added after the store was ordered).
 *
 * @param defaultOrder all category ids in their default order
 * @param positions the positions of (some of) the categories in the store
 */
export function resolveCategoryOrder(
    defaultOrder: string[],
    positions: { categoryId: string; position: number }[],
): string[] {
    const storePosition = new Map(positions.map((p) => [p.categoryId, p.position]));
    const defaultIndex = new Map(defaultOrder.map((id, index) => [id, index]));
    return [...defaultOrder].sort((a, b) => {
        const positionA = storePosition.get(a);
        const positionB = storePosition.get(b);
        if (positionA !== undefined && positionB !== undefined) return positionA - positionB;
        if (positionA !== undefined) return -1;
        if (positionB !== undefined) return 1;
        return (defaultIndex.get(a) ?? 0) - (defaultIndex.get(b) ?? 0);
    });
}
