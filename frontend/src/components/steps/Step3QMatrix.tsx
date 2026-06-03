import { useState } from 'react';
import type { StepPayload } from '../../types';

interface Props { payload: StepPayload; theme: 'dark' | 'light'; }

const Q_LABELS = ['DC', 'AC₁', 'AC₂', 'AC₃', 'AC₄', 'AC₅', 'AC₆', 'HF'];

export default function Step3QMatrix({ payload, theme }: Props) {
  const [qFactor, setQFactor] = useState(1.5);
  const dark = theme === 'dark';
  const bd = dark ? '#27272a' : '#e4e4e7';
  const base = payload.step3_q_matrix;
  const max = Math.max(...base.flat()) * qFactor;

  const cell = (v: number, r: number, c: number) => {
    const scaled = v * qFactor;
    const norm = Math.min(1, scaled / max);
    const hue = 220 - norm * 180; // blue (220) to red (40)
    const alpha = 0.15 + norm * 0.55;
    const isCorner = r === 0 && c === 0;
    return (
      <td
        key={c}
        title={`Q[${r}][${c}] = ${scaled.toFixed(1)}`}
        style={{
          width: 52, height: 44,
          textAlign: 'center',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: isCorner ? 13 : 12,
          fontWeight: isCorner ? 700 : 400,
          color: isCorner ? '#f59e0b' : (dark ? '#e4e4e7' : '#27272a'),
          background: `hsla(${hue}, 80%, 50%, ${alpha})`,
          border: `1px solid ${dark ? '#1f1f22' : '#e8e8ec'}`,
          transition: 'background 0.3s',
          position: 'relative',
          cursor: 'default',
        }}
      >
        {scaled.toFixed(scaled < 10 ? 1 : 0)}
      </td>
    );
  };

  return (
    <div style={{ display: 'flex', gap: 24, padding: 20, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      {/* Q matrix display */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, color: dark ? '#a1a1aa' : '#64748b' }}>
            Quantization Matrix Q[8×8] ×
            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: dark ? '#e4e4e7' : '#334155', marginLeft: 6 }}>
              q={qFactor.toFixed(2)}
            </span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* Row frequency labels */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', paddingTop: 2 }}>
            {Q_LABELS.map((l) => (
              <span key={l} style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 9, color: dark ? '#3f3f46' : '#c4c4c8',
                height: 44, display: 'flex', alignItems: 'center',
              }}>{l}</span>
            ))}
          </div>

          <div>
            {/* Column labels */}
            <div style={{ display: 'flex', marginBottom: 2 }}>
              {Q_LABELS.map((l) => (
                <div key={l} style={{
                  width: 52, textAlign: 'center',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 9, color: dark ? '#3f3f46' : '#c4c4c8',
                }}>{l}</div>
              ))}
            </div>
            <table style={{ borderCollapse: 'collapse', border: `1px solid ${bd}` }}>
              <tbody>
                {base.map((row, r) => (
                  <tr key={r}>
                    {row.map((v, c) => cell(v, r, c))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 120, height: 8, borderRadius: 4,
            background: 'linear-gradient(to right, hsla(220,80%,50%,0.2), hsla(40,80%,50%,0.7))',
            border: `1px solid ${bd}`,
          }} />
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: dark ? '#52525b' : '#a1a1aa' }}>
            low → high quantization step
          </span>
        </div>
      </div>

      {/* Q-factor slider */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        padding: '20px 16px',
        border: `1px solid ${bd}`,
        borderRadius: 6,
        background: dark ? '#111113' : '#f8f8f8',
        minWidth: 120,
      }}>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9, color: dark ? '#52525b' : '#a1a1aa',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          Q FACTOR
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 28, fontWeight: 700,
          color: dark ? '#f8fafc' : '#0f172a',
        }}>
          {qFactor.toFixed(2)}
        </span>
        <input
          type="range" min="0.25" max="8" step="0.25"
          value={qFactor}
          onChange={(e) => setQFactor(parseFloat(e.target.value))}
          style={{
            writingMode: 'vertical-lr',
            direction: 'rtl',
            height: 200,
            accentColor: '#f59e0b',
            cursor: 'pointer',
          }}
        />
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: dark ? '#3f3f46' : '#c4c4c8', textAlign: 'center' }}>
          <div>8.00 ← max</div>
          <div style={{ marginTop: 4 }}>0.25 ← min</div>
        </div>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10, color: dark ? '#a1a1aa' : '#71717a',
          textAlign: 'center', maxWidth: 90,
        }}>
          {qFactor < 1 ? 'lower quality' : qFactor > 2 ? 'high compression' : 'balanced'}
        </div>
      </div>
    </div>
  );
}
