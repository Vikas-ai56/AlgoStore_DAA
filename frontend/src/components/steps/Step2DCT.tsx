import { useState, useMemo } from 'react';
import type { StepPayload } from '../../types';

interface Props { payload: StepPayload; theme: 'dark' | 'light'; }

type Mode = 'spatial' | 'frequency';

// Band: 0=DC, 1=Low-AC, 2=Mid-AC, 3=High-AC
function cellBand(r: number, c: number): 0 | 1 | 2 | 3 {
  if (r === 0 && c === 0) return 0;
  const s = r + c;
  if (s <= 2) return 1;
  if (s <= 5) return 2;
  return 3;
}

function dctCellBg(v: number, maxAbs: number): string {
  if (maxAbs === 0) return 'transparent';
  const t = Math.max(-1, Math.min(1, v / maxAbs));
  if (t < -0.02) {
    const i = -t;
    return `hsl(220,${70 + i * 20}%,${98 - i * 48}%)`;
  }
  if (t > 0.02) {
    return `hsl(${48 - t * 22},95%,${98 - t * 46}%)`;
  }
  return '#f8f8f8';
}

function spatialCellBg(v: number): string {
  return `rgb(${v},${v},${v})`;
}

const BAND_COLORS = ['var(--success)', 'var(--accent)', 'var(--warning)', 'var(--error)'];
const BAND_LABELS = ['DC', 'Low-AC', 'Mid-AC', 'High-AC'];

export default function Step2DCT({ payload, theme }: Props) {
  const [mode, setMode] = useState<Mode>('frequency');
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const dark = theme === 'dark';

  const dctBlock = payload.step2_dct_coefficients.slice(0, 8).map(r => r.slice(0, 8));
  const spatialBlock = payload.step1_padded_pixels.slice(0, 8).map(r => r.slice(0, 8));

  const maxAbsDCT = Math.max(...dctBlock.flat().map(Math.abs), 1);
  const selectedBand = selectedCell ? cellBand(selectedCell[0], selectedCell[1]) : null;

  // Energy per band (sum of squared coefficients)
  const bandEnergy = useMemo(() => {
    const e = [0, 0, 0, 0];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        e[cellBand(r, c)] += Math.pow(dctBlock[r]?.[c] ?? 0, 2);
      }
    }
    return e;
  }, [dctBlock]);

  const maxEnergy = Math.max(...bandEnergy, 1);
  const dcValue = dctBlock[0]?.[0] ?? 0;

  // SVG bar chart dimensions
  const BAR_H = 160;
  const BAR_W = 36;
  const GAP = 8;
  const SVG_W = 4 * (BAR_W + GAP);
  const SVG_H = BAR_H + 40;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* LEFT PANE */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Toggle pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', borderRadius: 20,
            border: '1px solid var(--border)',
            overflow: 'hidden', background: 'var(--surface)',
          }}>
            {(['spatial', 'frequency'] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: '5px 16px', border: 'none', cursor: 'pointer',
                fontSize: 12, fontFamily: 'var(--font-sans)',
                background: mode === m ? 'var(--accent)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text-2)',
                transition: 'all 0.3s',
                fontWeight: mode === m ? 600 : 400,
              }}>
                {m === 'spatial' ? 'Spatial' : 'Frequency'}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {mode === 'spatial' ? '8×8 raw pixel block' : '8×8 DCT coefficient block'} — click cell to inspect band
          </span>
        </div>

        {/* 8×8 Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 1, border: '1px solid var(--border)', borderRadius: 4,
          background: 'var(--border)',
          maxWidth: 360,
          transition: 'opacity 0.3s',
        }}>
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 8 }, (_, c) => {
              const dctV = dctBlock[r]?.[c] ?? 0;
              const spV  = Math.min(255, Math.max(0, spatialBlock[r]?.[c] ?? 0));
              const band = cellBand(r, c);
              const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
              const isHighlightedBand = selectedBand !== null && band === selectedBand && !isSelected;

              const bg = mode === 'frequency'
                ? dctCellBg(dctV, maxAbsDCT)
                : spatialCellBg(spV);

              const textColor = mode === 'frequency'
                ? (Math.abs(dctV / maxAbsDCT) > 0.6 ? '#000' : (dark ? '#1f1f23' : '#0f172a'))
                : (spV > 128 ? '#000' : '#fff');

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => setSelectedCell(isSelected ? null : [r, c])}
                  onMouseEnter={e => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    const content = mode === 'frequency'
                      ? `[${r},${c}] = ${dctV.toFixed(1)}  band: ${BAND_LABELS[band]}`
                      : `[${r},${c}] = ${spV}`;
                    setTooltip({ x: rect.right + 4, y: rect.top, content });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    aspectRatio: '1',
                    background: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: mode === 'frequency' ? 7 : 8,
                    fontFamily: 'var(--font-mono)',
                    color: textColor,
                    cursor: 'pointer',
                    outline: isSelected ? '2px solid var(--success)' : isHighlightedBand ? '1px solid var(--accent)' : 'none',
                    outlineOffset: '-1px',
                    transition: 'outline 0.15s',
                    position: 'relative',
                    zIndex: isSelected ? 2 : 1,
                    userSelect: 'none',
                  }}
                >
                  {mode === 'frequency'
                    ? (Math.abs(dctV) >= 1 ? dctV.toFixed(0) : dctV.toFixed(1))
                    : spV}
                </div>
              );
            })
          )}
        </div>

        {/* DC chip */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px',
          border: '1px solid var(--border)',
          borderRadius: 6, background: 'var(--surface)',
          alignSelf: 'flex-start',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            padding: '1px 6px', borderRadius: 3,
            background: 'var(--success)', color: '#fff',
            fontFamily: 'var(--font-mono)',
          }}>DC</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
            {dcValue.toFixed(1)}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
            {((dcValue * dcValue / bandEnergy.reduce((a, b) => a + b, 1)) * 100).toFixed(0)}% of total energy
          </span>
        </div>
      </div>

      <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />

      {/* RIGHT PANE — Energy bands */}
      <div style={{ width: 220, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Frequency Energy
        </span>

        <svg width="100%" height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ overflow: 'visible' }}>
          {bandEnergy.map((e, i) => {
            const barH = Math.max(4, (e / maxEnergy) * BAR_H);
            const x = i * (BAR_W + GAP);
            const y = BAR_H - barH;
            const isActive = selectedBand === i;
            const color = BAND_COLORS[i];

            return (
              <g key={i}>
                {/* Bar track */}
                <rect x={x} y={0} width={BAR_W} height={BAR_H}
                  fill={dark ? '#18181b' : '#f1f5f9'} rx={3} />
                {/* Bar fill */}
                <rect x={x} y={y} width={BAR_W} height={barH}
                  fill={color} rx={3} opacity={isActive ? 1 : 0.65}
                  style={{ transition: 'opacity 0.2s' }}
                />
                {isActive && (
                  <rect x={x - 2} y={y - 2} width={BAR_W + 4} height={barH + 4}
                    fill="none" stroke={color} strokeWidth={2} rx={4}
                    style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                  />
                )}
                {/* Label */}
                <text x={x + BAR_W / 2} y={BAR_H + 14} fontSize={9} fill={dark ? '#a1a1aa' : '#64748b'} textAnchor="middle">{BAND_LABELS[i]}</text>
                {/* Value */}
                <text x={x + BAR_W / 2} y={Math.max(y - 4, 10)} fontSize={8} fill={color} textAnchor="middle" fontWeight={600}>
                  {e > 1000 ? `${(e / 1000).toFixed(1)}k` : e.toFixed(0)}
                </text>
              </g>
            );
          })}
        </svg>

        <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.6 }}>
          Click any heatmap cell to highlight its frequency band.
          DC holds most energy; high-AC bands approach zero after quantization.
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {BAND_LABELS.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: BAND_COLORS[i], flexShrink: 0 }} />
              <span style={{ color: 'var(--text-2)' }}>{label}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', color: 'var(--text-1)', fontSize: 10 }}>
                {((bandEnergy[i] / bandEnergy.reduce((a, b) => a + b, 1)) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
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
