export function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function minutesToUnits(mins: string): string {
  const m = parseFloat(mins);
  if (isNaN(m) || m <= 0) return "";
  return (m / 60).toFixed(2);
}

export function calcActualTime(start: string, end: string): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diffMin = eh * 60 + em - (sh * 60 + sm);
  if (diffMin < 0) diffMin += 24 * 60;
  return (diffMin / 60).toFixed(2);
}
