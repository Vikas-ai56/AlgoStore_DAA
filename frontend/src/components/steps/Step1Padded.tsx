import { useEffect, useRef } from 'react';
import type { StepPayload } from '../../types';

interface Props {
  payload: StepPayload;
  originalDims: [number, number];
  paddedDims: [number, number];
  theme: 'dark' | 'light';
}

function drawPixels(canvas: HTMLCanvasElement | null, grid: number[][], rows: number, cols: number) {
  if (!canvas || rows === 0 || cols === 0) return;
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(cols, rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = Math.min(255, Math.max(0, grid[r]?.[c] ?? 128));
      const i = (r * cols + c) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '6px 14px', border: '1px solid var(--border)',
      borderRadius: 6, background: 'var(--surface)',
    }}>
      <span style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-1)', marginTop: 2 }}>{value}</span>
    </div>
  );
}

export default function Step1Padded({ payload, originalDims, paddedDims, theme }: Props) {
  const origRef = useRef<HTMLCanvasElement>(null);
  const padRef  = useRef<HTMLCanvasElement>(null);
  const dark = theme === 'dark';

  const grid = payload.step1_padded_pixels;
  const [padH, padW] = paddedDims;
  const [origH, origW] = originalDims;

  // Compute the visual (downscaled) original size within the padded grid
  const MAX_DIM = 128;
  const scale = MAX_DIM / Math.max(origH, origW);
  const visH = Math.round(origH * scale);
  const visW = Math.round(origW * scale);

  const deltaH = padH - visH;
  const deltaW = padW - visW;

  // Left canvas: original content only
  useEffect(() => {
    drawPixels(origRef.current, grid, visH, visW);
  }, [grid, visH, visW]);

  // Right canvas: full padded grid + green overlay
  useEffect(() => {
    const canvas = padRef.current;
    if (!canvas) return;
    drawPixels(canvas, grid, padH, padW);
    const ctx = canvas.getContext('2d')!;

    // Green semi-transparent fill on pad region
    ctx.fillStyle = 'rgba(26,107,60,0.30)';
    if (deltaW > 0) ctx.fillRect(visW, 0, deltaW, padH);
    if (deltaH > 0) ctx.fillRect(0, visH, padW, deltaH);

    // Dashed green border around pad area
    ctx.strokeStyle = 'rgba(26,107,60,0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    if (deltaW > 0) ctx.strokeRect(visW + 0.5, 0.5, deltaW - 1, padH - 1);
    if (deltaH > 0) ctx.strokeRect(0.5, visH + 0.5, padW - 1, deltaH - 1);
    ctx.setLineDash([]);

    // 8×8 block grid
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 0.5;
    for (let r8 = 0; r8 <= padH; r8 += 8) {
      ctx.beginPath(); ctx.moveTo(0, r8); ctx.lineTo(padW, r8); ctx.stroke();
    }
    for (let c8 = 0; c8 <= padW; c8 += 8) {
      ctx.beginPath(); ctx.moveTo(c8, 0); ctx.lineTo(c8, padH); ctx.stroke();
    }

    // Original boundary dashed amber line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    if (deltaW > 0 || deltaH > 0) ctx.strokeRect(0.5, 0.5, visW - 1, visH - 1);
    ctx.setLineDash([]);
  }, [grid, padH, padW, visH, visW, deltaH, deltaW]);

  const canvasStyle: React.CSSProperties = {
    display: 'block', width: '100%', height: 'auto',
    imageRendering: 'pixelated',
    border: '1px solid var(--border)', borderRadius: 4,
    background: '#000',
  };

  // Ruler: 300-unit viewBox spanning padW px
  const RW = 300;
  const ticks = Array.from({ length: Math.ceil(padW / 8) + 1 }, (_, i) => i * 8).filter(p => p <= padW);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* LEFT PANE — Original */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Original
        </div>
        <canvas ref={origRef} style={canvasStyle} />
        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
          Downscaled source — no padding. Shows only the content area{' '}
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>{visW}×{visH}px</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Chip label="Original file" value={`${origW}×${origH}`} />
          <Chip label="Downscaled" value={`${visW}×${visH}`} />
          <Chip label="Added" value={`+${deltaW}×${deltaH}px`} />
        </div>
      </div>

      <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />

      {/* RIGHT PANE — Padded */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Padded
          </span>
          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-3)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 14, height: 8, border: '1px dashed #f59e0b', borderRadius: 1 }} />
              original bounds
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 14, height: 8, background: 'rgba(26,107,60,0.35)', borderRadius: 1 }} />
              pad region
            </span>
          </div>
        </div>

        <canvas ref={padRef} style={canvasStyle} />

        {/* Pixel ruler SVG */}
        <svg width="100%" height="30" viewBox={`0 0 ${RW} 30`} preserveAspectRatio="none"
          style={{ overflow: 'visible' }}>
          {/* Track */}
          <rect x={0} y={12} width={RW} height={10} fill={dark ? '#18181b' : '#f1f5f9'} stroke="var(--border)" strokeWidth={0.5} />
          {/* Pad fill on track */}
          {deltaW > 0 && (
            <rect x={(visW / padW) * RW} y={12} width={((deltaW) / padW) * RW} height={10}
              fill="rgba(26,107,60,0.2)" stroke="none" />
          )}
          {/* Ticks */}
          {ticks.map(px => {
            const x = (px / padW) * RW;
            return (
              <g key={px}>
                <line x1={x} y1={12} x2={x} y2={px % 16 === 0 ? 24 : 20} stroke={dark ? '#3f3f46' : '#cbd5e1'} strokeWidth={0.5} />
                {px % 16 === 0 && px < padW && (
                  <text x={x} y={10} fontSize={6} fill={dark ? '#52525b' : '#94a3b8'} textAnchor="middle">{px}</text>
                )}
              </g>
            );
          })}
          {/* Original boundary */}
          {deltaW > 0 && (() => {
            const x = (visW / padW) * RW;
            return (
              <>
                <line x1={x} y1={8} x2={x} y2={28} stroke="#f59e0b" strokeWidth={1.5} />
                <text x={x - 2} y={8} fontSize={7} fill="#f59e0b" textAnchor="end">{visW}</text>
                <text x={(x + RW) / 2} y={19} fontSize={6} fill={dark ? '#10b981' : '#059669'} textAnchor="middle">+{deltaW}px pad</text>
              </>
            );
          })()}
          {/* End label */}
          <text x={RW} y={10} fontSize={6} fill={dark ? '#52525b' : '#94a3b8'} textAnchor="end">{padW}</text>
        </svg>

        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
          Padded to next 8×8 block boundary —{' '}
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>{padW}×{padH}px</span>
          {' '}({Math.ceil(padW / 8) * Math.ceil(padH / 8)} blocks)
        </div>
      </div>
    </div>
  );
}
