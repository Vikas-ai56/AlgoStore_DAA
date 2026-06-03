import { useState, useRef } from 'react';
import type { StepPayload } from '../../types';

interface Props { payload: StepPayload; theme: 'dark' | 'light'; }

const COLORS = ['#2563eb','#059669','#d97706','#7c3aed','#0891b2','#c026d3','#ea580c','#0f766e'];
function symbolColor(v: number): string {
  return COLORS[((Math.abs(v) * 3 + (v < 0 ? 4 : 0)) % COLORS.length)];
}

interface StripBlock {
  value: number;
  run: number;
  index: number;
}

export default function Step5RLE({ payload, theme }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const dark = theme === 'dark';

  const rle = payload.step5_rle_stream as [number, number][];
  const totalPairs = rle.length;

  const longestZeroRun = rle
    .filter(([v]) => v === 0)
    .reduce((max, [, count]) => Math.max(max, count), 0);

  const nonZeroSymbols = rle.filter(([v]) => v !== 0).length;

  // Raw count for compression ratio bar
  // Approximate: original would be 64 values per block (one pair = value + run)
  // Show reduction: rle pairs vs "raw stream" length
  const estRawLen = rle.reduce((sum, [, c]) => sum + c, 0);
  const reductionPct = Math.max(0, Math.min(100, (1 - totalPairs / Math.max(estRawLen, 1)) * 100));

  const blocks: StripBlock[] = rle.map(([value, run], i) => ({ value, run, index: i }));
  const selectedBlock = selected !== null ? blocks[selected] : null;

  // Estimate bits: each pair uses roughly log2(unique_symbols) + log2(max_run) bits
  const uniqueSymbols = new Set(rle.map(([v]) => v)).size;
  const estBitsPerPair = Math.ceil(Math.log2(Math.max(uniqueSymbols, 2))) + Math.ceil(Math.log2(Math.max(longestZeroRun, 2)));

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* LEFT PANE — bitstream strip + stats */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          RLE Bitstream Strip — {totalPairs} pairs
        </span>

        {/* Horizontal scrollable strip */}
        <div
          ref={stripRef}
          style={{
            display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 8,
            scrollbarWidth: 'thin',
          }}
        >
          {blocks.map(({ value, run, index }) => {
            const isZero = value === 0;
            const isSelected = selected === index;
            const blockW = Math.max(28, Math.min(80, 20 + run * 3));
            const color = isZero ? (dark ? '#3f3f46' : '#d4d4d8') : symbolColor(value);

            return (
              <div
                key={index}
                onClick={() => setSelected(isSelected ? null : index)}
                style={{
                  width: blockW, minWidth: blockW, maxWidth: blockW,
                  height: 52, borderRadius: 5, flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  border: isSelected ? `2px solid ${color}` : '1px solid transparent',
                  background: isZero
                    ? (dark ? '#18181b' : '#f4f4f5')
                    : `${color}22`,
                  transition: 'border-color 0.15s, transform 0.1s',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                  userSelect: 'none',
                }}
              >
                <span style={{
                  fontSize: isZero ? 8 : 9, fontFamily: 'var(--font-mono)', fontWeight: isZero ? 400 : 700,
                  color: isZero ? (dark ? '#52525b' : '#9ca3af') : color,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: blockW - 4,
                  textAlign: 'center',
                }}>
                  {isZero ? `0×${run}` : value.toString()}
                </span>
                {!isZero && run > 1 && (
                  <span style={{ fontSize: 7, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                    ×{run}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
          Gray wide blocks = zero-runs. Colored narrow blocks = non-zero values. Width ∝ run length. Click to inspect.
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            ['Total pairs', totalPairs.toString()],
            ['Longest zero run', longestZeroRun.toString()],
            ['Non-zero symbols', nonZeroSymbols.toString()],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)' }}>
              <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />

      {/* RIGHT PANE — detail card + compression bar */}
      <div style={{ width: 240, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>
        {/* Selected block detail */}
        {selectedBlock ? (
          <div style={{
            padding: 14, border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Pair #{selectedBlock.index}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                ['Symbol value', selectedBlock.value.toString()],
                ['Run length', selectedBlock.run.toString()],
                ['Est. bits', `~${estBitsPerPair}b`],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-2)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-1)' }}>{val}</span>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 4, padding: '5px 10px', borderRadius: 5,
              background: selectedBlock.value === 0
                ? (dark ? '#18181b' : '#f4f4f5')
                : `${symbolColor(selectedBlock.value)}22`,
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: selectedBlock.value === 0 ? 'var(--text-3)' : symbolColor(selectedBlock.value),
              textAlign: 'center',
            }}>
              {selectedBlock.value === 0
                ? `Skip ${selectedBlock.run} zero${selectedBlock.run !== 1 ? 's' : ''}`
                : `Encode ${selectedBlock.value} (×${selectedBlock.run})`}
            </div>
          </div>
        ) : (
          <div style={{ padding: 14, border: '1px dashed var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
            Click a block in the strip to inspect it
          </div>
        )}

        {/* Compression preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Compression Preview
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)' }}>
              <span>Raw stream</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{estRawLen} values</span>
            </div>
            <div style={{ height: 10, borderRadius: 3, background: 'var(--surface-alt)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', background: dark ? '#3f3f46' : '#d4d4d8', borderRadius: 3 }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)' }}>
              <span>RLE pairs</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{totalPairs} pairs</span>
            </div>
            <div style={{ height: 10, borderRadius: 3, background: 'var(--surface-alt)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${(totalPairs / Math.max(estRawLen, 1)) * 100}%`,
                background: 'var(--accent)', borderRadius: 3, transition: 'width 0.5s',
              }} />
            </div>
          </div>

          <div style={{
            padding: '6px 10px', borderRadius: 6,
            background: 'rgba(5,150,105,0.1)', border: '1px solid var(--success)',
            fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700,
            color: 'var(--success)', textAlign: 'center',
          }}>
            {reductionPct.toFixed(0)}% reduction
          </div>
        </div>

        {/* Unique symbols */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Unique symbols: {uniqueSymbols}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Array.from(new Set(rle.map(([v]) => v)))
              .sort((a, b) => a - b)
              .slice(0, 20)
              .map(v => (
                <span key={v} style={{
                  padding: '2px 6px', borderRadius: 4, fontSize: 10, fontFamily: 'var(--font-mono)',
                  background: v === 0 ? (dark ? '#18181b' : '#f4f4f5') : `${symbolColor(v)}22`,
                  color: v === 0 ? 'var(--text-3)' : symbolColor(v),
                  border: `1px solid ${v === 0 ? 'var(--border)' : symbolColor(v)}44`,
                }}>
                  {v}
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
