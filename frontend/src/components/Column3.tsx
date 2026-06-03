import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import { useStore } from '../store';
import { MOCK_DATASET } from '../mockData';

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children, dark }: { children: string; dark: boolean }) {
  return (
    <div style={{
      padding: '10px 16px 6px',
      borderBottom: `1px solid ${dark ? '#27272a' : '#e2e8f0'}`,
    }}>
      <span style={{
        fontSize: 10, fontWeight: 500,
        color: dark ? '#52525b' : '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.07em',
      }}>
        {children}
      </span>
    </div>
  );
}

// ─── Signal quality metrics ───────────────────────────────────────────────────
function SignalDistortion({ psnr, ssim, dark }: { psnr: number; ssim: number; dark: boolean }) {
  const bd = dark ? '#27272a' : '#e2e8f0';
  const textPrimary = dark ? '#f8fafc' : '#0f172a';
  const textMuted = dark ? '#71717a' : '#94a3b8';

  const Metric = ({ fullName, value, unit }: { fullName: string; value: string; unit: string }) => (
    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${bd}` }}>
      <div style={{ fontSize: 11, color: textMuted, marginBottom: 6 }}>{fullName}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em',
          color: textPrimary,
        }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: textMuted }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <Metric fullName="Peak Signal-to-Noise Ratio" value={psnr.toFixed(2)} unit="dB" />
      <Metric fullName="Structural Similarity Index" value={ssim.toFixed(4)} unit="" />
    </div>
  );
}

// ─── Complexity graph ─────────────────────────────────────────────────────────
function ComplexityGraph({ timings, dark }: { timings: Record<string, number>; dark: boolean }) {
  const bd = dark ? '#27272a' : '#e2e8f0';
  const textMuted = dark ? '#52525b' : '#94a3b8';
  const textSub = dark ? '#3f3f46' : '#cbd5e1';

  const data = useMemo(() => {
    const entries = Object.entries(timings);
    return entries.map(([stage, us], i) => ({
      stage: stage.replace('2D-', '').substring(0, 10),
      actual: us,
      theoretical: 18440 * ((i + 1) / entries.length) * 0.85,
    }));
  }, [timings]);

  const TooltipContent = ({ active, payload: pl, label }: any) => {
    if (!active || !pl?.[0]) return null;
    return (
      <div style={{
        background: dark ? '#18181b' : '#ffffff',
        border: `1px solid ${bd}`,
        padding: '7px 11px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11, borderRadius: 4,
      }}>
        <div style={{ color: dark ? '#e4e4e7' : '#0f172a', marginBottom: 4 }}>{label}</div>
        {pl.map((p: any) => (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {p.value.toFixed(0)}μs
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{
        padding: '0 16px 8px',
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11, color: dark ? '#a1a1aa' : '#64748b',
      }}>
        <span>Execution timings (μs)</span>
        <span style={{ color: textMuted, fontSize: 10 }}>N = pixel area</span>
      </div>

      <div style={{ height: 176 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 16, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid stroke={dark ? '#1f1f23' : '#f1f5f9'} strokeDasharray="3 3" />
            <XAxis
              dataKey="stage"
              tick={{ fontFamily: "'JetBrains Mono'", fontSize: 8, fill: textMuted }}
              axisLine={{ stroke: bd }} tickLine={false}
            />
            <YAxis
              tick={{ fontFamily: "'JetBrains Mono'", fontSize: 8, fill: textMuted }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            />
            <Tooltip content={<TooltipContent />} />
            <Line
              type="monotone" dataKey="theoretical" name="O(N log N) ref"
              stroke={dark ? '#3f3f46' : '#cbd5e1'} strokeWidth={1.5} strokeDasharray="5 4"
              dot={false}
            />
            <Line
              type="monotone" dataKey="actual" name="actual"
              stroke="#f59e0b" strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#fbbf24' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stage breakdown */}
      <div style={{ padding: '8px 16px 0' }}>
        {Object.entries(timings).map(([stage, us]) => (
          <div key={stage} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '3px 0',
            borderBottom: `1px solid ${dark ? '#111113' : '#f8fafc'}`,
          }}>
            <span style={{ fontSize: 10, color: dark ? '#71717a' : '#64748b' }}>{stage}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                height: 3, borderRadius: 2,
                width: `${Math.max(4, (us / 20000) * 80)}px`,
                background: us > 10000 ? '#f59e0b' : us > 3000 ? '#a78bfa' : '#10b981',
              }} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color: dark ? '#e4e4e7' : '#334155',
                minWidth: 56, textAlign: 'right',
              }}>
                {us.toLocaleString()}μs
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Memory profiler ──────────────────────────────────────────────────────────
function MemoryProfiler({ peakBytes, timings, dark }: { peakBytes: number; timings: Record<string, number>; dark: boolean }) {
  const bd = dark ? '#27272a' : '#e2e8f0';
  const textMuted = dark ? '#52525b' : '#94a3b8';
  const peakMB = (peakBytes / 1024 / 1024).toFixed(1);

  const stages = Object.keys(timings);
  const data = stages.map((stage, i) => ({
    stage: stage.replace('2D-', '').substring(0, 10),
    heap: Math.round(peakBytes * 0.1 + (peakBytes * 0.9 * (i + 1) / stages.length) * (0.85 + Math.sin(i) * 0.15)),
  }));
  if (data.length > 0) data[data.length - 1].heap = Math.round(peakBytes * 0.3);

  const TooltipContent = ({ active, payload: pl, label }: any) => {
    if (!active || !pl?.[0]) return null;
    return (
      <div style={{
        background: dark ? '#18181b' : '#ffffff',
        border: `1px solid ${bd}`, padding: '6px 10px',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11, borderRadius: 4,
      }}>
        <div style={{ color: dark ? '#e4e4e7' : '#0f172a', marginBottom: 2 }}>{label}</div>
        <div style={{ color: '#a78bfa' }}>{(pl[0].value / 1024 / 1024).toFixed(1)} MB</div>
      </div>
    );
  };

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{
        padding: '0 16px 8px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 11, color: dark ? '#a1a1aa' : '#64748b',
      }}>
        <span>Heap usage estimate</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, fontWeight: 600,
          color: dark ? '#c4b5fd' : '#7c3aed',
          padding: '1px 7px',
          border: `1px solid ${dark ? '#4c1d95' : '#ddd6fe'}`,
          borderRadius: 4,
          background: dark ? '#1a0e2d' : '#faf5ff',
        }}>
          {peakMB} MB peak
        </span>
      </div>

      <div style={{ height: 136 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 16, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid stroke={dark ? '#1f1f23' : '#f1f5f9'} strokeDasharray="3 3" />
            <XAxis
              dataKey="stage"
              tick={{ fontFamily: "'JetBrains Mono'", fontSize: 8, fill: textMuted }}
              axisLine={{ stroke: bd }} tickLine={false}
            />
            <YAxis
              tick={{ fontFamily: "'JetBrains Mono'", fontSize: 8, fill: textMuted }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `${(v / 1024 / 1024).toFixed(0)}M`}
            />
            <Tooltip content={<TooltipContent />} />
            <ReferenceLine
              y={peakBytes} stroke={dark ? '#4c1d95' : '#ddd6fe'} strokeDasharray="4 3"
              label={{ value: 'peak', position: 'right', fontSize: 8, fill: dark ? '#a78bfa' : '#7c3aed', fontFamily: "'JetBrains Mono'" }}
            />
            <Line
              type="monotone" dataKey="heap"
              stroke="#a78bfa" strokeWidth={2}
              dot={{ fill: '#a78bfa', r: 3, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Column 3 root ────────────────────────────────────────────────────────────
export default function Column3() {
  const { theme, dataset } = useStore();
  const dark = theme === 'dark';

  const ds = dataset ?? MOCK_DATASET;
  const { psnr, ssim, layer_timings_us, memory_peak_bytes } = ds.metrics;

  return (
    <div>
      <SectionLabel dark={dark}>Signal quality</SectionLabel>
      <SignalDistortion psnr={psnr} ssim={ssim} dark={dark} />

      <SectionLabel dark={dark}>Execution timing</SectionLabel>
      <ComplexityGraph timings={layer_timings_us} dark={dark} />

      <SectionLabel dark={dark}>Memory</SectionLabel>
      <MemoryProfiler peakBytes={memory_peak_bytes} timings={layer_timings_us} dark={dark} />
    </div>
  );
}
