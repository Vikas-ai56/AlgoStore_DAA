import { useEffect, useRef, useState, useCallback } from 'react';
import type { StepPayload } from '../../types';

interface Props {
  payload: StepPayload;
  theme: 'dark' | 'light';
  metrics?: {
    psnr: number;
    ssim: number;
    layer_timings_us: Record<string, number>;
    memory_peak_bytes: number;
  };
}

const CW = 480, CH = 320;

function hotRgb(t: number): [number, number, number] {
  const r = Math.min(1, t * 3);
  const g = Math.max(0, Math.min(1, t * 3 - 1));
  const b = Math.max(0, Math.min(1, t * 3 - 2));
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function drawGrid(canvas: HTMLCanvasElement | null, grid: number[][]) {
  if (!canvas || grid.length === 0) return;
  const rows = grid.length, cols = grid[0]?.length ?? 0;
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(CW, CH);
  const scaleX = CW / cols, scaleY = CH / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = Math.min(255, Math.max(0, grid[r]?.[c] ?? 0));
      const px0x = Math.round(c * scaleX), px1x = Math.round((c + 1) * scaleX);
      const px0y = Math.round(r * scaleY), px1y = Math.round((r + 1) * scaleY);
      for (let y = px0y; y < px1y; y++) {
        for (let x = px0x; x < px1x; x++) {
          const idx = (y * CW + x) * 4;
          img.data[idx] = img.data[idx + 1] = img.data[idx + 2] = v;
          img.data[idx + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function drawDiff(canvas: HTMLCanvasElement | null, origGrid: number[][], reconGrid: number[][]) {
  if (!canvas || origGrid.length === 0 || reconGrid.length === 0) return;
  const rows = Math.min(origGrid.length, reconGrid.length);
  const cols = Math.min(origGrid[0]?.length ?? 0, reconGrid[0]?.length ?? 0);
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(CW, CH);

  // Compute diff values first to find max for normalization
  const diffs: number[][] = [];
  let maxDiff = 0;
  for (let r = 0; r < rows; r++) {
    diffs.push([]);
    for (let c = 0; c < cols; c++) {
      const d = Math.abs((origGrid[r]?.[c] ?? 0) - (reconGrid[r]?.[c] ?? 0)) * 10;
      diffs[r].push(d);
      if (d > maxDiff) maxDiff = d;
    }
  }

  const scaleX = CW / cols, scaleY = CH / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = maxDiff > 0 ? Math.min(1, diffs[r][c] / maxDiff) : 0;
      const [rv, gv, bv] = hotRgb(t);
      const px0x = Math.round(c * scaleX), px1x = Math.round((c + 1) * scaleX);
      const px0y = Math.round(r * scaleY), px1y = Math.round((r + 1) * scaleY);
      for (let y = px0y; y < px1y; y++) {
        for (let x = px0x; x < px1x; x++) {
          const idx = (y * CW + x) * 4;
          img.data[idx] = rv; img.data[idx + 1] = gv; img.data[idx + 2] = bv; img.data[idx + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  // Colormap legend strip at bottom
  for (let x = 0; x < CW; x++) {
    const t = x / (CW - 1);
    const [rv, gv, bv] = hotRgb(t);
    for (let y = CH - 12; y < CH; y++) {
      const idx = (y * CW + x) * 4;
      img.data[idx] = rv; img.data[idx + 1] = gv; img.data[idx + 2] = bv; img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function MetricChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '8px 14px', borderRadius: 8,
      border: `1px solid ${color ? color + '44' : 'var(--border)'}`,
      background: color ? `${color}11` : 'var(--surface)',
      minWidth: 80,
    }}>
      <span style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800, color: color ?? 'var(--text-1)', marginTop: 2 }}>{value}</span>
    </div>
  );
}

export default function Step8Reconstruct({ payload, theme, metrics }: Props) {
  const origRef  = useRef<HTMLCanvasElement>(null);
  const reconRef = useRef<HTMLCanvasElement>(null);
  const diffRef  = useRef<HTMLCanvasElement>(null);
  const [sliderPct, setSliderPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dark = theme === 'dark';

  const origGrid  = payload.step1_padded_pixels;
  const reconGrid = payload.step8_reconstructed_pixels;

  // Per-pixel diff stats
  const { maxDiff, avgDiff, mse } = (() => {
    const diffs: number[] = [];
    for (let r = 0; r < Math.min(origGrid.length, reconGrid.length); r++) {
      const r1 = origGrid[r], r2 = reconGrid[r];
      if (!r1 || !r2) continue;
      for (let c = 0; c < Math.min(r1.length, r2.length); c++) {
        const d = Math.abs((r1[c] ?? 0) - (r2[c] ?? 0));
        diffs.push(d);
      }
    }
    if (diffs.length === 0) return { maxDiff: 0, avgDiff: 0, mse: 0 };
    const max = Math.max(...diffs);
    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const mse = diffs.reduce((a, b) => a + b * b, 0) / diffs.length;
    return { maxDiff: max, avgDiff: avg, mse };
  })();

  useEffect(() => {
    drawGrid(origRef.current, origGrid);
    // Label overlay
    const ctx = origRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, 80, 20);
      ctx.fillStyle = '#10b981';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillText('ORIGINAL', 5, 13);
    }
  }, [origGrid]);

  useEffect(() => {
    drawGrid(reconRef.current, reconGrid);
    const ctx = reconRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, 80, 20);
      ctx.fillStyle = '#f59e0b';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillText('IDCT', 5, 13);
    }
  }, [reconGrid]);

  useEffect(() => {
    drawDiff(diffRef.current, origGrid, reconGrid);
    const ctx = diffRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, 90, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillText('DIFF ×10', 5, 13);
    }
  }, [origGrid, reconGrid]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setSliderPct(Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100)));
  }, [dragging]);

  const canvasStyle: React.CSSProperties = {
    display: 'block', width: '100%', height: 'auto',
    imageRendering: 'pixelated', borderRadius: 4,
    background: '#000',
  };

  const psnr = metrics?.psnr ?? 0;
  const psnrColor = psnr > 35 ? 'var(--success)' : psnr > 28 ? 'var(--warning)' : 'var(--error)';
  const totalTimingUs = metrics
    ? Object.values(metrics.layer_timings_us).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* LEFT PANE — comparison slider + diff */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          IDCT Reconstruction — drag to compare
        </span>

        {/* Comparison slider area */}
        <div
          ref={containerRef}
          onMouseMove={onMouseMove}
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => setDragging(false)}
          style={{
            position: 'relative', borderRadius: 6,
            border: '1px solid var(--border)',
            overflow: 'hidden',
            background: '#000',
            cursor: dragging ? 'col-resize' : 'default',
            userSelect: 'none',
          }}
        >
          {/* Reconstructed (full width, background) */}
          <canvas ref={reconRef} width={CW} height={CH} style={canvasStyle} />

          {/* Original (clipped to left portion) */}
          <div style={{
            position: 'absolute', inset: 0,
            clipPath: `inset(0 ${100 - sliderPct}% 0 0)`,
          }}>
            <canvas ref={origRef} width={CW} height={CH} style={{ ...canvasStyle, position: 'absolute', inset: 0 }} />
          </div>

          {/* Divider */}
          <div
            onMouseDown={() => setDragging(true)}
            style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${sliderPct}%`,
              width: 2, background: 'rgba(255,255,255,0.9)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.3)',
              cursor: 'col-resize',
              transform: 'translateX(-1px)',
            }}
          >
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 26, height: 26, borderRadius: '50%',
              background: '#000', border: '2px solid rgba(255,255,255,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#fff', cursor: 'col-resize',
            }}>⟺</div>
          </div>

          {/* Labels */}
          <div style={{
            position: 'absolute', top: 8, left: 8,
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
            color: '#fff', padding: '2px 7px',
            background: 'rgba(0,0,0,0.55)', borderRadius: 3,
            opacity: sliderPct > 12 ? 1 : 0, transition: 'opacity 0.2s',
          }}>ORIGINAL</div>
          <div style={{
            position: 'absolute', top: 8, right: 8,
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
            color: '#fff', padding: '2px 7px',
            background: 'rgba(0,0,0,0.55)', borderRadius: 3,
            opacity: sliderPct < 88 ? 1 : 0, transition: 'opacity 0.2s',
          }}>IDCT</div>
        </div>

        {/* Difference canvas */}
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 5 }}>
            Difference map (×10 amplified, hot colormap: black→red→yellow→white)
          </div>
          <canvas ref={diffRef} width={CW} height={CH}
            style={{ ...canvasStyle, border: '1px solid var(--border)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-3)', marginTop: 3 }}>
            <span>no error</span><span>max error</span>
          </div>
        </div>
      </div>

      <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />

      {/* RIGHT PANE — quality metrics */}
      <div style={{ width: 220, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Quality Metrics
        </span>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <MetricChip label="PSNR" value={`${psnr.toFixed(2)} dB`} color={psnrColor} />
          <MetricChip label="SSIM" value={(metrics?.ssim ?? 0).toFixed(4)} />
          <MetricChip label="MSE" value={mse.toFixed(1)} />
          <MetricChip label="IDCT time" value={totalTimingUs > 0 ? `${totalTimingUs.toLocaleString()}μs` : '—'} />
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['Max pixel Δ', maxDiff.toFixed(0)],
            ['Avg pixel Δ', avgDiff.toFixed(2)],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-2)' }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-1)' }}>{val}</span>
            </div>
          ))}
        </div>

        {/* PSNR quality scale */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>PSNR quality reference</span>
          {[
            ['>40 dB', 'Excellent', 'var(--success)'],
            ['35–40', 'Good', 'var(--success)'],
            ['28–35', 'Acceptable', 'var(--warning)'],
            ['<28', 'Noticeable loss', 'var(--error)'],
          ].map(([range, label, color]) => (
            <div key={range} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-2)', width: 40 }}>{range}</span>
              <span style={{ color: 'var(--text-3)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Pixel error distribution bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Pixel error distribution</span>
          <div style={{ height: 10, borderRadius: 5, background: 'var(--surface-alt)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, (avgDiff / 25) * 100)}%`,
              background: 'linear-gradient(to right, var(--success), var(--warning), var(--error))',
              borderRadius: 5, transition: 'width 0.5s',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-3)' }}>
            <span>0</span><span>avg={avgDiff.toFixed(1)}</span><span>25</span>
          </div>
        </div>
      </div>
    </div>
  );
}
