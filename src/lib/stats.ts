import { db, type DayRow } from './db';
import { dayKey, addDays } from './dates';
import { project, studyHours, splitFor, type Projection } from './engine';
import { knownCount, forecast } from './srs';
import type { Course, Settings } from './store';

export interface Stats {
  today: string;
  days: DayRow[];
  byDate: Map<string, DayRow>;
  todayMinutes: number;
  streak: number;
  known: number;
  introduced: number;
  projections: Projection[];
  target: Projection;
  forecast: { date: string; count: number }[];
  weekMinutes: { start: string; minutes: number }[];
  retention: number | null;
  missedThisMonth: number;
}

export function dayMinutes(d?: DayRow): number {
  return d ? studyHours(d) * 60 : 0;
}

export async function loadStats(course: Course, s: Settings): Promise<Stats> {
  const today = dayKey();
  const days = (await db.days.toArray()).sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map(days.map(d => [d.date, d]));
  const known = await knownCount();
  const introduced = await db.cards.where('dir').equals('listen').count();
  const plan = { startDate: s.startDate, minutesPerDay: s.minutesPerDay, daysPerWeek: s.daysPerWeek };
  const projections = course.milestones.map(m => project(m, plan, days, known, today));
  const target = projections.find(p => p.milestone.id === s.target) ?? projections[projections.length - 1];

  // streak: consecutive days with at least 5 minutes, counting back from today (or yesterday)
  let streak = 0;
  let k = dayMinutes(byDate.get(today)) >= 5 ? today : addDays(today, -1);
  while (dayMinutes(byDate.get(k)) >= 5) {
    streak++;
    k = addDays(k, -1);
  }

  // minutes per week, last 12 weeks (weeks start Monday)
  const weekMinutes: { start: string; minutes: number }[] = [];
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const thisMonday = addDays(today, -dow);
  for (let w = 11; w >= 0; w--) {
    const start = addDays(thisMonday, -7 * w);
    let minutes = 0;
    for (let i = 0; i < 7; i++) minutes += dayMinutes(byDate.get(addDays(start, i)));
    weekMinutes.push({ start, minutes });
  }

  // recall rate over the last 30 days (Good/Easy on review-state cards)
  const since = Date.now() - 30 * 86400000;
  const recent = await db.reviews.where('ts').above(since).filter(r => r.state === 2).toArray();
  const retention = recent.length >= 20 ? recent.filter(r => r.rating >= 3).length / recent.length : null;

  // missed planned days this month (since start)
  const monthStart = today.slice(0, 8) + '01';
  let missedThisMonth = 0;
  for (let d = monthStart > s.startDate ? monthStart : s.startDate; d < today; d = addDays(d, 1)) {
    if (dayMinutes(byDate.get(d)) < 1) missedThisMonth++;
  }

  return {
    today,
    days,
    byDate,
    todayMinutes: dayMinutes(byDate.get(today)),
    streak,
    known,
    introduced,
    projections,
    target,
    forecast: await forecast(7),
    weekMinutes,
    retention,
    missedThisMonth
  };
}

export function planSplit(s: Settings) {
  return splitFor(s.minutesPerDay);
}
