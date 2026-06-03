import { useEffect, useRef, useState, useCallback } from 'react';
import type { StepPayload } from '../../types';

interface Props {
  payload: StepPayload;
  originalDims: [number, number];
  theme: 'dark' | 'light';
}

const W = 600, H = 400;

export default function Step8Reconstruct({ payload, originalDims, theme }: Props) {
  const origRef = useRef<HTMLCanvasElement>(null);
  const reconRef = useRef<HTMLCanvasElement>(null);
  const [sliderPct, setSliderPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dark = theme === 'dark';

  const origGrid = payload.step1_padded_pixels;
  const reconGrid = payload.step8_reconstructed_pixels;
  const [origH, origW] = originalDims;

  const drawGrid = (canvas: HTMLCanvasElement | null, grid: number[][], label: string) => {
    if (!canvas || grid.length === 0) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    const rows = Math.min(grid.length, origH);
    const cols = Math.min((grid[0]?.length ?? 0), origW);
    const scaleX = W / origW, scaleY = H / origH;

    const img = ctx.createImageData(W, H);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = Math.min(255, Math.max(0, grid[r][c]));
        const px0x = Math.round(c * scaleX), px1x = Math.round((c + 1) * scaleX);
        const px0y = Math.round(r * scaleY), px1y = Math.round((r + 1) * scaleY);
        for (let y = px0y; y < px1y; y++) {
          for (let x = px0x; x < px1x; x++) {
            const idx = (y * W + x) * 4;
            img.data[idx] = v; img.data[idx+1] = v; img.data[idx+2] = v; img.data[idx+3] = 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    // Label overlay
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, 80, 22);
    ctx.fillStyle = label === 'ORIGINAL' ? '#10b981' : '#f59e0b';
    ctx.font = '600 9px "JetBrains Mono", monospace';
    ctx.fillText(label, 6, 14);
  };

  useEffect(() => {
    drawGrid(origRef.current, origGrid, 'ORIGINAL');
    drawGrid(reconRef.current, reconGrid, 'IDCT');
  }, [origGrid, reconGrid, origH, origW]);

  const onMouseDown = useCallback(() => setDragging(true), []);
  const onMouseUp = useCallback(() => setDragging(false), []);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    setSliderPct(pct);
  }, [dragging]);

  const bd = dark ? '#27272a' : '#e4e4e7';

  // Per-pixel difference stats
  const diffs: number[] = [];
  for (let r = 0; r < Math.min(origGrid.length, reconGrid.length); r++) {
    const row1 = origGrid[r], row2 = reconGrid[r];
    if (!row1 || !row2) continue;
    for (let c = 0; c < Math.min(row1.length, row2.length); c++) {
      diffs.push(Math.abs((row1[c] ?? 0) - (row2[c] ?? 0)));
    }
  }
  const maxDiff = diffs.length > 0 ? Math.max(...diffs) : 0;
  const avgDiff = diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: dark ? '#a1a1aa' : '#71717a' }}>
          IDCT Reconstruction — drag separator to compare
        </span>
        <div style={{ display: 'flex', gap: 16, fontFamily: '"JetBrains Mono", monospace', fontSize: 11 }}>
          <span style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
            max Δ: <span style={{ color: '#ef4444' }}>{maxDiff}</span>
          </span>
          <span style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
            avg Δ: <span style={{ color: '#f59e0b' }}>{avgDiff.toFixed(1)}</span>
          </span>
        </div>
      </div>

      {/* Comparison viewport */}
      <div
        ref={containerRef}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          flex: 1, position: 'relative',
          border: `1px solid ${bd}`, borderRadius: 4,
          overflow: 'hidden', background: '#000',
          cursor: dragging ? 'col-resize' : 'default',
          userSelect: 'none',
        }}
      >
        {/* Full reconstructed canvas (right side) */}
        <canvas
          ref={reconRef} width={W} height={H}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
        />

        {/* Original canvas clipped to left portion */}
        <div style={{
          position: 'absolute', inset: 0,
          clipPath: `inset(0 ${100 - sliderPct}% 0 0)`,
          transition: dragging ? 'none' : 'clip-path 0.05s',
        }}>
          <canvas
            ref={origRef} width={W} height={H}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
          />
        </div>

        {/* Separator line */}
        <div
          onMouseDown={onMouseDown}
          style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${sliderPct}%`,
            width: 2,
            background: 'cyan',
            boxShadow: '0 0 8px rgba(0, 255, 255, 0.6)',
            cursor: 'col-resize',
            transform: 'translateX(-1px)',
          }}
        >
          {/* Drag handle */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 24, height: 24, borderRadius: '50%',
            background: '#000',
            border: '2px solid cyan',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'cyan', fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
            cursor: 'col-resize',
          }}>
            ⟺
          </div>
        </div>

        {/* Side labels floating */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
          color: '#10b981', padding: '2px 8px',
          background: 'rgba(0,0,0,0.7)', borderRadius: 3,
          pointerEvents: 'none',
          opacity: sliderPct > 15 ? 1 : 0, transition: 'opacity 0.2s',
        }}>ORIGINAL</div>
        <div style={{
          position: 'absolute', top: 10, right: 10,
          fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
          color: '#f59e0b', padding: '2px 8px',
          background: 'rgba(0,0,0,0.7)', borderRadius: 3,
          pointerEvents: 'none',
          opacity: sliderPct < 85 ? 1 : 0, transition: 'opacity 0.2s',
        }}>IDCT (LOSSY)</div>
      </div>

      {/* Diff bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: dark ? '#52525b' : '#a1a1aa' }}>
          pixel error distribution
        </span>
        <div style={{ height: 8, background: dark ? '#18181b' : '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${Math.min(100, (avgDiff / 25) * 100)}%`,
            background: 'linear-gradient(to right, #10b981, #f59e0b, #ef4444)',
            borderRadius: 4, transition: 'width 0.5s',
          }} />
        </div>
      </div>
    </div>
  );
}
