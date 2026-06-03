import { useState } from 'react';
import type { StepPayload } from '../../types';

interface Props { payload: StepPayload; theme: 'dark' | 'light'; }

const ZIGZAG_SEQ: [number, number][] = [
  [0,0],[0,1],[1,0],[2,0],[1,1],[0,2],[0,3],[1,2],[2,1],[3,0],
  [4,0],[3,1],[2,2],[1,3],[0,4],[0,5],[1,4],[2,3],[3,2],[4,1],
  [5,0],[6,0],[5,1],[4,2],[3,3],[2,4],[1,5],[0,6],[0,7],[1,6],
  [2,5],[3,4],[4,3],[5,2],[6,1],[7,0],[7,1],[6,2],[5,3],[4,4],
  [3,5],[2,6],[1,7],[2,7],[3,6],[4,5],[5,4],[6,3],[7,2],[7,3],
  [6,4],[5,5],[4,6],[3,7],[4,7],[5,6],[6,5],[7,4],[7,5],[6,6],
  [5,7],[6,7],[7,6],[7,7],
];

export default function Step4Quantized({ payload, theme }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const dark = theme === 'dark';

  // First 8×8 block
  const block = payload.step4_quantized_blocks.slice(0, 8).map(r => r.slice(0, 8));
  const flat = block.flat();

  const nonZeroCount = flat.filter(v => v !== 0).length;
  const zeroCount = 64 - nonZeroCount;
  const sparsityPct = ((zeroCount / 64) * 100).toFixed(1);

  // Zigzag energy decay values
  const zigzagVals = ZIGZAG_SEQ.map(([r, c]) => Math.abs(block[r]?.[c] ?? 0));
  const maxZig = Math.max(...zigzagVals, 1);

  // SVG dimensions for decay chart
  const SVG_W = 260, SVG_H = 160;
  const PAD_L = 28, PAD_B = 20, PAD_T = 10, PAD_R = 8;
  const chartW = SVG_W - PAD_L - PAD_R;
  const chartH = SVG_H - PAD_T - PAD_B;

  const pts = zigzagVals.map((v, i) => ({
    x: PAD_L + (i / 63) * chartW,
    y: PAD_T + chartH - (v / maxZig) * chartH,
  }));

  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${lineD} L${pts[pts.length - 1].x.toFixed(1)},${PAD_T + chartH} L${pts[0].x.toFixed(1)},${PAD_T + chartH} Z`;

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map(t => ({
    y: PAD_T + chartH - t * chartH,
    label: Math.round(t * maxZig).toString(),
  }));

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* LEFT PANE — 8×8 sparsity map */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Quantized Block [0,0] — Sparsity Map
        </span>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 2, border: '1px solid var(--border)', borderRadius: 6,
          background: 'var(--border)', padding: 2,
          maxWidth: 320,
        }}>
          {flat.map((v, idx) => {
            const r = Math.floor(idx / 8), c = idx % 8;
            const isHovered = hovered === idx;
            const absV = Math.abs(v);
            const opacity = v === 0 ? 1 : Math.min(1, absV / 8 + 0.3);

            let cellBg: string;
            let cellClass = '';
            if (v === 0) {
              cellClass = 'zero-checker';
              cellBg = '';
            } else if (v > 0) {
              cellBg = `rgba(5,150,105,${opacity})`;
            } else {
              cellBg = `rgba(220,38,38,${opacity})`;
            }

            return (
              <div
                key={idx}
                className={v === 0 ? cellClass : ''}
                onMouseEnter={e => {
                  setHovered(idx);
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setTooltip({ x: rect.right + 6, y: rect.top, content: `[${r}][${c}] = ${v}` });
                }}
                onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                style={{
                  aspectRatio: '1',
                  borderRadius: 3,
                  background: v !== 0 ? cellBg : undefined,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontFamily: 'var(--font-mono)',
                  color: v === 0 ? 'var(--text-3)' : '#fff',
                  fontWeight: v !== 0 ? 700 : 400,
                  cursor: 'crosshair',
                  outline: isHovered ? '2px solid var(--accent)' : 'none',
                  outlineOffset: '-1px',
                  transition: 'outline 0.1s',
                  position: 'relative',
                  zIndex: isHovered ? 2 : 1,
                }}
              >
                {v !== 0 ? v : '·'}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 10, color: 'var(--text-3)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(5,150,105,0.7)', display: 'inline-block' }} />
            positive
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(220,38,38,0.7)', display: 'inline-block' }} />
            negative
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="zero-checker" style={{ width: 12, height: 12, borderRadius: 2, border: '1px solid var(--border)', display: 'inline-block' }} />
            zero (discarded)
          </span>
        </div>

        {/* Sparsity bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--text-2)' }}>Sparsity</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>{sparsityPct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-alt)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${sparsityPct}%`, background: 'var(--success)', borderRadius: 4, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              ['Zeros', `${zeroCount}`, 'var(--text-3)'],
              ['Non-zero', `${nonZeroCount}`, 'var(--success)'],
              ['Total', '64', 'var(--text-2)'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)' }}>
                <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />

      {/* RIGHT PANE — Zigzag energy decay */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Energy Decay (Zigzag Scan Order)
        </span>

        <svg width="100%" height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ overflow: 'visible' }}>
          {/* Grid lines */}
          {yTicks.map(tick => (
            <g key={tick.y}>
              <line x1={PAD_L} y1={tick.y} x2={SVG_W - PAD_R} y2={tick.y}
                stroke={dark ? '#27272a' : '#f1f5f9'} strokeWidth={0.5} />
              <text x={PAD_L - 4} y={tick.y + 3} fontSize={7} fill="var(--text-3)" textAnchor="end">{tick.label}</text>
            </g>
          ))}

          {/* Area fill */}
          <path d={areaD} fill="rgba(5,150,105,0.10)" />

          {/* Line */}
          <path d={lineD} fill="none" stroke="var(--success)" strokeWidth={1.5} strokeLinejoin="round" />

          {/* X axis */}
          <line x1={PAD_L} y1={PAD_T + chartH} x2={SVG_W - PAD_R} y2={PAD_T + chartH}
            stroke="var(--border)" strokeWidth={0.5} />

          {/* X axis labels */}
          {[0, 16, 32, 48, 63].map(i => (
            <text key={i} x={PAD_L + (i / 63) * chartW} y={PAD_T + chartH + 12}
              fontSize={7} fill="var(--text-3)" textAnchor="middle">{i}</text>
          ))}

          {/* Hovered dot */}
          {hovered !== null && hovered < 64 && (() => {
            const zigIdx = ZIGZAG_SEQ.findIndex(([rr, cc]) =>
              rr === Math.floor(hovered / 8) && cc === hovered % 8
            );
            if (zigIdx < 0) return null;
            const p = pts[zigIdx];
            if (!p) return null;
            return <circle cx={p.x} cy={p.y} r={3} fill="var(--success)" />;
          })()}

          {/* Axis labels */}
          <text x={PAD_L + chartW / 2} y={SVG_H} fontSize={8} fill="var(--text-3)" textAnchor="middle">zigzag scan position</text>
          <text x={8} y={PAD_T + chartH / 2} fontSize={8} fill="var(--text-3)" textAnchor="middle"
            transform={`rotate(-90, 8, ${PAD_T + chartH / 2})`}>|coeff|</text>
        </svg>

        <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>
          JPEG zigzag scan reads DC→low-AC→high-AC. The steep dropoff confirms most energy concentrates at low frequencies (top-left of the 8×8 block), enabling RLE to compress long runs of zeros.
        </div>
      </div>

      {tooltip && (
        <div className="heatmap-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
