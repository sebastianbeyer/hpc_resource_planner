/**
 * Format a count of hours as a compact human string. Used on Plan cards to
 * keep absolute numbers short:
 *   42 → "42 H", 4_200 → "4.2 kH", 4_200_000 → "4.2 MH"
 */
export function formatHours(hours: number): string {
  if (!isFinite(hours)) return '—';
  const abs = Math.abs(hours);
  if (abs >= 1_000_000) return `${trim(hours / 1_000_000)} MH`;
  if (abs >= 1_000) return `${trim(hours / 1_000)} kH`;
  return `${trim(hours, 0)} H`;
}

/**
 * Format a storage amount given in TB. Switches to GB below 1 TB:
 *   0.4 TB → "400 GB", 1.5 TB → "1.5 TB", 1_200 TB → "1.2 PB"
 */
export function formatStorageTb(tb: number): string {
  if (!isFinite(tb)) return '—';
  const abs = Math.abs(tb);
  if (abs >= 1_000) return `${trim(tb / 1_000)} PB`;
  if (abs >= 1) return `${trim(tb)} TB`;
  return `${trim(tb * 1_000, 0)} GB`;
}

function trim(n: number, maxFractionDigits = 1): string {
  return n.toLocaleString('en-US', {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0
  });
}
