import { useState, useEffect, useRef } from 'react';
import type { StepPayload } from '../../types';

interface Props { payload: StepPayload; theme: 'dark' | 'light'; }

// JPEG zigzag traversal for 8×8 block
const ZIGZAG_SEQ: [number, number][] = [
  [0,0],[0,1],[1,0],[2,0],[1,1],[0,2],[0,3],[1,2],[2,1],[3,0],
  [4,0],[3,1],[2,2],[1,3],[0,4],[0,5],[1,4],[2,3],[3,2],[4,1],
  [5,0],[6,0],[5,1],[4,2],[3,3],[2,4],[1,5],[0,6],[0,7],[1,6],
  [2,5],[3,4],[4,3],[5,2],[6,1],[7,0],[7,1],[6,2],[5,3],[4,4],
  [3,5],[2,6],[1,7],[2,7],[3,6],[4,5],[5,4],[6,3],[7,2],[7,3],
  [6,4],[5,5],[4,6],[3,7],[4,7],[5,6],[6,5],[7,4],[7,5],[6,6],
  [5,7],[6,7],[7,6],[7,7],
];

function qCellBg(v: number, min: number, max: number): string {
  const t = (v - min) / (max - min || 1);
  const hue = 220 - t * 180;
  return `hsla(${hue},75%,${55 + t * 8}%,${0.18 + t * 0.62})`;
}

function dctCellBg(v: number, maxAbs: number): string {
  if (maxAbs === 0) return 'transparent';
  const t = Math.max(-1, Math.min(1, v / maxAbs));
  if (t < -0.02) return `hsl(220,${70 + (-t) * 20}%,${98 + t * 48}%)`;
  if (t > 0.02) return `hsl(${48 - t * 22},95%,${98 - t * 46}%)`;
  return '#f8f8f8';
}

function resultCellBg(v: number, maxAbs: number): string {
  if (maxAbs === 0) return 'transparent';
  const t = Math.abs(v) / maxAbs;
  if (v === 0) return 'transparent';
  return v > 0 ? `hsl(48,95%,${98 - t * 46}%)` : `hsl(220,${70 + t * 20}%,${98 - t * 48}%)`;
}

interface MatrixGridProps {
  cells: number[][];
  bgFn: (v: number, r: number, c: number) => string;
  textFn?: (v: number) => string;
  sweepIdx: number | null;
  dark: boolean;
  label: string;
  formula?: string;
  onHover?: (v: number, r: number, c: number, rect: DOMRect) => void;
  onLeave?: () => void;
}

function MatrixGrid({ cells, bgFn, textFn, sweepIdx, dark, label, formula, onHover, onLeave }: MatrixGridProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
        {formula && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{formula}</span>}
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 1, border: '1px solid var(--border)', borderRadius: 4,
        background: 'var(--border)',
      }}>
        {cells.flat().map((v, idx) => {
          const r = Math.floor(idx / 8), c = idx % 8;
          const isSweep = sweepIdx !== null && ZIGZAG_SEQ[sweepIdx]?.[0] === r && ZIGZAG_SEQ[sweepIdx]?.[1] === c;
          return (
            <div
              key={idx}
              className={isSweep ? 'sweep-cell' : ''}
              onMouseEnter={e => onHover?.(v, r, c, (e.target as HTMLElement).getBoundingClientRect())}
              onMouseLeave={onLeave}
              style={{
                aspectRatio: '1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 7, fontFamily: 'var(--font-mono)',
                background: bgFn(v, r, c),
                color: dark ? '#e4e4e7' : '#0f172a',
                position: 'relative',
                transition: 'box-shadow 0.1s',
              }}
            >
              {textFn ? textFn(v) : (Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Step3QMatrix({ payload, theme }: Props) {
  const [qFactor, setQFactor] = useState(1.0);
  const [sweepIdx, setSweepIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const sweepRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dark = theme === 'dark';

  const dctBlock = payload.step2_dct_coefficients.slice(0, 8).map(r => r.slice(0, 8));
  const qBase = payload.step3_q_matrix;

  // Scale Q matrix by qFactor (local — no re-pipeline)
  const qScaled = qBase.map(row => row.map(v => Math.max(1, v * qFactor)));

  // Result = round(DCT / Q)
  const result = dctBlock.map((row, r) =>
    row.map((v, c) => Math.round(v / (qScaled[r]?.[c] ?? 1)))
  );

  const maxAbsDCT = Math.max(...dctBlock.flat().map(Math.abs), 1);
  const qMin = Math.min(...qScaled.flat());
  const qMax = Math.max(...qScaled.flat(), 1);
  const maxAbsResult = Math.max(...result.flat().map(Math.abs), 1);

  // Animated sweep on mount / payload change
  useEffect(() => {
    setSweepIdx(0);
    let idx = 0;

    const step = () => {
      idx++;
      if (idx < 64) {
        setSweepIdx(idx);
        sweepRef.current = setTimeout(step, 50);
      } else {
        setSweepIdx(null);
      }
    };

    sweepRef.current = setTimeout(step, 50);
    return () => { if (sweepRef.current) clearTimeout(sweepRef.current); };
  }, [payload]);

  // Stats from result
  const flatResult = result.flat();
  const nonZero = flatResult.filter(v => v !== 0);
  const sparsityPct = ((flatResult.length - nonZero.length) / flatResult.length * 100).toFixed(1);
  const maxStep = Math.max(...qScaled.flat()).toFixed(1);
  const minStep = Math.min(...qScaled.flat()).toFixed(1);
  const avgStep = (qScaled.flat().reduce((a, b) => a + b, 0) / 64).toFixed(1);

  // Current sweep cell annotation
  const curPos = sweepIdx !== null ? ZIGZAG_SEQ[sweepIdx] : null;
  const curDCT = curPos ? (dctBlock[curPos[0]]?.[curPos[1]] ?? 0) : null;
  const curQ   = curPos ? (qScaled[curPos[0]]?.[curPos[1]] ?? 1) : null;
  const curRes = curPos ? (result[curPos[0]]?.[curPos[1]] ?? 0) : null;

  const handleHover = (v: number, r: number, c: number, rect: DOMRect) => {
    const d = dctBlock[r]?.[c] ?? 0;
    const q = qScaled[r]?.[c] ?? 1;
    const res = result[r]?.[c] ?? 0;
    setTooltip({ x: rect.right + 6, y: rect.top, content: `[${r},${c}]  DCT=${d.toFixed(1)}  ÷  Q=${q.toFixed(1)}  =  ${res}` });
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* LEFT PANE — Three panels */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Three-panel grid — equal columns, no horizontal scroll needed */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <div style={{ fontSize: 9, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>DCT F[u,v]</div>
            <MatrixGrid
              label="" formula=""
              cells={dctBlock} sweepIdx={sweepIdx} dark={dark}
              bgFn={(v) => dctCellBg(v, maxAbsDCT)}
              onHover={handleHover} onLeave={() => setTooltip(null)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <div style={{ fontSize: 9, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>÷ Q×{qFactor.toFixed(2)}</div>
            <MatrixGrid
              label="" formula=""
              cells={qScaled} sweepIdx={sweepIdx} dark={dark}
              bgFn={(v) => qCellBg(v, qMin, qMax)}
              textFn={v => v >= 100 ? v.toFixed(0) : v.toFixed(v >= 10 ? 0 : 1)}
              onHover={handleHover} onLeave={() => setTooltip(null)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <div style={{ fontSize: 9, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>= round(F÷Q)</div>
            <MatrixGrid
              label="" formula=""
              cells={result} sweepIdx={sweepIdx} dark={dark}
              bgFn={(v) => v === 0 ? 'transparent' : resultCellBg(v, maxAbsResult)}
              textFn={v => v.toFixed(0)}
              onHover={handleHover} onLeave={() => setTooltip(null)}
            />
          </div>
        </div>

        {/* Sweep annotation */}
        {curPos && curDCT !== null && (
          <div style={{
            padding: '8px 14px', border: '1px solid var(--success)',
            borderRadius: 6, background: dark ? 'rgba(5,150,105,0.08)' : 'rgba(5,150,105,0.06)',
            fontFamily: 'var(--font-mono)', fontSize: 12,
            display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
          }}>
            <span style={{ color: 'var(--text-3)' }}>[{curPos[0]},{curPos[1]}]</span>
            <span style={{ color: 'var(--text-1)' }}>{curDCT.toFixed(1)}</span>
            <span style={{ color: 'var(--text-3)' }}>÷</span>
            <span style={{ color: 'var(--warning)' }}>{curQ?.toFixed(1)}</span>
            <span style={{ color: 'var(--text-3)' }}>=</span>
            <span style={{ color: curRes === 0 ? 'var(--text-3)' : 'var(--success)', fontWeight: 700 }}>{curRes}</span>
            {curRes === 0 && <span style={{ color: 'var(--text-3)', fontSize: 10 }}>zeroed out</span>}
          </div>
        )}

        {/* Stat row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            ['Max Q step', maxStep],
            ['Min Q step', minStep],
            ['Avg Q step', avgStep],
            ['Sparsity', `${sparsityPct}%`],
          ].map(([label, value]) => (
            <div key={label} style={{
              padding: '5px 12px', border: '1px solid var(--border)',
              borderRadius: 6, background: 'var(--surface)',
            }}>
              <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />

      {/* RIGHT PANE — Q slider */}
      <div style={{ width: 155, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0, alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', alignSelf: 'flex-start' }}>
          Q Factor
        </span>

        <div style={{
          fontSize: 36, fontWeight: 800, fontFamily: 'var(--font-mono)',
          color: 'var(--text-1)', letterSpacing: '-0.02em',
        }}>
          {qFactor.toFixed(2)}
        </div>

        <input
          type="range" min="0.1" max="10" step="0.1"
          value={qFactor}
          onChange={e => setQFactor(parseFloat(e.target.value))}
          style={{ writingMode: 'vertical-lr', direction: 'rtl', height: 200, accentColor: 'var(--accent)', cursor: 'pointer' }}
        />

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[['10.0', 'max compression'], ['5.0', 'heavy loss'], ['1.0', 'standard'], ['0.1', 'near-lossless']].map(([v, label]) => (
            <div key={v} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{v}</span>
              <span style={{ color: 'var(--text-3)' }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{
          padding: '6px 10px', borderRadius: 6,
          background: qFactor > 5 ? 'rgba(220,38,38,0.1)' : qFactor > 2 ? 'rgba(215,119,6,0.1)' : 'rgba(5,150,105,0.1)',
          border: `1px solid ${qFactor > 5 ? 'var(--error)' : qFactor > 2 ? 'var(--warning)' : 'var(--success)'}`,
          fontSize: 11, color: qFactor > 5 ? 'var(--error)' : qFactor > 2 ? 'var(--warning)' : 'var(--success)',
          textAlign: 'center',
        }}>
          {qFactor > 5 ? 'Heavy compression' : qFactor > 2 ? 'Balanced' : 'Low compression'}
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
