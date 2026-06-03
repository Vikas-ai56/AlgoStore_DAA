import { useEffect, useRef, useState } from 'react';
import type { StepPayload } from '../../types';

interface Props {
  payload: StepPayload;
  originalDims: [number, number];
  theme: 'dark' | 'light';
}

const CANVAS_W = 480;
const CANVAS_H = 360;

export default function Step1Padded({ payload, originalDims, theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; r: number; c: number; v: number } | null>(null);
  const dark = theme === 'dark';

  const grid = payload.step1_padded_pixels;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const origH = originalDims[0], origW = originalDims[1];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rows === 0 || cols === 0) return;
    const ctx = canvas.getContext('2d')!;
    const scaleX = CANVAS_W / cols;
    const scaleY = CANVAS_H / rows;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw pixel data
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = grid[r][c];
        const isPad = r >= origH || c >= origW;
        ctx.fillStyle = isPad ? '#0a0a0a' : `rgb(${v},${v},${v})`;
        ctx.fillRect(c * scaleX, r * scaleY, scaleX + 0.5, scaleY + 0.5);
      }
    }

    // Orange diagonal hatch on padded region
    ctx.save();
    ctx.strokeStyle = 'rgba(234, 88, 12, 0.55)';
    ctx.lineWidth = 1;
    // Bottom padding band
    if (origH < rows) {
      const padY = origH * scaleY;
      const spacing = 8;
      for (let i = -CANVAS_W; i < CANVAS_H; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, padY + i);
        ctx.lineTo(CANVAS_W, padY + i + CANVAS_W);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(234, 88, 12, 0.06)';
      ctx.fillRect(0, padY, CANVAS_W, CANVAS_H - padY);
    }
    // Right padding band
    if (origW < cols) {
      const padX = origW * scaleX;
      const spacing = 8;
      for (let i = -CANVAS_H; i < CANVAS_W; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(padX + i, 0);
        ctx.lineTo(padX + i + CANVAS_H, CANVAS_H);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(234, 88, 12, 0.06)';
      ctx.fillRect(padX, 0, CANVAS_W - padX, CANVAS_H);
    }

    // 8x8 block grid lines
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.18)';
    ctx.lineWidth = 0.5;
    for (let r8 = 0; r8 <= rows; r8 += 8) {
      ctx.beginPath();
      ctx.moveTo(0, r8 * scaleY);
      ctx.lineTo(CANVAS_W, r8 * scaleY);
      ctx.stroke();
    }
    for (let c8 = 0; c8 <= cols; c8 += 8) {
      ctx.beginPath();
      ctx.moveTo(c8 * scaleX, 0);
      ctx.lineTo(c8 * scaleX, CANVAS_H);
      ctx.stroke();
    }

    // Original boundary
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(0, 0, origW * scaleX, origH * scaleY);
    ctx.setLineDash([]);

    ctx.restore();
  }, [grid, rows, cols, origH, origW]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const scaleX = CANVAS_W / cols;
    const scaleY = CANVAS_H / rows;
    const c = Math.floor(px / scaleX);
    const r = Math.floor(py / scaleY);
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      setTooltip({ x: e.clientX + 12, y: e.clientY + 8, r, c, v: grid[r][c] });
    }
  };

  const bd = dark ? '#27272a' : '#e4e4e7';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: dark ? '#a1a1aa' : '#71717a' }}>
          Padded Grayscale — {cols}×{rows}px (orig: {origW}×{origH})
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', width: 16, height: 8, border: '1.5px dashed #f59e0b', borderRadius: 1 }} />
            <span style={{ color: '#f59e0b' }}>original bounds</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', width: 16, height: 8, background: 'rgba(234,88,12,0.25)', borderRadius: 1 }} />
            <span style={{ color: '#ea580c' }}>pad region</span>
          </span>
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${bd}`,
        borderRadius: 4,
        overflow: 'hidden',
        background: '#000',
      }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        />
      </div>

      {tooltip && (
        <div className="heatmap-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          Block [{Math.floor(tooltip.r / 8).toString().padStart(2, '0')}, {Math.floor(tooltip.c / 8).toString().padStart(2, '0')}] &nbsp;
          px [{tooltip.r}, {tooltip.c}] &nbsp;
          <span style={{ color: '#f59e0b' }}>v={tooltip.v}</span>
          {(tooltip.r >= origH || tooltip.c >= origW) && (
            <span style={{ color: '#ea580c', marginLeft: 8 }}>[PAD]</span>
          )}
        </div>
      )}
    </div>
  );
}
