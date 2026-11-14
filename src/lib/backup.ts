import { db } from './db';
import { dayKey } from './dates';

const TABLES = ['cards', 'reviews', 'days', 'checkins', 'kv', 'flags', 'lessons'] as const;

async function blobToB64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

function b64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}

export async function exportData(includeRecordings = true): Promise<string> {
  const tables: Record<string, any[]> = {};
  for (const t of TABLES) tables[t] = await (db as any)[t].toArray();
  // never write the AI key into backup files
  tables.kv = tables.kv
    .filter((r: any) => r.key !== 'backupDir')
    .map((r: any) => (r.key === 'settings' ? { ...r, value: { ...r.value, geminiKey: '' } } : r));
  if (includeRecordings) {
    const recs = await db.recordings.toArray();
    tables.recordings = await Promise.all(recs.map(async r => ({ itemId: r.itemId, ts: r.ts, type: r.blob.type, b64: await blobToB64(r.blob) })));
  }
  return JSON.stringify({ app: 'sawalif', version: 1, exported: new Date().toISOString(), tables });
}

export async function importData(json: string): Promise<void> {
  const data = JSON.parse(json);
  if (data.app !== 'sawalif') throw new Error('This file is not a Sawalif backup.');
  const keepKey = (await db.kv.get('settings'))?.value?.geminiKey ?? '';
  const keepDir = await db.kv.get('backupDir');
  await db.transaction('rw', [db.cards, db.reviews, db.days, db.checkins, db.kv, db.flags, db.lessons, db.recordings], async () => {
    for (const t of TABLES) {
      await (db as any)[t].clear();
      await (db as any)[t].bulkPut(data.tables[t] ?? []);
    }
    if (data.tables.recordings) {
      await db.recordings.clear();
      await db.recordings.bulkPut(data.tables.recordings.map((r: any) => ({ itemId: r.itemId, ts: r.ts, blob: b64ToBlob(r.b64, r.type) })));
    }
    const s = await db.kv.get('settings');
    if (s) await db.kv.put({ key: 'settings', value: { ...s.value, geminiKey: keepKey } });
    if (keepDir) await db.kv.put(keepDir);
  });
}

export function downloadText(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ---------- automatic backups into a folder you choose (e.g. OneDrive) ----------
export const canPickFolder = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export async function chooseBackupFolder(): Promise<string> {
  const handle = await (window as any).showDirectoryPicker({ id: 'sawalif-backup', mode: 'readwrite' });
  await db.kv.put({ key: 'backupDir', value: handle });
  await backupNow(true);
  return handle.name;
}

export async function backupFolderName(): Promise<string | null> {
  const row = await db.kv.get('backupDir');
  return row?.value?.name ?? null;
}

export type BackupState = 'none' | 'ok' | 'needs-permission' | 'failed';

/** Writes today's backup if the folder is connected. `interactive` may prompt for permission. */
export async function backupNow(interactive = false): Promise<BackupState> {
  const row = await db.kv.get('backupDir');
  if (!row?.value) return 'none';
  const handle = row.value;
  try {
    let perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted' && interactive) perm = await handle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') return 'needs-permission';
    const text = await exportData(true);
    for (const name of ['sawalif-backup-latest.json', `sawalif-backup-${dayKey()}.json`]) {
      const fh = await handle.getFileHandle(name, { create: true });
      const w = await fh.createWritable();
      await w.write(text);
      await w.close();
    }
    await db.kv.put({ key: 'lastBackup', value: new Date().toISOString() });
    return 'ok';
  } catch {
    return 'failed';
  }
}

export async function lastBackup(): Promise<string | null> {
  return (await db.kv.get('lastBackup'))?.value ?? null;
}
