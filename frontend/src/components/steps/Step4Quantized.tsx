import { useEffect, useRef, useState } from 'react';
import type { StepPayload } from '../../types';

interface Props { payload: StepPayload; theme: 'dark' | 'light'; }

const W = 480, H = 360;

function electricBlueRgb(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  return [
    Math.round(29 + t * (96 - 29)),
    Math.round(78 + t * (165 - 78)),
    Math.round(216 + t * (250 - 216)),
  ];
}

export default function Step4Quantized({ payload, theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; r: number; c: number; v: number } | null>(null);
  const dark = theme === 'dark';
  const grid = payload.step4_quantized_blocks;
  const rows = grid.length, cols = grid[0]?.length ?? 0;
  const zeroPct = (payload.zero_fraction * 100).toFixed(1);

  const maxAbs = Math.max(...grid.flat().map(Math.abs), 1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rows === 0) return;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(W, H);
    const data = img.data;
    const scaleX = W / cols, scaleY = H / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = grid[r][c];
        const px0x = Math.round(c * scaleX), px1x = Math.round((c + 1) * scaleX);
        const px0y = Math.round(r * scaleY), px1y = Math.round((r + 1) * scaleY);
        let cr: number, cg: number, cb: number;
        if (v === 0) {
          cr = 5; cg = 5; cb = 8; // near-black for zeros
        } else {
          [cr, cg, cb] = electricBlueRgb(Math.abs(v) / maxAbs);
        }
        for (let y = px0y; y < px1y; y++) {
          for (let x = px0x; x < px1x; x++) {
            const idx = (y * W + x) * 4;
            data[idx] = cr; data[idx+1] = cg; data[idx+2] = cb; data[idx+3] = 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);

    // Block grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let r8 = 0; r8 <= rows; r8 += 8) {
      ctx.beginPath(); ctx.moveTo(0, r8 * scaleY); ctx.lineTo(W, r8 * scaleY); ctx.stroke();
    }
    for (let c8 = 0; c8 <= cols; c8 += 8) {
      ctx.beginPath(); ctx.moveTo(c8 * scaleX, 0); ctx.lineTo(c8 * scaleX, H); ctx.stroke();
    }
  }, [grid, rows, cols, maxAbs]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: dark ? '#a1a1aa' : '#64748b' }}>
          Quantized DCT blocks (int16) — {cols}×{rows}
        </span>
        <div style={{
          padding: '3px 12px',
          border: `1px solid ${dark ? '#1d3a4a' : '#bfdbfe'}`,
          borderRadius: 4,
          background: dark ? '#0a1929' : '#eff6ff',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12, fontWeight: 600,
          color: dark ? '#60a5fa' : '#2563eb',
        }}>
          Sparsity: {zeroPct}%
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0,
          border: `1px solid ${bd}`, borderRadius: 4,
          overflow: 'hidden', background: '#020204',
        }}>
          <canvas
            ref={canvasRef} width={W} height={H}
            style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip(null)}
          />
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, borderRadius: 2, background: '#050508', border: `1px solid ${bd}`, display: 'inline-block' }} />
          <span style={{ color: dark ? '#52525b' : '#a1a1aa' }}>zero (discarded)</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, borderRadius: 2, background: 'rgb(29,78,216)', display: 'inline-block' }} />
          <span style={{ color: dark ? '#a1a1aa' : '#71717a' }}>low magnitude</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, borderRadius: 2, background: 'rgb(96,165,250)', display: 'inline-block' }} />
          <span style={{ color: dark ? '#a1a1aa' : '#71717a' }}>high magnitude</span>
        </span>
      </div>

      {tooltip && (
        <div className="heatmap-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          Block [{Math.floor(tooltip.r / 8).toString().padStart(2, '0')}, {Math.floor(tooltip.c / 8).toString().padStart(2, '0')}] &nbsp;
          coeff [{tooltip.r % 8},{tooltip.c % 8}] &nbsp;
          {tooltip.v === 0
            ? <span style={{ color: '#52525b' }}>0 [ZERO]</span>
            : <span style={{ color: '#60a5fa' }}>Q={tooltip.v}</span>
          }
        </div>
      )}
    </div>
  );
}
