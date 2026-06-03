import { useEffect, useRef, useState } from 'react';
import { infernoRgb, renderGridToImageData } from '../../utils/colormap';
import type { StepPayload } from '../../types';

interface Props { payload: StepPayload; theme: 'dark' | 'light'; }

const W = 480, H = 360;

export default function Step2DCT({ payload, theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logScale, setLogScale] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; r: number; c: number; v: number } | null>(null);
  const dark = theme === 'dark';

  const grid = payload.step2_dct_coefficients;
  const rows = grid.length, cols = grid[0]?.length ?? 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rows === 0) return;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(W, H);
    renderGridToImageData(grid, img, infernoRgb, logScale);
    ctx.putImageData(img, 0, 0);

    // Block grid overlay
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    const scaleX = W / cols, scaleY = H / rows;
    for (let r8 = 0; r8 <= rows; r8 += 8) {
      ctx.beginPath(); ctx.moveTo(0, r8 * scaleY); ctx.lineTo(W, r8 * scaleY); ctx.stroke();
    }
    for (let c8 = 0; c8 <= cols; c8 += 8) {
      ctx.beginPath(); ctx.moveTo(c8 * scaleX, 0); ctx.lineTo(c8 * scaleX, H); ctx.stroke();
    }
  }, [grid, rows, cols, logScale]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = W / cols, scaleY = H / rows;
    const c = Math.floor((e.clientX - rect.left) / scaleX);
    const r = Math.floor((e.clientY - rect.top) / scaleY);
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      setTooltip({ x: e.clientX + 12, y: e.clientY + 8, r, c, v: grid[r][c] });
    }
  };

  const bd = dark ? '#27272a' : '#e4e4e7';

  // Colorbar
  const barStops = Array.from({ length: 20 }, (_, i) => infernoRgb(i / 19))
    .map(([r, g, b]) => `rgb(${r},${g},${b})`);

  // DC vs AC stat
  const flat = grid.flat();
  const dcVals = [];
  for (let r = 0; r < rows; r += 8) {
    for (let c = 0; c < cols; c += 8) {
      dcVals.push(Math.abs(grid[r]?.[c] ?? 0));
    }
  }
  const maxDC = dcVals.length > 0 ? Math.max(...dcVals) : 0;
  const maxAC = Math.max(...flat.filter((_, i) => {
    const r = Math.floor(i / cols) % 8, c = i % cols % 8;
    return !(r === 0 && c === 0);
  }).map(Math.abs));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, height: '100%' }}>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 16, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: dark ? '#a1a1aa' : '#71717a' }}>
          <span>DCT Coefficients — {cols}×{rows}</span>
          <span style={{ color: '#f59e0b' }}>max(DC)={maxDC.toFixed(1)}</span>
          <span style={{ color: '#a78bfa' }}>max(AC)={maxAC.toFixed(2)}</span>
        </div>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
          fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
          color: dark ? '#e4e4e7' : '#27272a',
        }}>
          <div
            onClick={() => setLogScale(!logScale)}
            style={{
              width: 32, height: 18, borderRadius: 9,
              background: logScale ? '#f59e0b' : (dark ? '#27272a' : '#d4d4d8'),
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 12, height: 12, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: logScale ? 17 : 3,
              transition: 'left 0.2s',
            }} />
          </div>
          Log₂ Scale  <span style={{ color: dark ? '#52525b' : '#a1a1aa' }}>log(|F|+1)</span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 12, flex: 1, overflow: 'hidden' }}>
        {/* Canvas */}
        <div style={{
          flex: 1, border: `1px solid ${bd}`, borderRadius: 4,
          overflow: 'hidden', background: '#000', position: 'relative',
        }}>
          <canvas
            ref={canvasRef} width={W} height={H}
            style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip(null)}
          />
        </div>

        {/* Colorbar */}
        <div style={{ width: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: dark ? '#52525b' : '#a1a1aa' }}>HIGH</span>
          <div style={{
            flex: 1, width: 16, borderRadius: 3, overflow: 'hidden',
            background: `linear-gradient(to bottom, ${[...barStops].reverse().join(', ')})`,
            border: `1px solid ${bd}`,
          }} />
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: dark ? '#52525b' : '#a1a1aa' }}>LOW</span>
        </div>
      </div>

      {tooltip && (
        <div className="heatmap-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          Block [{Math.floor(tooltip.r / 8).toString().padStart(2, '0')}, {Math.floor(tooltip.c / 8).toString().padStart(2, '0')}] &nbsp;
          freq [{tooltip.r % 8},{tooltip.c % 8}] &nbsp;
          <span style={{ color: '#f59e0b' }}>
            {logScale ? `log=${Math.log(Math.abs(tooltip.v) + 1).toFixed(3)}` : `F=${tooltip.v.toFixed(3)}`}
          </span>
          {tooltip.r % 8 === 0 && tooltip.c % 8 === 0 && <span style={{ color: '#a78bfa', marginLeft: 8 }}>[DC]</span>}
        </div>
      )}
    </div>
  );
}
