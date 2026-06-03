import { useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { StepPayload } from '../../types';

interface Props { payload: StepPayload; theme: 'dark' | 'light'; }

export default function Step5RLE({ payload, theme }: Props) {
  const dark = theme === 'dark';
  const bd = dark ? '#27272a' : '#e4e4e7';
  const rle = payload.step5_rle_stream;

  // Frequency map
  const freqMap = new Map<number, number>();
  let totalPairs = 0;
  for (const [v, _count] of rle) {
    freqMap.set(v, (freqMap.get(v) ?? 0) + 1);
    totalPairs++;
  }

  const chartData = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([symbol, count]) => ({ symbol: symbol.toString(), count }));

  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  const CustomTooltip = ({ active, payload: pl }: any) => {
    if (!active || !pl?.[0]) return null;
    return (
      <div style={{
        background: dark ? '#18181b' : '#fff',
        border: `1px solid ${bd}`,
        padding: '6px 10px',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
        color: dark ? '#e4e4e7' : '#27272a',
      }}>
        <div style={{ color: '#f59e0b' }}>symbol: {pl[0].payload.symbol}</div>
        <div>count: {pl[0].value}</div>
        <div style={{ color: dark ? '#71717a' : '#a1a1aa' }}>
          {((pl[0].value / totalPairs) * 100).toFixed(1)}% of stream
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', gap: 0, padding: 16, height: '100%', overflow: 'hidden' }}>
      {/* Left — scrollable RLE token list */}
      <div style={{
        width: '45%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${bd}`,
        paddingRight: 16,
        overflow: 'hidden',
      }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11, color: dark ? '#a1a1aa' : '#71717a',
          marginBottom: 10, flexShrink: 0,
        }}>
          RLE Stream — {totalPairs} pairs
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 50px',
          padding: '4px 0',
          borderBottom: `1px solid ${bd}`,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9, color: dark ? '#52525b' : '#a1a1aa',
          letterSpacing: '0.1em', flexShrink: 0,
          gap: 8,
        }}>
          <span>#</span>
          <span>VALUE</span>
          <span>RUN</span>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, marginTop: 2 }}>
          {rle.map(([v, count], i) => {
            const isZero = v === 0;
            return (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 50px',
                padding: '3px 0',
                borderBottom: `1px solid ${dark ? '#1a1a1e' : '#f0f0f0'}`,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11,
                gap: 8,
                color: isZero ? (dark ? '#3f3f46' : '#d4d4d8') : (dark ? '#e4e4e7' : '#18181b'),
              }}>
                <span style={{ color: dark ? '#3f3f46' : '#c4c4c8' }}>{i.toString().padStart(3, '0')}</span>
                <span style={{
                  color: isZero ? (dark ? '#27272a' : '#e4e4e7')
                    : v < 0 ? '#ef4444'
                    : '#f59e0b',
                  fontWeight: !isZero ? 600 : 400,
                }}>
                  ({v.toString().padStart(3)}, {count.toString().padStart(3)})
                </span>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <div style={{
                    height: 8, width: `${Math.min(100, (count / 35) * 100)}%`,
                    minWidth: 2,
                    background: isZero ? (dark ? '#27272a' : '#e4e4e7') : '#f59e0b',
                    borderRadius: 1,
                  }} />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right — frequency histogram */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        paddingLeft: 16,
        overflow: 'hidden',
      }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11, color: dark ? '#a1a1aa' : '#71717a',
          marginBottom: 10, flexShrink: 0,
        }}>
          Symbol Frequency — top 20
        </div>

        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 16, top: 4, bottom: 4 }}>
              <XAxis
                type="number"
                tick={{ fontFamily: '"JetBrains Mono"', fontSize: 9, fill: dark ? '#52525b' : '#a1a1aa' }}
                axisLine={{ stroke: bd }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="symbol"
                width={40}
                tick={{ fontFamily: '"JetBrains Mono"', fontSize: 10, fill: dark ? '#a1a1aa' : '#71717a' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={14}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.symbol === '0' ? (dark ? '#3f3f46' : '#d4d4d8')
                        : parseInt(entry.symbol) < 0 ? '#ef4444'
                        : `hsl(${45 - (entry.count / maxCount) * 25}, 95%, 55%)`
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
