export const BASELINE_WEEKLY_HOURS = 40;

export function pctToHours(pct: number, weeklyCapacityHours = BASELINE_WEEKLY_HOURS): number {
  return Math.round(((pct / 100) * weeklyCapacityHours) * 10) / 10;
}

export function formatAllocationLabel(pct: number, weeklyCapacityHours = BASELINE_WEEKLY_HOURS): string {
  const hours = pctToHours(pct, weeklyCapacityHours);
  return `${pct}% (${hours}h/wk)`;
}

export function formatDateShort(dateStr: string): string {
  const date = parseIsoDate(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateMedium(dateStr: string): string {
  const date = parseIsoDate(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFormatted = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endFormatted = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startFormatted} – ${endFormatted}`;
}

export function formatRelativeTime(isoTimestamp: string, referenceNow = new Date()): string {
  const date = new Date(isoTimestamp);
  const diffMs = referenceNow.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function parseIsoDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = parseIsoDate(dateStr);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function diffDaysInclusive(startDate: string, endDate: string): number {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
}
