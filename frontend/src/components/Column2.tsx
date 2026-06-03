import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store';
import type { ChannelKey, StepPayload } from '../types';
import { MOCK_DATASET } from '../mockData';
import Step1Padded from './steps/Step1Padded';
import Step2DCT from './steps/Step2DCT';
import Step3QMatrix from './steps/Step3QMatrix';
import Step4Quantized from './steps/Step4Quantized';
import Step5RLE from './steps/Step5RLE';
import Step6Huffman from './steps/Step6Huffman';
import Step7CodeTable from './steps/Step7CodeTable';
import Step8Reconstruct from './steps/Step8Reconstruct';

const CHANNELS: { key: ChannelKey; label: string; desc: string }[] = [
  { key: 'y_channel',  label: 'Y',  desc: 'Luminance' },
  { key: 'cb_channel', label: 'Cb', desc: 'Chroma Blue' },
  { key: 'cr_channel', label: 'Cr', desc: 'Chroma Red' },
];

const STEPS = [
  { n: 1, name: 'Padded' },
  { n: 2, name: 'DCT' },
  { n: 3, name: 'Q Matrix' },
  { n: 4, name: 'Quantized' },
  { n: 5, name: 'RLE' },
  { n: 6, name: 'Huffman' },
  { n: 7, name: 'Codes' },
  { n: 8, name: 'IDCT' },
];

// ─── Source Monitor ───────────────────────────────────────────────────────────
function SourceMonitor({
  payload, dataset, theme,
}: {
  payload: StepPayload | null;
  dataset: typeof MOCK_DATASET | null;
  theme: 'dark' | 'light';
}) {
  const { setSelectedBlock, selectedBlock } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dark = theme === 'dark';
  const bd = dark ? '#27272a' : '#e2e8f0';

  const grid = payload?.step1_padded_pixels ?? [];
  const rows = grid.length, cols = grid[0]?.length ?? 0;
  const CW = 300, CH = 240;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || rows === 0) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, CW, CH);
    const scaleX = CW / cols, scaleY = CH / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = grid[r][c];
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(c * scaleX, r * scaleY, scaleX + 0.5, scaleY + 0.5);
      }
    }

    // 8×8 block grid
    ctx.strokeStyle = 'rgba(251,191,36,0.2)';
    ctx.lineWidth = 0.5;
    for (let r8 = 0; r8 <= rows; r8 += 8) {
      ctx.beginPath(); ctx.moveTo(0, r8 * scaleY); ctx.lineTo(CW, r8 * scaleY); ctx.stroke();
    }
    for (let c8 = 0; c8 <= cols; c8 += 8) {
      ctx.beginPath(); ctx.moveTo(c8 * scaleX, 0); ctx.lineTo(c8 * scaleX, CH); ctx.stroke();
    }

    if (selectedBlock) {
      const [br, bc] = selectedBlock;
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bc * 8 * scaleX, br * 8 * scaleY, 8 * scaleX, 8 * scaleY);
      ctx.fillStyle = 'rgba(37,99,235,0.1)';
      ctx.fillRect(bc * 8 * scaleX, br * 8 * scaleY, 8 * scaleX, 8 * scaleY);
    }
  }, [grid, rows, cols, selectedBlock]);

  useEffect(() => { draw(); }, [draw]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CW / cols, scaleY = CH / rows;
    const c = Math.floor((e.clientX - rect.left) / scaleX);
    const r = Math.floor((e.clientY - rect.top) / scaleY);
    const br = Math.floor(r / 8), bc = Math.floor(c / 8);
    const maxBR = Math.floor(rows / 8) - 1, maxBC = Math.floor(cols / 8) - 1;
    if (br <= maxBR && bc <= maxBC) {
      const same = selectedBlock?.[0] === br && selectedBlock?.[1] === bc;
      setSelectedBlock(same ? null : [br, bc]);
    }
  };

  return (
    <div style={{
      padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
      borderRight: `1px solid ${bd}`, flexShrink: 0, width: 328,
    }}>
      <span style={{
        fontSize: 10, fontWeight: 500,
        color: dark ? '#52525b' : '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.07em',
      }}>
        Source monitor
      </span>

      {grid.length === 0 ? (
        <div style={{
          width: CW, height: CH,
          border: `1px solid ${bd}`, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: dark ? '#111113' : '#f8fafc',
          fontSize: 12, color: dark ? '#3f3f46' : '#cbd5e1',
        }}>
          No image loaded
        </div>
      ) : (
        <canvas
          ref={canvasRef} width={CW} height={CH}
          onClick={onClick}
          style={{
            display: 'block', width: CW, height: CH,
            border: `1px solid ${bd}`, borderRadius: 6,
            cursor: 'crosshair', background: '#000',
          }}
        />
      )}

      {selectedBlock ? (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: '#2563eb', padding: '4px 8px',
          border: '1px solid #bfdbfe', borderRadius: 4,
          background: dark ? '#0c1a3a' : '#eff6ff',
        }}>
          Block [{selectedBlock[0].toString().padStart(2, '0')}, {selectedBlock[1].toString().padStart(2, '0')}] selected
        </div>
      ) : (
        <span style={{ fontSize: 11, color: dark ? '#3f3f46' : '#cbd5e1' }}>
          Click a block to inspect
        </span>
      )}

      {dataset && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 8, borderTop: `1px solid ${bd}` }}>
          {[
            ['Original', `${dataset.metadata.original_dims[1]}×${dataset.metadata.original_dims[0]}`],
            ['Padded',   `${dataset.metadata.padded_dims[1]}×${dataset.metadata.padded_dims[0]}`],
            ['Q factor', dataset.metadata.q_factor.toFixed(2)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 11, color: dark ? '#52525b' : '#94a3b8' }}>{k}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: dark ? '#e4e4e7' : '#334155' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Column 2 root ────────────────────────────────────────────────────────────
export default function Column2() {
  const { theme, dataset, activeChannel, activeStep, setActiveChannel, setActiveStep } = useStore();
  const dark = theme === 'dark';
  const bd = dark ? '#27272a' : '#e2e8f0';
  const accent = dark ? '#60a5fa' : '#2563eb';
  const accentSub = dark ? '#3b82f6' : '#3b82f6';

  const ds = dataset ?? MOCK_DATASET;
  const payload = ds.channels[activeChannel];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Channel selector */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 16px',
        borderBottom: `1px solid ${bd}`,
        background: dark ? '#0d0d0f' : '#ffffff',
        flexShrink: 0, height: 40, gap: 0,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 500,
          color: dark ? '#52525b' : '#94a3b8',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          marginRight: 16,
        }}>
          Channel
        </span>
        {CHANNELS.map(({ key, label, desc }) => {
          const active = activeChannel === key;
          return (
            <button
              key={key}
              onClick={() => setActiveChannel(key)}
              style={{
                padding: '0 14px', height: 40,
                border: 'none',
                borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                background: 'transparent',
                color: active ? accent : (dark ? '#71717a' : '#94a3b8'),
                fontSize: 13, fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
              }}
            >
              {label}
              <span style={{
                marginLeft: 5, fontSize: 11,
                color: active ? accentSub : (dark ? '#3f3f46' : '#cbd5e1'),
              }}>
                {desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Asymmetric split */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <SourceMonitor payload={payload} dataset={ds} theme={theme} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Step tabs */}
          <div style={{
            display: 'flex', alignItems: 'center',
            borderBottom: `1px solid ${bd}`,
            background: dark ? '#0d0d0f' : '#ffffff',
            height: 40, flexShrink: 0, overflowX: 'auto',
          }}>
            {STEPS.map(({ n, name }) => {
              const active = activeStep === n;
              return (
                <button
                  key={n}
                  onClick={() => setActiveStep(n)}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '0 14px', height: 40, flexShrink: 0,
                    border: 'none',
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    background: 'transparent',
                    cursor: 'pointer', transition: 'all 0.15s', gap: 1,
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: active ? accent : (dark ? '#52525b' : '#94a3b8') }}>
                    {n}
                  </span>
                  <span style={{
                    fontSize: 9, letterSpacing: '0.05em',
                    color: active ? accentSub : (dark ? '#3f3f46' : '#cbd5e1'),
                    textTransform: 'uppercase',
                  }}>
                    {name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Step visualization */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {activeStep === 1 && <Step1Padded payload={payload} originalDims={ds.metadata.original_dims} theme={theme} />}
            {activeStep === 2 && <Step2DCT payload={payload} theme={theme} />}
            {activeStep === 3 && <Step3QMatrix payload={payload} theme={theme} />}
            {activeStep === 4 && <Step4Quantized payload={payload} theme={theme} />}
            {activeStep === 5 && <Step5RLE payload={payload} theme={theme} />}
            {activeStep === 6 && <Step6Huffman payload={payload} theme={theme} />}
            {activeStep === 7 && <Step7CodeTable payload={payload} theme={theme} />}
            {activeStep === 8 && <Step8Reconstruct payload={payload} theme={theme} />}
          </div>
        </div>
      </div>
    </div>
  );
}
