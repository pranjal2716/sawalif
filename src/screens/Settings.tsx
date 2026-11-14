import { useEffect, useState } from 'preact/hooks';
import { db } from '../lib/db';
import { useSettings, useCourse } from '../lib/store';
import { dayKey, fmtDay, fmtMonthYear } from '../lib/dates';
import { project } from '../lib/engine';
import { listModels, pickDefaultModel, type ModelInfo } from '../lib/gemini';
import { playItem, voiceStatus, loadAudioIndex, arabicVoices } from '../lib/audio';
import { exportData, importData, downloadText, canPickFolder, chooseBackupFolder, backupFolderName, backupNow, lastBackup } from '../lib/backup';
import { Banner } from '../components/ui';

export function SettingsScreen() {
  const [s, save] = useSettings();
  const course = useCourse();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelMsg, setModelMsg] = useState('');
  const [folder, setFolder] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [voices, setVoices] = useState<{ mp3: number; browser: string | null; count: number } | null>(null);
  const [flags, setFlags] = useState(0);

  useEffect(() => {
    backupFolderName().then(setFolder);
    lastBackup().then(setLast);
    loadAudioIndex().then(() => setTimeout(() => setVoices({ ...voiceStatus(), count: arabicVoices().length }), 500));
    db.flags.count().then(setFlags);
  }, []);

  if (!s || !course) return <div class="page">Loading…</div>;

  const preview = (patch: Partial<typeof s>) => {
    const p = { ...s, ...patch };
    const m = course.milestones.find(x => x.id === p.target)!;
    return project(m, { startDate: dayKey(), minutesPerDay: p.minutesPerDay, daysPerWeek: p.daysPerWeek }, [], 0, dayKey()).onPlan;
  };

  const loadModels = async () => {
    setModelMsg('Loading…');
    try {
      const list = await listModels(s.geminiKey.trim());
      setModels(list);
      const def = s.geminiModel && list.some(m => m.name === s.geminiModel) ? s.geminiModel : pickDefaultModel(list);
      await save({ geminiModel: def });
      setModelMsg(list.length ? `Key works. ${list.length} models available.` : 'Key works, but no suitable models were listed.');
    } catch (e: any) {
      setModelMsg(e.message);
    }
  };

  return (
    <div class="page stack-l">
      <header>
        <h1>Settings</h1>
        <p class="lede">Everything is stored on this PC. Nothing is sent anywhere except audio checks to your browser's speech service and role-plays to Google, if you turn them on.</p>
      </header>

      <section class="panel stack">
        <h2>Plan</h2>
        <div class="grid2">
          <label class="field">
            <span>Minutes a day</span>
            <select value={s.minutesPerDay} onChange={e => save({ minutesPerDay: Number((e.target as HTMLSelectElement).value) })}>
              {[10, 15, 20, 30, 45, 60, 90].map(m => <option key={m} value={m}>{m} minutes</option>)}
            </select>
          </label>
          <label class="field">
            <span>Days a week</span>
            <select value={s.daysPerWeek} onChange={e => save({ daysPerWeek: Number((e.target as HTMLSelectElement).value) })}>
              {[3, 4, 5, 6, 7].map(d => <option key={d} value={d}>{d === 7 ? 'Every day' : `${d} days`}</option>)}
            </select>
          </label>
          <label class="field">
            <span>Deadline milestone</span>
            <select value={s.target} onChange={e => save({ target: (e.target as HTMLSelectElement).value })}>
              {course.milestones.map(m => <option key={m.id} value={m.id}>{m.name} ({m.level})</option>)}
            </select>
          </label>
          <label class="field">
            <span>Start date</span>
            <input type="date" value={s.startDate} max={dayKey()} onChange={e => save({ startDate: (e.target as HTMLInputElement).value || dayKey() })} />
            <small>Missed days are counted from here.</small>
          </label>
        </div>
        <p class="muted small">
          Starting fresh today at this plan, you'd reach {course.milestones.find(m => m.id === s.target)?.name.toLowerCase()} around <b>{fmtMonthYear(preview({}))}</b>. At{' '}
          {s.minutesPerDay < 45 ? `45 minutes a day: ${fmtMonthYear(preview({ minutesPerDay: 45 }))}` : `30 minutes a day: ${fmtMonthYear(preview({ minutesPerDay: 30 }))}`}.
        </p>
      </section>

      <section class="panel stack">
        <h2>Audio</h2>
        <div class="grid2">
          <label class="field">
            <span>Voices</span>
            <select value={s.voice} onChange={e => save({ voice: (e.target as HTMLSelectElement).value as any })}>
              <option value="both">Alternate female and male</option>
              <option value="f">Female only</option>
              <option value="m">Male only</option>
            </select>
          </label>
          <label class="field">
            <span>Speed</span>
            <select value={s.rate} onChange={e => save({ rate: Number((e.target as HTMLSelectElement).value) })}>
              <option value={0.8}>Slower</option>
              <option value={0.9}>A little slower</option>
              <option value={1}>Natural</option>
            </select>
          </label>
          <label class="field">
            <span>English-letter spelling on flashcards</span>
            <select value={s.spelling} onChange={e => save({ spelling: (e.target as HTMLSelectElement).value as any })}>
              <option value="after">Only after I reveal the answer</option>
              <option value="always">Show it with the audio</option>
            </select>
          </label>
          <div>
            <button class="btn" onClick={() => playItem({ id: 'm1-13', ar: 'شلونك؟' }, { voice: s.voice, rate: s.rate })}>Test: shlonak?</button>
            <p class="tiny">
              {voices == null ? 'Checking voices…' : `${voices.mp3} recorded clips. Browser voice: ${voices.browser ?? 'none found'} (${voices.count} Arabic voices).`}
            </p>
          </div>
        </div>
        {voices && !voices.mp3 && !voices.browser && <Banner warn>No Arabic voice is available. Open Sawalif in Microsoft Edge, which includes Microsoft's UAE voices.</Banner>}
      </section>

      <section class="panel stack">
        <h2>AI partner</h2>
        <p class="muted small">
          Uses Google's free Gemini tier. Get a key at{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>, paste it here, then press Load models. Google may use free-tier chats to improve its products, so keep business details out.
        </p>
        <label class="field">
          <span>Gemini API key</span>
          <input type="password" value={s.geminiKey} placeholder="Paste your key" onInput={e => save({ geminiKey: (e.target as HTMLInputElement).value })} autocomplete="off" />
        </label>
        <div class="row">
          <button class="btn" onClick={loadModels} disabled={!s.geminiKey.trim()}>Load models</button>
          <span class="muted small">{modelMsg}</span>
        </div>
        {(models.length > 0 || s.geminiModel) && (
          <label class="field">
            <span>Model</span>
            <select value={s.geminiModel} onChange={e => save({ geminiModel: (e.target as HTMLSelectElement).value })}>
              {!models.some(m => m.name === s.geminiModel) && s.geminiModel && <option value={s.geminiModel}>{s.geminiModel}</option>}
              {models.map(m => <option key={m.name} value={m.name}>{m.displayName} ({m.name})</option>)}
            </select>
            <small>A "Flash" model is fast and has the most generous free limit.</small>
          </label>
        )}
      </section>

      <section class="panel stack">
        <h2>Backup</h2>
        <p class="muted small">Your progress lives in this browser. A backup folder (for example inside OneDrive) gets a fresh copy after each session.</p>
        <div class="row">
          {canPickFolder && (
            <button class="btn" onClick={async () => { try { setFolder(await chooseBackupFolder()); setLast(await lastBackup()); setMsg('Backup folder connected and first backup written.'); } catch { /* cancelled */ } }}>
              {folder ? 'Change backup folder' : 'Choose backup folder'}
            </button>
          )}
          {folder && <button class="btn" onClick={async () => { const r = await backupNow(true); setLast(await lastBackup()); setMsg(r === 'ok' ? 'Backed up.' : 'Could not write to the folder. Choose it again.'); }}>Back up now</button>}
          <span class="muted small">{folder ? `Folder: ${folder}.` : 'No folder yet.'} {last ? `Last backup ${fmtDay(dayKey(new Date(last)))}.` : ''}</span>
        </div>
        <div class="row">
          <button class="btn" onClick={async () => downloadText(`sawalif-backup-${dayKey()}.json`, await exportData(true))}>Download a backup file</button>
          <label class="btn">
            Restore from a file
            <input type="file" accept="application/json" style={{ display: 'none' }} onChange={async e => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (!f) return;
              if (!confirm('Replace everything in Sawalif with this backup?')) return;
              try { await importData(await f.text()); setMsg('Restored. Reloading…'); setTimeout(() => location.reload(), 600); } catch (err: any) { setMsg(err.message); }
            }} />
          </label>
        </div>
        {msg && <Banner>{msg}</Banner>}
      </section>

      <section class="panel stack">
        <h2>Native-speaker check</h2>
        <p class="muted small">{flags ? `${flags} phrase${flags === 1 ? '' : 's'} flagged.` : 'No phrases flagged yet.'} Download the list to share with whoever checks them, or with me to fix the course.</p>
        <div>
          <button class="btn" disabled={!flags} onClick={async () => {
            const rows = await db.flags.toArray();
            const text = rows.map(r => { const it = course.byId.get(r.itemId); return `${r.itemId}\t${it?.tr}\t${it?.en}\t${r.note}`; }).join('\n');
            downloadText(`sawalif-flagged-${dayKey()}.txt`, `id\tspelling\tmeaning\tnote\n${text}`);
          }}>Download flagged phrases</button>
        </div>
      </section>

      <section class="panel stack">
        <h2>Daily reminder</h2>
        <p class="muted small">To open Sawalif automatically every evening, run this once in Windows PowerShell (change 19:00 to suit):</p>
        <pre class="small" style={{ whiteSpace: 'pre-wrap', background: 'var(--bg)', padding: 12, borderRadius: 6 }}>
          {`schtasks /create /tn "Sawalif daily" /sc daily /st 19:00 /tr "cmd /c start msedge https://pranjal2716.github.io/sawalif/#/today" /f`}
        </pre>
      </section>

      <section class="panel stack">
        <h2>Start over</h2>
        <p class="muted small">Deletes all progress, check-ins and recordings on this PC.</p>
        <div>
          <button class="btn danger" onClick={async () => {
            if (prompt('Type DELETE to erase all Sawalif data on this PC') !== 'DELETE') return;
            await db.delete();
            location.reload();
          }}>Erase all data</button>
        </div>
      </section>
    </div>
  );
}
