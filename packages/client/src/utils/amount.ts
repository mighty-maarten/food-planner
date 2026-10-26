const formatter = new Intl.NumberFormat('nl-BE', { maximumFractionDigits: 3 });

/** "300 g", "2", "0,5 stuk"; empty when there is neither an amount nor a unit */
export function formatAmount(amount: number | null, unit: string | null): string {
    return [amount === null ? null : formatter.format(amount), unit].filter(Boolean).join(' ');
}
