import { useEffect, useState } from 'preact/hooks';
import { db } from '../lib/db';
import { fmtDay, fmtMonthYear, fmtShort, weekdayShort, diffDays } from '../lib/dates';
import { useCourse, useSettings, useProgressTick } from '../lib/store';
import { loadStats, type Stats } from '../lib/stats';
import { planRates } from '../lib/engine';
import { Sadu } from '../components/Sadu';
import { HoursVsPlan, Heatmap, Bars, Meter } from '../components/Charts';

const BINDING: Record<string, string> = {
  hours: 'study hours',
  words: 'words known',
  listen: 'listening hours',
  speak: 'speaking hours'
};

export function Progress() {
  const course = useCourse();
  const [s] = useSettings();
  const tick = useProgressTick();
  const [stats, setStats] = useState<Stats | null>(null);
  const [cando, setCando] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (course && s) loadStats(course, s).then(setStats);
  }, [course, s, tick]);
  useEffect(() => {
    db.kv.get('cando').then(r => setCando(new Set(r?.value ?? [])));
  }, []);

  if (!course || !s || !stats) return <div class="page">Loading…</div>;
  const t = stats.target;
  const m = t.milestone;
  const rates = planRates({ startDate: s.startDate, minutesPerDay: s.minutesPerDay, daysPerWeek: s.daysPerWeek });
  const slip = t.slipDays;
  const toggle = async (k: string) => {
    const n = new Set(cando);
    n.has(k) ? n.delete(k) : n.add(k);
    setCando(n);
    await db.kv.put({ key: 'cando', value: [...n] });
  };

  return (
    <div class="page wide stack-l">
      <header>
        <h1>Progress</h1>
        <p class="lede">Your deadline is {m.name.toLowerCase()} ({m.level}). Dates update every time you study, from what you actually do.</p>
      </header>

      <section class="deadline">
        <div class="label">You can hold {m.name.toLowerCase()} in Gulf Arabic by</div>
        <div class="date">{t.reached ? 'Reached' : fmtMonthYear(t.onPlan)}</div>
        <div class="sub">
          If you keep to {s.minutesPerDay} minutes a day from today. At your recent pace: <b>{fmtMonthYear(t.atPace)}</b>. Likely range{' '}
          <b>{fmtMonthYear(t.low)}</b> to <b>{fmtMonthYear(t.high)}</b>.
        </div>
        <div class={`slip ${slip > 0 ? 'late' : ''}`}>
          {slip > 0 ? `Missed time has added ${slip} day${slip === 1 ? '' : 's'} to the original date (${fmtDay(t.baseline)})` : slip < 0 ? `Extra study has saved ${-slip} day${slip === -1 ? '' : 's'}` : `On schedule for ${fmtDay(t.baseline)}`}
        </div>
        <div class="ribbon">
          <Sadu progress={t.progress.hours / m.hours} height={28} dark title={`${t.progress.hours.toFixed(1)} of ${m.hours} hours`} />
          <div class="ribbon-legend">
            <span>{t.progress.hours.toFixed(1)} of {m.hours} hours woven</span>
            <span>Slowest part right now: {BINDING[t.binding]}</span>
          </div>
        </div>
      </section>

      <dl class="kpis">
        <div><dt>Streak</dt><dd>{stats.streak} days</dd></div>
        <div><dt>Missed days this month</dt><dd>{stats.missedThisMonth}</dd></div>
        <div><dt>Words known</dt><dd>{stats.known} <span class="tiny">of {stats.introduced} met</span></dd></div>
        <div><dt>Recall rate, 30 days</dt><dd>{stats.retention == null ? '–' : `${Math.round(stats.retention * 100)}%`}</dd></div>
      </dl>

      <section class="section">
        <h2>Milestones</h2>
        <div class="panel">
          {stats.projections.map(p => (
            <div class="ms-row" key={p.milestone.id}>
              <div>
                <div class="ms-name">{p.milestone.name}</div>
                <div class="tiny">{p.milestone.level}{p.milestone.id === s.target ? ', your deadline' : ''}</div>
              </div>
              <div class="ms-bars">
                <Meter label="Study hours" value={p.progress.hours} max={p.milestone.hours} fmt={v => v.toFixed(v < 10 ? 1 : 0)} />
                <Meter label="Words known" value={p.progress.known} max={p.milestone.words} fmt={v => String(Math.round(v))} />
                <Meter label="Listening h" value={p.progress.listen} max={p.milestone.listen} fmt={v => v.toFixed(v < 10 ? 1 : 0)} />
                <Meter label="Speaking h" value={p.progress.speak} max={p.milestone.speak} fmt={v => v.toFixed(v < 10 ? 1 : 0)} />
              </div>
              <div class="ms-dates">
                {p.reached ? (
                  <span class="reached">Reached</span>
                ) : (
                  <>
                    <div><b>{fmtMonthYear(p.onPlan)}</b></div>
                    <div class="tiny">on plan; {fmtMonthYear(p.atPace)} at your pace</div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section class="charts2">
        <div class="panel">
          <HoursVsPlan days={stats.days} start={s.startDate} today={stats.today} planPerDay={rates.hours} />
        </div>
        <div class="panel">
          <div class="chart-title">Minutes per week</div>
          <div class="chart-sub">Last 12 weeks; the line is your weekly plan</div>
          <Bars
            data={stats.weekMinutes.map(w => ({ label: fmtShort(w.start), value: w.minutes }))}
            refValue={s.minutesPerDay * s.daysPerWeek}
            refLabel="plan"
            unit="min"
            highlightLast
            labelEvery={3}
          />
        </div>
        <div class="panel">
          <div class="chart-title">Study calendar</div>
          <div class="chart-sub">Each square is a day; darker means more of the plan done</div>
          <Heatmap byDate={stats.byDate} today={stats.today} planMinutes={s.minutesPerDay} start={s.startDate} />
        </div>
        <div class="panel">
          <div class="chart-title">Reviews coming up</div>
          <div class="chart-sub">Flashcards due over the next 7 days</div>
          <Bars data={stats.forecast.map((f, i) => ({ label: i === 0 ? 'Today' : weekdayShort(f.date), value: f.count }))} unit="cards" />
        </div>
      </section>

      <section class="section">
        <h2>Can you do these yet?</h2>
        <p class="muted small" style={{ marginBottom: 12 }}>Tick them when they're true in real life. A milestone counts when its targets are met and you can tick most of its list; ideally a Gulf Arabic speaker agrees after a five-minute chat.</p>
        <div class="grid2">
          {course.milestones
            .filter(ms => course.milestones.indexOf(ms) <= course.milestones.findIndex(x => x.id === s.target))
            .map(ms => (
              <div class="panel" key={ms.id}>
                <h3>{ms.name}</h3>
                <ul class="checklist">
                  {ms.cando.map((c, i) => {
                    const k = `${ms.id}:${i}`;
                    return (
                      <li key={k}>
                        <label>
                          <input type="checkbox" checked={cando.has(k)} onChange={() => toggle(k)} />
                          {c}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </div>
      </section>

      <p class="tiny">
        How dates are worked out: each milestone needs a number of study hours, words known, listening hours and speaking hours. The date is today plus the longest of those
        countdowns at your planned pace. Missed days push it back about a day each, a little more after long breaks. Started {fmtDay(s.startDate)}, {diffDays(s.startDate, stats.today)} days ago.
      </p>
    </div>
  );
}
