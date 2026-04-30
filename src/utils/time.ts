export function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function minutesToUnits(mins: string): string {
  const m = parseFloat(mins);
  if (isNaN(m) || m <= 0) return "";
  return (m / 60).toFixed(2);
}

export function minutesToTimeSpent(mins: string): string {
  const m = parseFloat(mins);
  if (isNaN(m) || m <= 0) return "";

  const totalMinutes = Math.round(m);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export function decimalHoursToTimeSpent(hours: string): string {
  const trimmed = hours.trim();
  const durationMatch = trimmed.match(/^(\d+):(\d{1,2})$/);

  if (durationMatch) {
    const h = Number(durationMatch[1]);
    const m = Number(durationMatch[2]);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      return `${h}:${String(m).padStart(2, "0")}`;
    }
  }

  const h = parseFloat(trimmed);
  if (isNaN(h) || h <= 0) return "";
  return minutesToTimeSpent(String(h * 60));
}

export function calcActualTime(start: string, end: string): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diffMin = eh * 60 + em - (sh * 60 + sm);
  if (diffMin < 0) diffMin += 24 * 60;
  return (diffMin / 60).toFixed(2);
}
