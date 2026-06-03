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

// ─── Left canvas: Source Monitor with 8×8 grid overlay ─────────────────────
function SourceMonitor({
  payload,
  dataset,
  theme,
}: {
  payload: StepPayload | null;
  dataset: typeof MOCK_DATASET | null;
  theme: 'dark' | 'light';
}) {
  const { setSelectedBlock, selectedBlock } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dark = theme === 'dark';
  const bd = dark ? '#27272a' : '#e4e4e7';

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

    // 8x8 grid
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
    ctx.lineWidth = 0.5;
    for (let r8 = 0; r8 <= rows; r8 += 8) {
      ctx.beginPath(); ctx.moveTo(0, r8 * scaleY); ctx.lineTo(CW, r8 * scaleY); ctx.stroke();
    }
    for (let c8 = 0; c8 <= cols; c8 += 8) {
      ctx.beginPath(); ctx.moveTo(c8 * scaleX, 0); ctx.lineTo(c8 * scaleX, CH); ctx.stroke();
    }

    // Highlight selected block
    if (selectedBlock) {
      const [br, bc] = selectedBlock;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bc * 8 * scaleX, br * 8 * scaleY, 8 * scaleX, 8 * scaleY);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
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
      padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
      borderRight: `1px solid ${bd}`, flexShrink: 0, width: 324,
    }}>
      <span style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
        color: dark ? '#52525b' : '#a1a1aa', letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        SOURCE MONITOR
      </span>

      {grid.length === 0 ? (
        <div style={{
          width: CW, height: CH,
          border: `1px solid ${bd}`, borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: dark ? '#111113' : '#f8f8f8',
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          color: dark ? '#3f3f46' : '#c4c4c8',
        }}>
          no image loaded
        </div>
      ) : (
        <canvas
          ref={canvasRef} width={CW} height={CH}
          onClick={onClick}
          style={{
            display: 'block', width: CW, height: CH,
            border: `1px solid ${bd}`, borderRadius: 4,
            cursor: 'crosshair', background: '#000',
          }}
        />
      )}

      {selectedBlock ? (
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
          color: '#f59e0b',
          padding: '4px 8px',
          border: '1px solid #f59e0b',
          borderRadius: 3, background: dark ? '#2d1f00' : '#fffbeb',
        }}>
          Block [{selectedBlock[0].toString().padStart(2, '0')}, {selectedBlock[1].toString().padStart(2, '0')}] selected
        </div>
      ) : (
        <span style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          color: dark ? '#3f3f46' : '#c4c4c8',
        }}>
          click block to inspect
        </span>
      )}

      {dataset && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {[
            ['original', `${dataset.metadata.original_dims[1]}×${dataset.metadata.original_dims[0]}`],
            ['padded',   `${dataset.metadata.padded_dims[1]}×${dataset.metadata.padded_dims[0]}`],
            ['q_factor', dataset.metadata.q_factor.toFixed(2)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: dark ? '#52525b' : '#a1a1aa' }}>{k}</span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: dark ? '#e4e4e7' : '#18181b' }}>{v}</span>
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
  const bd = dark ? '#27272a' : '#e4e4e7';

  // Use mock if no real dataset
  const ds = dataset ?? MOCK_DATASET;
  const payload = ds.channels[activeChannel];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Channel selector */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 16px',
        borderBottom: `1px solid ${bd}`,
        background: dark ? '#0d0d0f' : '#f5f5f5',
        flexShrink: 0,
        height: 38,
        gap: 0,
      }}>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
          color: dark ? '#3f3f46' : '#c4c4c8',
          letterSpacing: '0.1em', marginRight: 16, textTransform: 'uppercase',
        }}>
          Channel:
        </span>
        {CHANNELS.map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => setActiveChannel(key)}
            style={{
              padding: '0 16px',
              height: 38,
              border: 'none',
              borderBottom: `2px solid ${activeChannel === key ? '#f59e0b' : 'transparent'}`,
              background: 'transparent',
              color: activeChannel === key ? '#f59e0b' : (dark ? '#71717a' : '#a1a1aa'),
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 12, fontWeight: activeChannel === key ? 600 : 400,
              cursor: 'pointer', letterSpacing: '0.06em',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
            <span style={{
              marginLeft: 6, fontSize: 9,
              color: activeChannel === key ? '#d97706' : (dark ? '#3f3f46' : '#d4d4d8'),
            }}>
              {desc}
            </span>
          </button>
        ))}
      </div>

      {/* Main asymmetric split */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left — Source Monitor */}
        <SourceMonitor payload={payload} dataset={ds} theme={theme} />

        {/* Right — Step Inspector */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Step pagination footer (at top of right panel) */}
          <div style={{
            display: 'flex', alignItems: 'center',
            borderBottom: `1px solid ${bd}`,
            background: dark ? '#0d0d0f' : '#f5f5f5',
            height: 38, flexShrink: 0, overflowX: 'auto',
          }}>
            {STEPS.map(({ n, name }) => (
              <button
                key={n}
                onClick={() => setActiveStep(n)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 14px',
                  height: 38, flexShrink: 0,
                  border: 'none',
                  borderBottom: `2px solid ${activeStep === n ? '#f59e0b' : 'transparent'}`,
                  background: activeStep === n ? (dark ? '#1a1400' : '#fffbeb') : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  gap: 1,
                }}
              >
                <span style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 10, fontWeight: 700,
                  color: activeStep === n ? '#f59e0b' : (dark ? '#52525b' : '#a1a1aa'),
                }}>
                  {n}
                </span>
                <span style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 8, letterSpacing: '0.06em',
                  color: activeStep === n ? '#d97706' : (dark ? '#3f3f46' : '#c4c4c8'),
                }}>
                  {name.toUpperCase()}
                </span>
              </button>
            ))}
          </div>

          {/* Step visualization area */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {activeStep === 1 && (
              <Step1Padded
                payload={payload}
                originalDims={ds.metadata.original_dims}
                theme={theme}
              />
            )}
            {activeStep === 2 && <Step2DCT payload={payload} theme={theme} />}
            {activeStep === 3 && <Step3QMatrix payload={payload} theme={theme} />}
            {activeStep === 4 && <Step4Quantized payload={payload} theme={theme} />}
            {activeStep === 5 && <Step5RLE payload={payload} theme={theme} />}
            {activeStep === 6 && <Step6Huffman payload={payload} theme={theme} />}
            {activeStep === 7 && <Step7CodeTable payload={payload} theme={theme} />}
            {activeStep === 8 && (
              <Step8Reconstruct
                payload={payload}
                originalDims={ds.metadata.original_dims}
                theme={theme}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
