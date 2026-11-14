import { fsrs, generatorParameters, createEmptyCard, Rating, State, type Card, type Grade } from 'ts-fsrs';
import { db, bumpDay, type CardRow, type Dir } from './db';
import { dayKey, addDays, parseDay } from './dates';
import type { Course, Item } from './store';

export { Rating, State };

let cached: { r: number; f: ReturnType<typeof fsrs> } | null = null;
function scheduler(retention = 0.9) {
  if (!cached || cached.r !== retention) {
    cached = { r: retention, f: fsrs(generatorParameters({ request_retention: retention, enable_fuzz: true })) };
  }
  return cached.f;
}

function toCard(row: CardRow): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.last_review ? new Date(row.last_review) : undefined
  };
}

function fromCard(c: Card, base: Pick<CardRow, 'id' | 'itemId' | 'dir' | 'introduced'>): CardRow {
  return {
    ...base,
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review?.getTime()
  };
}

export const cardId = (itemId: string, dir: Dir) => `${itemId}:${dir}`;

/** Preview the next interval for each rating, for button labels. */
export function previewIntervals(row: CardRow, retention: number, now = new Date()): Record<number, string> {
  const f = scheduler(retention);
  const out: Record<number, string> = {};
  const rec = f.repeat(toCard(row), now) as any;
  for (const g of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
    const due: Date = rec[g].card.due;
    out[g] = humanInterval(due.getTime() - now.getTime());
  }
  return out;
}

export function humanInterval(ms: number): string {
  const min = ms / 60000;
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  const h = min / 60;
  if (h < 24) return `${Math.round(h)} h`;
  const d = h / 24;
  if (d < 31) return `${Math.round(d)} d`;
  const mo = d / 30.4;
  if (mo < 12) return `${Math.round(mo)} mo`;
  return `${(d / 365).toFixed(1)} y`;
}

/** First exposure to a new item: creates the listening card and schedules its first short step. */
export async function introduce(item: Item, retention: number): Promise<CardRow> {
  const f = scheduler(retention);
  const now = new Date();
  const base = { id: cardId(item.id, 'listen'), itemId: item.id, dir: 'listen' as Dir, introduced: dayKey(now) };
  const rec = f.next(createEmptyCard(now), now, Rating.Good as Grade);
  const row = fromCard(rec.card, base);
  await db.cards.put(row);
  await bumpDay(dayKey(now), { newCards: 1 });
  return row;
}

export async function review(row: CardRow, rating: Grade, ms: number, retention: number): Promise<CardRow> {
  const f = scheduler(retention);
  const now = new Date();
  const rec = f.next(toCard(row), now, rating);
  const next = fromCard(rec.card, row);
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.put(next);
    await db.reviews.add({ cardId: row.id, ts: now.getTime(), rating, ms, state: row.state });
  });
  await bumpDay(dayKey(now), { reviews: 1 });
  // A listening card that has graduated unlocks the matching speaking card from tomorrow.
  if (row.dir === 'listen' && next.state === State.Review) {
    const sayId = cardId(row.itemId, 'say');
    if (!(await db.cards.get(sayId))) {
      const tomorrow = parseDay(addDays(dayKey(now), 1));
      tomorrow.setHours(4, 0, 0, 0);
      const empty = createEmptyCard(tomorrow);
      await db.cards.put(fromCard(empty, { id: sayId, itemId: row.itemId, dir: 'say', introduced: dayKey(tomorrow) }));
    }
  }
  return next;
}

export async function dueNow(dir?: Dir): Promise<CardRow[]> {
  const now = Date.now();
  const rows = await db.cards.where('due').belowOrEqual(now).toArray();
  return rows.filter(r => !dir || r.dir === dir).sort((a, b) => a.due - b.due);
}

export async function introducedToday(): Promise<number> {
  return db.cards.where('introduced').equals(dayKey()).filter(r => r.dir === 'listen').count();
}

export async function nextNewItems(course: Course, n: number): Promise<Item[]> {
  if (n <= 0) return [];
  const have = new Set((await db.cards.where('dir').equals('listen').primaryKeys()).map(k => String(k).split(':')[0]));
  return course.items.filter(i => !have.has(i.id)).slice(0, n);
}

export async function knownCount(): Promise<number> {
  return db.cards.filter(r => r.dir === 'listen' && r.stability >= 21).count();
}

export async function learnedItemIds(): Promise<Set<string>> {
  const rows = await db.cards.where('dir').equals('listen').toArray();
  return new Set(rows.map(r => r.itemId));
}

/** Reviews due on each of the next `days` days (today includes overdue). */
export async function forecast(days = 7): Promise<{ date: string; count: number }[]> {
  const today = dayKey();
  const out = Array.from({ length: days }, (_, i) => ({ date: addDays(today, i), count: 0 }));
  const all = await db.cards.toArray();
  for (const r of all) {
    const k = dayKey(new Date(r.due));
    if (k <= today) out[0].count++;
    else {
      const idx = out.findIndex(o => o.date === k);
      if (idx > 0) out[idx].count++;
    }
  }
  return out;
}

/** Backlog rule: pause new words when due reviews exceed twice the normal daily load. */
export async function backlogPaused(): Promise<{ paused: boolean; due: number; normal: number }> {
  const due = (await dueNow()).length;
  const since = parseDay(addDays(dayKey(), -14)).getTime();
  const recent = await db.reviews.where('ts').above(since).count();
  const normal = recent / 14;
  return { paused: normal >= 10 && due > 2 * normal, due, normal };
}
