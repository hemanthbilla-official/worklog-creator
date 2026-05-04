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

export function normalizeClockTimeTo12Hour(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (twelveHourMatch) {
    const hour = Number(twelveHourMatch[1]);
    const minute = Number(twelveHourMatch[2]);
    const period = twelveHourMatch[3].toUpperCase();

    if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
      return `${hour}:${String(minute).padStart(2, "0")} ${period}`;
    }
  }

  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!twentyFourHourMatch) return trimmed;

  const hour24 = Number(twentyFourHourMatch[1]);
  const minute = Number(twentyFourHourMatch[2]);
  if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) return trimmed;

  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function clockTimeToMinutes(value: string): number | null {
  const normalized = normalizeClockTimeTo12Hour(value);
  const match = normalized.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  if (period === "AM") {
    hour = hour === 12 ? 0 : hour;
  } else {
    hour = hour === 12 ? 12 : hour + 12;
  }

  return hour * 60 + minute;
}

export function timeSpentToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

export function minutesToClockTime12Hour(totalMinutes: number): string {
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function calcActualTime(start: string, end: string): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diffMin = eh * 60 + em - (sh * 60 + sm);
  if (diffMin < 0) diffMin += 24 * 60;
  return (diffMin / 60).toFixed(2);
}
