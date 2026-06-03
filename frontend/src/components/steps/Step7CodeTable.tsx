import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { StepPayload } from '../../types';

interface Props { payload: StepPayload; theme: 'dark' | 'light'; }

type SortKey = 'symbol' | 'length';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 12;

export default function Step7CodeTable({ payload, theme }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('length');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const dark = theme === 'dark';
  const bd = dark ? '#27272a' : '#e4e4e7';

  const table = [...payload.step7_code_table];

  const sorted = table.sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'symbol') {
      cmp = parseFloat(a.symbol) - parseFloat(b.symbol) || a.symbol.localeCompare(b.symbol);
    } else {
      cmp = a.length - b.length;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const pages = Math.ceil(sorted.length / PAGE_SIZE);
  const slice = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setDir('asc'); setPage(0); }
  };

  function setDir(d: SortDir) { setSortDir(d); setPage(0); }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={11} color={dark ? '#3f3f46' : '#d4d4d8'} />;
    return sortDir === 'asc' ? <ArrowUp size={11} color="#2563eb" /> : <ArrowDown size={11} color="#2563eb" />;
  };

  const colHdr = (label: string, col: SortKey | null) => (
    <th
      onClick={() => col && toggleSort(col)}
      style={{
        padding: '8px 12px',
        textAlign: 'left',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        letterSpacing: '0.12em',
        color: dark ? '#52525b' : '#a1a1aa',
        borderBottom: `1px solid ${bd}`,
        cursor: col ? 'pointer' : 'default',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        background: dark ? '#0d0d0f' : '#f5f5f5',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {label} {col && <SortIcon col={col} />}
      </div>
    </th>
  );

  // Max length for bar scaling
  const maxLen = Math.max(...sorted.map((r) => r.length), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16, gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: dark ? '#a1a1aa' : '#64748b' }}>
          Huffman code table —
          <span style={{ fontFamily: "'JetBrains Mono', monospace", marginLeft: 5 }}>{sorted.length}</span>
          {' '}entries
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)} style={{
              width: 28, height: 24,
              border: `1px solid ${i === page ? (dark ? '#3b82f6' : '#2563eb') : bd}`,
              borderRadius: 4,
              background: i === page ? (dark ? '#0c1a3a' : '#eff6ff') : 'transparent',
              color: i === page ? (dark ? '#60a5fa' : '#2563eb') : (dark ? '#71717a' : '#94a3b8'),
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, cursor: 'pointer',
            }}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        flex: 1, border: `1px solid ${bd}`, borderRadius: 4,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {colHdr('SYMBOL', 'symbol')}
              {colHdr('BIT CODE', null)}
              {colHdr('LENGTH', 'length')}
              {colHdr('EFFICIENCY', null)}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: `1px solid ${dark ? '#1a1a1e' : '#f0f0f0'}`,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = dark ? '#111113' : '#f8f8f8')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{
                  padding: '7px 12px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12, fontWeight: 600,
                  color: dark ? '#e4e4e7' : '#334155',
                }}>
                  {row.symbol}
                </td>
                <td style={{
                  padding: '7px 12px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: dark ? '#60a5fa' : '#2563eb',
                  letterSpacing: '0.12em',
                }}>
                  {row.code.split('').map((bit, bi) => (
                    <span key={bi} style={{ color: bit === '0' ? (dark ? '#60a5fa' : '#3b82f6') : (dark ? '#a78bfa' : '#7c3aed') }}>
                      {bit}
                    </span>
                  ))}
                </td>
                <td style={{
                  padding: '7px 12px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: dark ? '#e4e4e7' : '#27272a',
                }}>
                  {row.length}b
                </td>
                <td style={{ padding: '7px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      height: 6,
                      width: `${(row.length / maxLen) * 80}px`,
                      background: `hsl(${220 + (row.length / maxLen) * 80}, 80%, 60%)`,
                      borderRadius: 2,
                    }} />
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9, color: dark ? '#52525b' : '#a1a1aa',
                    }}>
                      {((1 / row.length) * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', gap: 20,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      }}>
        <span style={{ fontSize: 11, color: dark ? '#71717a' : '#94a3b8' }}>
          avg <span style={{ fontFamily: "'JetBrains Mono', monospace", color: dark ? '#e4e4e7' : '#334155' }}>
            {(sorted.reduce((a, r) => a + r.length, 0) / sorted.length).toFixed(2)}b
          </span>
        </span>
        <span style={{ fontSize: 11, color: dark ? '#71717a' : '#94a3b8' }}>
          min <span style={{ fontFamily: "'JetBrains Mono', monospace", color: dark ? '#e4e4e7' : '#334155' }}>
            {Math.min(...sorted.map((r) => r.length))}b
          </span>
        </span>
        <span style={{ fontSize: 11, color: dark ? '#71717a' : '#94a3b8' }}>
          max <span style={{ fontFamily: "'JetBrains Mono', monospace", color: dark ? '#e4e4e7' : '#334155' }}>
            {Math.max(...sorted.map((r) => r.length))}b
          </span>
        </span>
      </div>
    </div>
  );
}
