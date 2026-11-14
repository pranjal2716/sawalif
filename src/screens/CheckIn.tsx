import { useEffect, useState } from 'preact/hooks';
import { db, bumpDay, type CheckinRow } from '../lib/db';
import { dayKey, fmtDay } from '../lib/dates';
import { loadCourse, getSettings, useProgressTick } from '../lib/store';
import { loadStats, type Stats } from '../lib/stats';
import { Heatmap } from '../components/Charts';

const ENERGY = ['Drained', 'Low', 'OK', 'Good', 'Sharp'];
const REAL = [0, 5, 10, 15, 30, 60];

export function CheckInForm({ onSaved, compact }: { onSaved?: () => void; compact?: boolean }) {
  const today = dayKey();
  const [prev, setPrev] = useState<CheckinRow | null>(null);
  const [energy, setEnergy] = useState(3);
  const [real, setReal] = useState(0);
  const [note, setNote] = useState('');
  useEffect(() => {
    db.checkins.get(today).then(c => {
      if (c) {
        setPrev(c);
        setEnergy(c.energy);
        setReal(c.reallife);
        setNote(c.note);
      }
    });
  }, []);
  const save = async () => {
    await db.checkins.put({ date: today, energy, reallife: real, note, ts: Date.now() });
    const delta = real - (prev?.reallife ?? 0);
    if (delta) await bumpDay(today, { reallife: delta });
    else window.dispatchEvent(new CustomEvent('sawalif:progress'));
    setPrev({ date: today, energy, reallife: real, note, ts: Date.now() });
    onSaved?.();
  };
  return (
    <div class="stack">
      <div>
        <b>How's your energy today?</b>
        <div class="chips" style={{ marginTop: 8 }}>
          {ENERGY.map((e, i) => (
            <button key={e} class="chip" aria-pressed={energy === i + 1} onClick={() => setEnergy(i + 1)}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <div>
        <b>Real Arabic since your last check-in</b>
        <div class="muted small">Chats with colleagues, a taxi, a café. It counts toward your hours at half weight.</div>
        <div class="chips" style={{ marginTop: 8 }}>
          {REAL.map(m => (
            <button key={m} class="chip" aria-pressed={real === m} onClick={() => setReal(m)}>
              {m === 0 ? 'None' : `${m} min`}
            </button>
          ))}
        </div>
      </div>
      {!compact && (
        <label class="field">
          <span>Note (optional)</span>
          <textarea value={note} onInput={e => setNote((e.target as HTMLTextAreaElement).value)} placeholder="A phrase you heard, something you want to learn…" />
        </label>
      )}
      <div class="row">
        <button class="btn primary" onClick={save}>
          {prev ? 'Update check-in' : 'Check in'}
        </button>
        {prev && <span class="muted small">Checked in today.</span>}
      </div>
    </div>
  );
}

export function CheckInScreen() {
  const tick = useProgressTick();
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<CheckinRow[]>([]);
  const [plan, setPlan] = useState({ minutes: 20, start: dayKey() });
  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([loadCourse(), getSettings()]);
      setPlan({ minutes: s.minutesPerDay, start: s.startDate });
      setStats(await loadStats(c, s));
      setHistory((await db.checkins.toArray()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30));
    })();
  }, [tick]);
  return (
    <div class="page stack-l">
      <header>
        <h1>Check-in</h1>
        <p class="lede">A quick daily note on energy and any real Arabic you used. Your streak counts days with at least 5 minutes of study.</p>
      </header>
      <div class="panel">
        <CheckInForm />
      </div>
      {stats && (
        <div class="panel">
          <div class="spread" style={{ marginBottom: 12 }}>
            <h3>{stats.streak ? `${stats.streak}-day streak` : 'No streak yet'}</h3>
            <span class="tiny">Darker squares mean more of your daily plan done</span>
          </div>
          <Heatmap byDate={stats.byDate} today={stats.today} planMinutes={plan.minutes} start={plan.start} />
        </div>
      )}
      {history.some(h => h.note || h.reallife) && (
        <div class="section">
          <h2>Recent notes</h2>
          <table class="list">
            <tbody>
              {history
                .filter(h => h.note || h.reallife)
                .map(h => (
                  <tr key={h.date}>
                    <td style={{ width: 130 }}>{fmtDay(h.date)}</td>
                    <td style={{ width: 120 }} class="muted">{h.reallife ? `${h.reallife} min real` : ''}</td>
                    <td>{h.note}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
