export function formatHours(hours: number): string {
  if (hours === 0) return '0h';
  return `${Math.round(hours * 10) / 10}h`;
}

export function formatMinutesAsHours(minutes: number): string {
  return formatHours(minutes / 60);
}

export function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatTimeShort(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    .replace(' ', '')
    .toLowerCase();
}
