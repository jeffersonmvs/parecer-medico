import * as React from "react";

/* Stat tile — a headline number is often clearer than a chart. */
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "routine" | "urgent" | "emergency" | "primary";
}) {
  const color: Record<string, string> = {
    default: "var(--fg)",
    routine: "var(--routine)",
    urgent: "var(--urgent)",
    emergency: "var(--emergency)",
    primary: "var(--primary)",
  };
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-bold tabular-nums"
        style={{ color: color[tone] }}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}

/* Horizontal magnitude bars, single hue. */
export function BarList({
  data,
  unit = "",
  color = "var(--primary)",
}: {
  data: { label: string; value: number; sub?: string }[];
  unit?: string;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0)
    return <p className="text-sm text-fg-muted">Sem dados.</p>;
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="truncate pr-2 font-medium">{d.label}</span>
            <span className="tabular-nums text-fg-muted">
              {d.value}
              {unit}
              {d.sub ? ` · ${d.sub}` : ""}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(4, (d.value / max) * 100)}%`,
                background: color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* Donut for a small, labeled distribution (status colors + legend). */
export function Donut({
  data,
  size = 160,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
          <circle r={r} fill="none" stroke="var(--line)" strokeWidth={12} />
          {total > 0 &&
            data.map((d) => {
              const frac = d.value / total;
              const len = frac * c;
              const seg = (
                <circle
                  key={d.label}
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={12}
                  strokeDasharray={`${Math.max(0, len - 2)} ${c - Math.max(0, len - 2)}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                />
              );
              offset += len;
              return seg;
            })}
        </g>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-[var(--fg)] font-bold"
          style={{ fontSize: size * 0.2 }}
        >
          {total}
        </text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ background: d.color }}
            />
            <span className="text-fg-muted">{d.label}</span>
            <span className="font-semibold tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* A simple line chart for a single series over time. */
export function LineChart({
  points,
  height = 140,
  color = "var(--primary)",
}: {
  points: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const width = 480;
  const pad = { l: 8, r: 8, t: 10, b: 22 };
  const max = Math.max(1, ...points.map((p) => p.value));
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: pad.l + i * step,
    y: pad.t + innerH - (p.value / max) * innerH,
    ...p,
  }));
  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const area = `${path} L ${coords[coords.length - 1]?.x ?? pad.l} ${pad.t + innerH} L ${pad.l} ${pad.t + innerH} Z`;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="max-w-full"
      preserveAspectRatio="none"
    >
      <path d={area} fill={color} opacity={0.12} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c) => (
        <circle key={c.label} cx={c.x} cy={c.y} r={3} fill={color} />
      ))}
      {coords.map((c, i) =>
        i % Math.ceil(points.length / 6 || 1) === 0 ? (
          <text
            key={`t-${c.label}`}
            x={c.x}
            y={height - 6}
            textAnchor="middle"
            className="fill-[var(--fg-muted)]"
            style={{ fontSize: 10 }}
          >
            {c.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/* Hour-of-day activity as a compact heat row (sequential single hue). */
export function HeatRow({
  values,
}: {
  values: number[]; // length 24
}) {
  const max = Math.max(1, ...values);
  return (
    <div>
      <div className="flex gap-0.5">
        {values.map((v, h) => {
          const intensity = v / max;
          return (
            <div
              key={h}
              title={`${h}h — ${v} chamado(s)`}
              className="h-8 flex-1 rounded-sm"
              style={{
                background:
                  v === 0
                    ? "var(--surface-2)"
                    : `color-mix(in srgb, var(--primary) ${20 + intensity * 80}%, transparent)`,
              }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-fg-muted">
        <span>00h</span>
        <span>06h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>
    </div>
  );
}
