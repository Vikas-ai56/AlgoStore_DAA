import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import { useStore } from '../store';
import { MOCK_DATASET } from '../mockData';

// ─── Signal Distortion Panel ──────────────────────────────────────────────────
function SignalDistortion({ psnr, ssim, dark }: { psnr: number; ssim: number; dark: boolean }) {
  const bd = dark ? '#27272a' : '#e4e4e7';

  const psnrColor =
    psnr > 40 ? '#10b981' :
    psnr >= 30 ? '#f59e0b' :
    '#ef4444';

  const ssimColor =
    ssim > 0.9 ? '#10b981' :
    ssim >= 0.7 ? '#f59e0b' :
    '#ef4444';

  const Metric = ({
    label, value, unit, color, note,
  }: {
    label: string; value: string; unit: string; color: string; note: string;
  }) => (
    <div style={{
      padding: '14px 16px',
      borderBottom: `1px solid ${bd}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: dark ? '#52525b' : '#a1a1aa',
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
          color: dark ? '#3f3f46' : '#d4d4d8',
        }}>
          {note}
        </span>
      </div>
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em',
          color,
        }}>
          {value}
        </span>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12, color: dark ? '#71717a' : '#a1a1aa',
        }}>
          {unit}
        </span>
      </div>
      {/* Bar */}
      <div style={{ marginTop: 8, height: 3, background: dark ? '#1f1f23' : '#e8e8ec', borderRadius: 2 }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: unit === 'dB'
            ? `${Math.min(100, Math.max(0, ((psnr - 15) / 35) * 100))}%`
            : `${ssim * 100}%`,
          background: color,
          transition: 'width 0.8s ease',
          boxShadow: `0 0 6px ${color}55`,
        }} />
      </div>
    </div>
  );

  return (
    <div>
      <Metric
        label="PSNR" value={psnr.toFixed(2)} unit="dB"
        color={psnrColor}
        note={psnr > 40 ? '✓ excellent' : psnr >= 30 ? '⚠ acceptable' : '✗ degraded'}
      />
      <Metric
        label="SSIM" value={ssim.toFixed(3)} unit=""
        color={ssimColor}
        note={ssim > 0.9 ? '✓ high fidelity' : ssim >= 0.7 ? '⚠ moderate' : '✗ poor'}
      />
    </div>
  );
}

// ─── Complexity Graph ─────────────────────────────────────────────────────────
function ComplexityGraph({
  timings, dark,
}: { timings: Record<string, number>; dark: boolean }) {
  const bd = dark ? '#27272a' : '#e4e4e7';

  const data = useMemo(() => {
    const entries = Object.entries(timings);
    return entries.map(([stage, us], i) => ({
      stage: stage.replace('2D-', '').substring(0, 10),
      actual: us,
      // Theoretical O(N log N) reference scaled to match the DCT stage
      theoretical: 18440 * ((i + 1) / entries.length) * 0.85,
    }));
  }, [timings]);

  const CustomTooltip = ({ active, payload: pl, label }: any) => {
    if (!active || !pl?.[0]) return null;
    return (
      <div style={{
        background: dark ? '#18181b' : '#fff',
        border: `1px solid ${dark ? '#27272a' : '#e4e4e7'}`,
        padding: '8px 12px',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
      }}>
        <div style={{ color: dark ? '#e4e4e7' : '#18181b', marginBottom: 4 }}>{label}</div>
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
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 9, letterSpacing: '0.12em',
        color: dark ? '#52525b' : '#a1a1aa',
        textTransform: 'uppercase',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>Execution Timings (μs)</span>
        <span style={{ color: dark ? '#3f3f46' : '#d4d4d8' }}>N=pixel_area</span>
      </div>

      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 16, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid stroke={dark ? '#1f1f23' : '#f0f0f0'} strokeDasharray="3 3" />
            <XAxis
              dataKey="stage" tick={{
                fontFamily: '"JetBrains Mono"', fontSize: 8,
                fill: dark ? '#52525b' : '#a1a1aa',
              }}
              axisLine={{ stroke: bd }} tickLine={false}
            />
            <YAxis
              tick={{ fontFamily: '"JetBrains Mono"', fontSize: 8, fill: dark ? '#52525b' : '#a1a1aa' }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone" dataKey="theoretical" name="O(N log N) ref"
              stroke="#3f3f46" strokeWidth={1.5} strokeDasharray="5 4"
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
            borderBottom: `1px solid ${dark ? '#111113' : '#f5f5f5'}`,
          }}>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
              color: dark ? '#71717a' : '#a1a1aa',
            }}>
              {stage}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                height: 4, borderRadius: 2,
                width: `${Math.max(4, (us / 20000) * 80)}px`,
                background: us > 10000 ? '#f59e0b' : us > 3000 ? '#a78bfa' : '#10b981',
              }} />
              <span style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
                color: dark ? '#e4e4e7' : '#27272a', minWidth: 56, textAlign: 'right',
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

// ─── Memory Profiler ──────────────────────────────────────────────────────────
function MemoryProfiler({ peakBytes, timings, dark }: { peakBytes: number; timings: Record<string, number>; dark: boolean }) {
  const bd = dark ? '#27272a' : '#e4e4e7';
  const peakMB = (peakBytes / 1024 / 1024).toFixed(1);

  // Simulate memory accumulation across stages
  const stages = Object.keys(timings);
  const data = stages.map((stage, i) => ({
    stage: stage.replace('2D-', '').substring(0, 10),
    heap: Math.round(peakBytes * 0.1 + (peakBytes * 0.9 * (i + 1) / stages.length) * (0.85 + Math.sin(i) * 0.15)),
  }));
  // Final stage dips down (cleanup)
  if (data.length > 0) data[data.length - 1].heap = Math.round(peakBytes * 0.3);

  const CustomTooltip = ({ active, payload: pl, label }: any) => {
    if (!active || !pl?.[0]) return null;
    return (
      <div style={{
        background: dark ? '#18181b' : '#fff',
        border: `1px solid ${bd}`, padding: '6px 10px',
        fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
      }}>
        <div style={{ color: dark ? '#e4e4e7' : '#18181b' }}>{label}</div>
        <div style={{ color: '#a78bfa' }}>{(pl[0].value / 1024 / 1024).toFixed(1)} MB</div>
      </div>
    );
  };

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{
        padding: '0 16px 8px',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 9, letterSpacing: '0.12em',
        color: dark ? '#52525b' : '#a1a1aa',
        textTransform: 'uppercase',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>Memory Footprint</span>
        <span style={{
          color: '#a78bfa', fontWeight: 700, fontSize: 11,
          padding: '1px 8px',
          border: '1px solid #6d28d9',
          borderRadius: 3, background: dark ? '#1a0e2d' : '#f5f3ff',
        }}>
          Peak: {peakMB} MB
        </span>
      </div>

      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 16, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid stroke={dark ? '#1f1f23' : '#f0f0f0'} strokeDasharray="3 3" />
            <XAxis
              dataKey="stage"
              tick={{ fontFamily: '"JetBrains Mono"', fontSize: 8, fill: dark ? '#52525b' : '#a1a1aa' }}
              axisLine={{ stroke: bd }} tickLine={false}
            />
            <YAxis
              tick={{ fontFamily: '"JetBrains Mono"', fontSize: 8, fill: dark ? '#52525b' : '#a1a1aa' }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `${(v / 1024 / 1024).toFixed(0)}M`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={peakBytes} stroke="#ef444455" strokeDasharray="4 3"
              label={{ value: 'peak', position: 'right', fontSize: 8, fill: '#ef4444', fontFamily: '"JetBrains Mono"' }}
            />
            <Line
              type="monotone" dataKey="heap"
              stroke="#a78bfa" strokeWidth={2}
              dot={{ fill: '#a78bfa', r: 3, strokeWidth: 0 }}
              fill="#a78bfa11"
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
  const bd = dark ? '#27272a' : '#e4e4e7';

  const ds = dataset ?? MOCK_DATASET;
  const { psnr, ssim, layer_timings_us, memory_peak_bytes } = ds.metrics;

  const sectionHdr = (title: string) => (
    <div style={{
      padding: '8px 16px',
      borderTop: `1px solid ${bd}`,
      borderBottom: `1px solid ${bd}`,
      background: dark ? '#0d0d0f' : '#f0f0f0',
    }}>
      <span style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 9, letterSpacing: '0.12em',
        color: dark ? '#52525b' : '#a1a1aa',
        textTransform: 'uppercase',
      }}>
        {title}
      </span>
    </div>
  );

  return (
    <div>
      {sectionHdr('Signal Distortion')}
      <SignalDistortion psnr={psnr} ssim={ssim} dark={dark} />

      {sectionHdr('Complexity Graph')}
      <ComplexityGraph timings={layer_timings_us} dark={dark} />

      {sectionHdr('Memory Profiler')}
      <MemoryProfiler peakBytes={memory_peak_bytes} timings={layer_timings_us} dark={dark} />
    </div>
  );
}
