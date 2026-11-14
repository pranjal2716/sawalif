import Dexie, { type Table } from 'dexie';

export type Dir = 'listen' | 'say';
export type Activity = 'cards' | 'listening' | 'shadowing' | 'speaking' | 'ai' | 'reallife';

export interface CardRow {
  id: string; // `${itemId}:${dir}`
  itemId: string;
  dir: Dir;
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: number;
  introduced: string; // YYYY-MM-DD
}

export interface ReviewRow {
  id?: number;
  cardId: string;
  ts: number;
  rating: number;
  ms: number;
  state: number;
}

export interface DayRow {
  date: string;
  cards: number;
  listening: number;
  shadowing: number;
  speaking: number;
  ai: number;
  reallife: number;
  newCards: number;
  reviews: number;
}

export interface CheckinRow {
  date: string;
  energy: number;
  reallife: number;
  note: string;
  ts: number;
}

export interface KV { key: string; value: any }
export interface RecordingRow { itemId: string; blob: Blob; ts: number }
export interface FlagRow { itemId: string; note: string; ts: number }
export interface LessonRow { id: string; done: number; score: number; plays: number; last: number }

class SawalifDB extends Dexie {
  cards!: Table<CardRow, string>;
  reviews!: Table<ReviewRow, number>;
  days!: Table<DayRow, string>;
  checkins!: Table<CheckinRow, string>;
  kv!: Table<KV, string>;
  recordings!: Table<RecordingRow, string>;
  flags!: Table<FlagRow, string>;
  lessons!: Table<LessonRow, string>;

  constructor() {
    super('sawalif');
    this.version(1).stores({
      cards: 'id, itemId, dir, due, state, introduced',
      reviews: '++id, cardId, ts',
      days: 'date',
      checkins: 'date',
      kv: 'key',
      recordings: 'itemId',
      flags: 'itemId',
      lessons: 'id'
    });
  }
}

export const db = new SawalifDB();

export function emptyDay(date: string): DayRow {
  return { date, cards: 0, listening: 0, shadowing: 0, speaking: 0, ai: 0, reallife: 0, newCards: 0, reviews: 0 };
}

/** Add minutes (or counters) to a day row, creating it if needed. */
export async function bumpDay(date: string, patch: Partial<Omit<DayRow, 'date'>>) {
  await db.transaction('rw', db.days, async () => {
    const row = (await db.days.get(date)) ?? emptyDay(date);
    for (const [k, v] of Object.entries(patch)) {
      (row as any)[k] = ((row as any)[k] ?? 0) + (v as number);
    }
    await db.days.put(row);
  });
  window.dispatchEvent(new CustomEvent('sawalif:progress'));
}

export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* ignore */
  }
  return false;
}
