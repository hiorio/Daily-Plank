export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addLocalMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function startOfLocalWeek(date: Date): Date {
  const start = startOfLocalDay(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addLocalDays(start, diff);
}

export function startOfLocalMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isDateInCurrentLocalWeek(dateIso: string, now: Date): boolean {
  const date = new Date(dateIso);
  const weekStart = startOfLocalWeek(now);
  const nextWeekStart = addLocalDays(weekStart, 7);
  return date >= weekStart && date < nextWeekStart;
}

export function countConsecutiveWorkoutDays(completedDateKeys: string[], now: Date): number {
  const completedDays = new Set(completedDateKeys);
  const today = startOfLocalDay(now);
  const todayKey = toLocalDateKey(today);
  const yesterdayKey = toLocalDateKey(addLocalDays(today, -1));

  if (!completedDays.has(todayKey) && !completedDays.has(yesterdayKey)) {
    return 0;
  }

  let cursor = completedDays.has(todayKey) ? today : addLocalDays(today, -1);
  let streak = 0;

  while (completedDays.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }

  return streak;
}
