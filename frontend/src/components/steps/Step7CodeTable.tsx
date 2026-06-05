import { useState, useMemo } from 'react';
import type { StepPayload } from '../../types';

interface Props { payload: StepPayload; theme: 'dark' | 'light'; }

const CHIP_PALETTE = [
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#ede9fe', text: '#5b21b6' },
  { bg: '#cffafe', text: '#155e75' },
  { bg: '#fee2e2', text: '#991b1b' },
  { bg: '#fce7f3', text: '#831843' },
  { bg: '#fef9c3', text: '#713f12' },
];
const CHIP_PALETTE_DARK = [
  { bg: '#1e3a5f', text: '#93c5fd' },
  { bg: '#14532d', text: '#86efac' },
  { bg: '#451a03', text: '#fde68a' },
  { bg: '#2e1065', text: '#c4b5fd' },
  { bg: '#0c4a6e', text: '#67e8f9' },
  { bg: '#450a0a', text: '#fca5a5' },
  { bg: '#4a044e', text: '#f0abfc' },
  { bg: '#422006', text: '#fde68a' },
];

type SortKey = 'symbol' | 'length' | 'freq';
type SortDir = 'asc' | 'desc';

export default function Step7CodeTable({ payload, theme }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('length');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const dark = theme === 'dark';
  const palette = dark ? CHIP_PALETTE_DARK : CHIP_PALETTE;

  const table = payload.step7_code_table;

  // Build symbol → palette index map (stable color per symbol)
  const symbolColorIdx = useMemo(() => {
    const m = new Map<string, number>();
    table.forEach((entry, i) => { if (!m.has(entry.symbol)) m.set(entry.symbol, i % palette.length); });
    return m;
  }, [table]);

  // Build chips from RLE stream values (first 60 pairs, symbols from stream)
  const chips = useMemo(() => {
    const codeMap = new Map(table.map(e => [e.symbol, e]));
    return payload.step5_rle_stream.slice(0, 60).map(([v], i) => {
      const sym = String(v);
      const entry = codeMap.get(sym);
      return {
        symbol: sym,
        code: entry?.code ?? '?',
        length: entry?.length ?? 0,
        streamIdx: i,
      };
    });
  }, [table, payload.step5_rle_stream]);

  // Sorted table
  const sorted = useMemo(() => {
    return [...table].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'symbol') cmp = parseFloat(a.symbol) - parseFloat(b.symbol) || a.symbol.localeCompare(b.symbol);
      else if (sortKey === 'length') cmp = a.length - b.length;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [table, sortKey, sortDir]);

  const maxLen = Math.max(...table.map(r => r.length), 1);
  const avgLen = table.reduce((a, r) => a + r.length, 0) / (table.length || 1);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const selectedEntry = selectedChip !== null ? chips[selectedChip] : null;
  const efficiencyColor = (len: number) =>
    len <= maxLen * 0.4 ? 'var(--success)' : len <= maxLen * 0.7 ? 'var(--warning)' : 'var(--error)';

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* LEFT PANE — animated bit chip stream */}
      <div style={{ flex: '0 0 55%', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Encoded Bitstream (first 60 symbols)
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>click to inspect</span>
        </div>

        {/* Chip stream — horizontally wrapped */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {chips.map((chip, i) => {
            const ci = symbolColorIdx.get(chip.symbol) ?? 0;
            const colors = palette[ci];
            const isSelected = selectedChip === i;

            return (
              <div
                key={i}
                className="bit-chip"
                onClick={() => setSelectedChip(isSelected ? null : i)}
                style={{
                  animationDelay: `${i * 40}ms`,
                  padding: '4px 8px', borderRadius: 6,
                  background: colors.bg,
                  border: isSelected ? `2px solid ${colors.text}` : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                  transition: 'transform 0.1s, border-color 0.1s',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                  color: colors.text, letterSpacing: '0.08em',
                }}>
                  {chip.code || '?'}
                </span>
                <span style={{ fontSize: 8, color: colors.text, opacity: 0.7 }}>{chip.symbol}</span>
              </div>
            );
          })}
        </div>

        {/* Selected chip detail popover */}
        {selectedEntry && (() => {
          const ci = symbolColorIdx.get(selectedEntry.symbol) ?? 0;
          const colors = palette[ci];
          const eff = selectedEntry.length > 0 ? ((1 / selectedEntry.length) * 100).toFixed(0) : '—';
          return (
            <div style={{
              padding: 12, borderRadius: 8,
              border: `1px solid ${colors.text}44`,
              background: colors.bg,
              display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 9, color: colors.text, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Symbol</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: colors.text }}>{selectedEntry.symbol}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 9, color: colors.text, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Code</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: colors.text, letterSpacing: '0.15em' }}>
                  {selectedEntry.code.split('').map((b, bi) => (
                    <span key={bi} style={{ color: b === '0' ? colors.text : colors.text, opacity: b === '0' ? 0.6 : 1 }}>{b}</span>
                  ))}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 9, color: colors.text, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Length</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: colors.text }}>{selectedEntry.length}b</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 9, color: colors.text, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Efficiency</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: colors.text }}>{eff}%</span>
              </div>
            </div>
          );
        })()}

        {/* Summary */}
        <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
          <span>avg <b style={{ color: 'var(--text-1)' }}>{avgLen.toFixed(2)}b</b></span>
          <span>min <b style={{ color: 'var(--text-1)' }}>{Math.min(...table.map(r => r.length))}b</b></span>
          <span>max <b style={{ color: 'var(--text-1)' }}>{maxLen}b</b></span>
          <span style={{ marginLeft: 8, color: 'var(--text-3)' }}>{table.length} symbols total</span>
        </div>
      </div>

      <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />

      {/* RIGHT PANE — code table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Full Code Table — {table.length} entries
        </span>

        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '48px 1fr 48px 80px',
          gap: 8, padding: '4px 8px',
          borderBottom: '1px solid var(--border)',
          fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          {(['SYMBOL', 'BIT CODE', 'LEN', 'EFFICIENCY'] as const).map((label, i) => {
            const key: SortKey | null = i === 0 ? 'symbol' : i === 2 ? 'length' : null;
            return (
              <span key={label} style={{ cursor: key ? 'pointer' : 'default', userSelect: 'none' }}
                onClick={() => key && toggleSort(key)}>
                {label} {key && sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </span>
            );
          })}
        </div>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sorted.map((row, i) => {
            const ci = symbolColorIdx.get(row.symbol) ?? 0;
            const colors = palette[ci];
            const effPct = row.length > 0 ? (1 / row.length) * 100 : 0;
            const effBarColor = effPct > 60 ? 'var(--success)' : effPct > 30 ? 'var(--warning)' : 'var(--error)';

            return (
              <div
                key={i}
                style={{
                  display: 'grid', gridTemplateColumns: '48px 1fr 48px 80px',
                  gap: 8, padding: '4px 8px',
                  borderRadius: 4,
                  background: i % 2 === 0 ? 'transparent' : (dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                  color: colors.text,
                  background: colors.bg, padding: '1px 5px', borderRadius: 3,
                  textAlign: 'center',
                }}>
                  {row.symbol}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--success)', letterSpacing: '0.1em' }}>
                  {row.code.split('').map((b, bi) => (
                    <span key={bi} style={{ opacity: b === '0' ? 0.55 : 1 }}>{b}</span>
                  ))}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-1)' }}>
                  {row.length}b
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ flex: 1, height: 5, borderRadius: 2, background: 'var(--surface-alt)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${effPct}%`, background: effBarColor, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', width: 22 }}>
                    {effPct.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
