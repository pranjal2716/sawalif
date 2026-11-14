/**
 * A strip of Bedouin sadu weaving. The woven part is what you've done; the bare warp
 * threads are what's left.
 */
let uid = 0;

interface BandProps {
  progress: number; // 0..1
  height?: number;
  width?: number;
  dark?: boolean;
  title?: string;
}

export function Sadu({ progress, height = 30, width = 1000, dark = false, title }: BandProps) {
  const id = `sadu${uid++}`;
  const p = Math.max(0, Math.min(1, progress));
  const unit = height * 1.2;
  const wovenW = p > 0 ? Math.max(width * p, unit) : 0; // always show at least one woven motif once started
  return (
    <svg class="sadu" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title ?? `${Math.round(p * 100)}% woven`} preserveAspectRatio="none">
      <defs>
        <Motif id={id} unit={unit} h={height} />
        <pattern id={`${id}w`} width="5" height={height} patternUnits="userSpaceOnUse">
          <line x1="2.5" x2="2.5" y1="0" y2={height} stroke={dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.2)'} stroke-width="1" />
        </pattern>
      </defs>
      <rect x={wovenW} y="0" width={width - wovenW} height={height} fill={`url(#${id}w)`} />
      {p > 0 && <rect class="weave-in" x="0" y="0" width={wovenW} height={height} fill={`url(#${id})`} />}
    </svg>
  );
}

function Motif({ id, unit, h }: { id: string; unit: number; h: number }) {
  const t = h * 0.22; // teeth height
  const mid = h / 2;
  const d = h * 0.26; // diamond half-height
  const c = unit / 2;
  return (
    <pattern id={id} width={unit} height={h} patternUnits="userSpaceOnUse">
      <rect width={unit} height={h} fill="#a3302a" />
      <path d={`M0 0 L${c / 2} ${t} L${c} 0 Z M${c} 0 L${c * 1.5} ${t} L${unit} 0 Z`} fill="#d99a1e" />
      <path d={`M0 ${h} L${c / 2} ${h - t} L${c} ${h} Z M${c} ${h} L${c * 1.5} ${h - t} L${unit} ${h} Z`} fill="#d99a1e" />
      <path d={`M${c - d} ${mid} L${c} ${mid - d} L${c + d} ${mid} L${c} ${mid + d} Z`} fill="#f2e9d8" />
      <path d={`M${c - d * 0.4} ${mid} L${c} ${mid - d * 0.4} L${c + d * 0.4} ${mid} L${c} ${mid + d * 0.4} Z`} fill="#18233b" />
      <rect x="0" y={mid - 1} width={unit * 0.12} height="2" fill="#f2e9d8" />
      <rect x={unit * 0.88} y={mid - 1} width={unit * 0.12} height="2" fill="#f2e9d8" />
    </pattern>
  );
}

export interface Segment { label: string; target: number; done: number; key: string }

/** Today's session as one band split into its parts, each woven as you go. */
export function SessionBand({ segments, current }: { segments: Segment[]; current?: string }) {
  const total = segments.reduce((s, x) => s + x.target, 0) || 1;
  const W = 1000, H = 34, gap = 8;
  let x = 0;
  const parts = segments.map(s => {
    const w = (s.target / total) * (W - gap * (segments.length - 1));
    const part = { ...s, x, w };
    x += w + gap;
    return part;
  });
  return (
    <div>
      <svg class="sadu" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Today's session progress">
        {parts.map(p => (
          <svg key={p.key} x={p.x} y="0" width={p.w} height={H} viewBox={`0 0 ${p.w} ${H}`} preserveAspectRatio="none">
            <SaduInner w={p.w} h={H} progress={Math.min(1, p.done / Math.max(0.01, p.target))} />
            {current === p.key && <rect x="0.75" y="0.75" width={p.w - 1.5} height={H - 1.5} fill="none" stroke="#e8b04a" stroke-width="2" />}
          </svg>
        ))}
      </svg>
      <div class="band-legend">
        {parts.map(p => (
          <div key={p.key} style={{ width: `${(p.w / W) * 100}%` }}>
            <b>{p.label}</b>
            <div>{Math.min(p.target, Math.round(p.done))} of {p.target} min</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SaduInner({ w, h, progress }: { w: number; h: number; progress: number }) {
  const id = `sadu${uid++}`;
  const unit = h * 1.2;
  const ww = w * progress;
  return (
    <g>
      <defs>
        <Motif id={id} unit={unit} h={h} />
        <pattern id={`${id}w`} width="5" height={h} patternUnits="userSpaceOnUse">
          <line x1="2.5" x2="2.5" y1="0" y2={h} stroke="rgba(255,255,255,0.2)" stroke-width="1" />
        </pattern>
      </defs>
      <rect x={ww} width={w - ww} height={h} fill={`url(#${id}w)`} />
      {progress > 0 && <rect width={ww} height={h} fill={`url(#${id})`} />}
    </g>
  );
}
