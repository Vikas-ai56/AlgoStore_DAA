import { useState, useMemo } from 'react';
import type { StepPayload, HuffmanTreeNode } from '../../types';

interface Props { payload: StepPayload; theme: 'dark' | 'light'; }

function collectLeafFreqs(node: HuffmanTreeNode | undefined, map: Map<string, number> = new Map()): Map<string, number> {
  if (!node) return map;
  if (node.symbol !== undefined && node.symbol !== null && !node.left && !node.right) {
    map.set(String(node.symbol), node.freq);
  }
  if (node.left) collectLeafFreqs(node.left, map);
  if (node.right) collectLeafFreqs(node.right, map);
  return map;
}

interface RowData {
  symbol: string;
  freq: number;
  code: string;
  length: number;
}

export default function Step6Huffman({ payload, theme }: Props) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const dark = theme === 'dark';

  const freqMap = useMemo(() => collectLeafFreqs(payload.step6_huffman_tree), [payload.step6_huffman_tree]);
  const codeTable = payload.step7_code_table;

  // Merge freq + code into rows, sorted by freq desc
  const rows = useMemo((): RowData[] => {
    return codeTable
      .map(entry => ({
        symbol: entry.symbol,
        freq: freqMap.get(entry.symbol) ?? 0,
        code: entry.code,
        length: entry.length,
      }))
      .sort((a, b) => b.freq - a.freq);
  }, [codeTable, freqMap]);

  const maxFreq = Math.max(...rows.map(r => r.freq), 1);
  const maxLen  = Math.max(...rows.map(r => r.length), 1);

  // Kraft inequality: K = sum(2^-length)
  const kraft = rows.reduce((sum, r) => sum + Math.pow(2, -r.length), 0);
  const kraftColor = kraft >= 0.95 ? 'var(--success)' : kraft >= 0.8 ? 'var(--warning)' : 'var(--error)';

  const MAX_ROWS = 60;
  const displayRows = rows.slice(0, MAX_ROWS);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* LEFT PANE — waterfall chart */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Frequency ↔ Code Length Waterfall
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{rows.length} symbols</span>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 44px 1fr',
          fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.07em',
          textTransform: 'uppercase', paddingBottom: 4,
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ textAlign: 'right', paddingRight: 8 }}>← Frequency</span>
          <span style={{ textAlign: 'center' }}>Sym</span>
          <span style={{ paddingLeft: 8 }}>Code length →</span>
        </div>

        {/* CSS-based waterfall rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {displayRows.map((row, i) => {
            const freqPct = (row.freq / maxFreq) * 100;
            const lenPct  = (row.length / maxLen) * 100;
            const isHovered = hoveredRow === i;

            return (
              <div
                key={row.symbol}
                onMouseEnter={e => {
                  setHoveredRow(i);
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setTooltip({
                    x: rect.right + 6,
                    y: rect.top,
                    content: `symbol ${row.symbol}: ${row.freq}× → ${row.code} (${row.length}b)`,
                  });
                }}
                onMouseLeave={() => { setHoveredRow(null); setTooltip(null); }}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 44px 1fr',
                  alignItems: 'center', height: 18, cursor: 'pointer',
                  borderRadius: 3,
                  background: isHovered ? (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)') : 'transparent',
                  opacity: hoveredRow !== null && !isHovered ? 0.45 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {/* Frequency bar (right-aligned, growing left) */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 4, alignItems: 'center', gap: 4 }}>
                  {freqPct > 15 && (
                    <span style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{row.freq}</span>
                  )}
                  <div style={{ width: `${freqPct}%`, height: 8, background: 'var(--accent)', borderRadius: '2px 0 0 2px', opacity: isHovered ? 1 : 0.75 }} />
                </div>

                {/* Symbol */}
                <div style={{
                  textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700,
                  color: dark ? '#e4e4e7' : '#334155',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {row.symbol.length > 4 ? row.symbol.slice(0, 3) + '…' : row.symbol}
                </div>

                {/* Code length bar (left-aligned, growing right) */}
                <div style={{ display: 'flex', paddingLeft: 4, alignItems: 'center', gap: 4 }}>
                  <div style={{ width: `${lenPct}%`, height: 8, background: 'var(--success)', borderRadius: '0 2px 2px 0', opacity: isHovered ? 1 : 0.75 }} />
                  {lenPct > 15 && (
                    <span style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{row.length}b</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />

      {/* RIGHT PANE — Kraft meter */}
      <div style={{ width: 220, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Kraft Inequality
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>K = Σ 2<sup>-ℓ</sup></span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: kraftColor }}>
              {kraft.toFixed(4)}
            </span>
          </div>

          <div style={{ height: 16, borderRadius: 8, background: 'var(--surface-alt)', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              height: '100%', width: `${Math.min(100, kraft * 100)}%`,
              background: kraftColor, borderRadius: 8, transition: 'width 0.5s',
            }} />
            {/* 1.0 marker */}
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, background: 'var(--text-3)' }} />
          </div>

          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
            0 ─────────────────── 1.0
          </div>

          <div style={{
            padding: '8px 12px', borderRadius: 6,
            background: kraft >= 0.95 ? 'rgba(5,150,105,0.1)' : kraft >= 0.8 ? 'rgba(215,119,6,0.1)' : 'rgba(220,38,38,0.1)',
            border: `1px solid ${kraftColor}`,
            fontSize: 11, color: kraftColor,
          }}>
            {kraft >= 0.95
              ? 'Optimal: code space is fully utilized'
              : kraft >= 0.8
              ? 'Near-optimal: minor inefficiency'
              : 'Suboptimal: significant code space wasted'}
          </div>

          <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.6 }}>
            A perfectly optimal prefix-free code has K=1.0 exactly. Values below 1 mean some bit patterns go unused. The Huffman algorithm always produces K≤1.
          </div>
        </div>

        {/* Code length histogram */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>
            Code Length Distribution
          </span>
          {(() => {
            const dist = new Map<number, number>();
            rows.forEach(r => dist.set(r.length, (dist.get(r.length) ?? 0) + 1));
            const entries = Array.from(dist.entries()).sort(([a], [b]) => a - b);
            const maxCount = Math.max(...entries.map(([, c]) => c));
            return entries.map(([len, count]) => (
              <div key={len} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 24, fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textAlign: 'right' }}>{len}b</span>
                <div style={{ flex: 1, height: 8, borderRadius: 2, background: 'var(--surface-alt)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${(count / maxCount) * 100}%`,
                    background: 'var(--success)', borderRadius: 2,
                  }} />
                </div>
                <span style={{ width: 20, fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textAlign: 'right' }}>{count}</span>
              </div>
            ));
          })()}
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
