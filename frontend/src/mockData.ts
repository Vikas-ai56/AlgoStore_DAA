import type { ProfilerDataset, HuffmanTreeNode } from './types';

// Deterministic pseudo-random using LCG
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function makeGrid(rows: number, cols: number, fn: (r: number, c: number, rng: () => number) => number, seed = 42): number[][] {
  const rng = lcg(seed);
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => fn(r, c, rng))
  );
}

// 8x8 standard JPEG luminance quantization matrix
const JPEG_Q_MATRIX = [
  [16, 11, 10, 16, 24,  40,  51,  61],
  [12, 12, 14, 19, 26,  58,  60,  55],
  [14, 13, 16, 24, 40,  57,  69,  56],
  [14, 17, 22, 29, 51,  87,  80,  62],
  [18, 22, 37, 56, 68,  109, 103, 77],
  [24, 35, 55, 64, 81,  104, 113, 92],
  [49, 64, 78, 87, 103, 121, 120, 101],
  [72, 92, 95, 98, 112, 100, 103, 99],
];

// Realistic grayscale pixel grid (48x64) with a gradient + edge pattern
const ORIGINAL_H = 45, ORIGINAL_W = 60;
const PADDED_H = 48, PADDED_W = 64;

const paddedPixels = makeGrid(PADDED_H, PADDED_W, (r, c) => {
  if (r >= ORIGINAL_H || c >= ORIGINAL_W) return 0; // padding area
  const grad = Math.round(((r / ORIGINAL_H) * 120) + ((c / ORIGINAL_W) * 80));
  const edge = (Math.abs(Math.sin(r * 0.5) * Math.cos(c * 0.4)) * 40);
  return Math.min(255, Math.max(0, 50 + grad + Math.round(edge)));
});

// DCT coefficients - large DC, decaying AC components
const dctCoeffs = makeGrid(PADDED_H, PADDED_W, (r, c, rng) => {
  const blockR = r % 8, blockC = c % 8;
  if (blockR === 0 && blockC === 0) return 600 + rng() * 200; // DC component
  const decay = 1 / (1 + blockR + blockC);
  const sign = rng() > 0.5 ? 1 : -1;
  return sign * (rng() * 120 * decay);
});

// Quantized blocks - sparse int16
const quantizedBlocks = makeGrid(PADDED_H, PADDED_W, (r, c, rng) => {
  const blockR = r % 8, blockC = c % 8;
  if (blockR === 0 && blockC === 0) return Math.round(50 + rng() * 20);
  if (rng() < 0.68) return 0; // ~68% sparsity
  const sign = rng() > 0.5 ? 1 : -1;
  return sign * Math.round(1 + rng() * 8);
});

// Zero fraction calculation
const totalCells = PADDED_H * PADDED_W;
const zeroCells = quantizedBlocks.flat().filter(v => v === 0).length;
const zeroFraction = zeroCells / totalCells;

// RLE stream - realistic pairs
const rleStream: [number, number][] = [
  [38, 3], [0, 14], [2, 1], [0, 8], [-1, 2], [0, 21], [5, 1],
  [0, 7],  [3, 1],  [0, 12], [-2, 1], [0, 18], [1, 3], [0, 9],
  [4, 1],  [0, 15], [-3, 1], [0, 11], [2, 2],  [0, 6],  [7, 1],
  [0, 19], [-1, 1], [0, 8],  [1, 1],  [0, 24], [3, 1],  [0, 13],
  [-2, 2], [0, 7],  [5, 1],  [0, 16], [1, 1],  [0, 9],  [-4, 1],
  [0, 11], [2, 1],  [0, 20], [6, 1],  [0, 14], [-1, 2], [0, 7],
  [0, 31], [1, 1],  [0, 18], [-3, 1], [0, 9],  [4, 1],  [0, 12],
  [2, 1],  [0, 5],  [8, 1],  [0, 23], [-2, 1], [0, 16], [1, 4],
  [0, 10], [3, 1],  [0, 7],  [-1, 1], [0, 14], [5, 1],  [0, 19],
];

// Huffman tree structure
const huffmanTree: HuffmanTreeNode = {
  freq: 3072,
  left: {
    freq: 1440,
    left: {
      freq: 720,
      symbol: '0',
      left: undefined,
      right: undefined,
    },
    right: {
      freq: 720,
      left: {
        freq: 380,
        left: { freq: 200, symbol: '-1', left: undefined, right: undefined },
        right: { freq: 180, symbol: '1', left: undefined, right: undefined },
      },
      right: {
        freq: 340,
        left: { freq: 180, symbol: '2', left: undefined, right: undefined },
        right: { freq: 160, symbol: '-2', left: undefined, right: undefined },
      },
    },
  },
  right: {
    freq: 1632,
    left: {
      freq: 820,
      left: {
        freq: 420,
        left: { freq: 220, symbol: '3', left: undefined, right: undefined },
        right: { freq: 200, symbol: '-3', left: undefined, right: undefined },
      },
      right: {
        freq: 400,
        left: { freq: 210, symbol: '4', left: undefined, right: undefined },
        right: { freq: 190, symbol: '-4', left: undefined, right: undefined },
      },
    },
    right: {
      freq: 812,
      left: {
        freq: 410,
        left: { freq: 220, symbol: '5', left: undefined, right: undefined },
        right: {
          freq: 190,
          left: { freq: 100, symbol: '6', left: undefined, right: undefined },
          right: { freq: 90,  symbol: '-5', left: undefined, right: undefined },
        },
      },
      right: {
        freq: 402,
        left: {
          freq: 200,
          left: { freq: 110, symbol: '7', left: undefined, right: undefined },
          right: { freq: 90,  symbol: '8', left: undefined, right: undefined },
        },
        right: {
          freq: 202,
          left: { freq: 108, symbol: '-6', left: undefined, right: undefined },
          right: { freq: 94,  symbol: 'EOB', left: undefined, right: undefined },
        },
      },
    },
  },
};

// Huffman code table
const codeTable = [
  { symbol: '0',   code: '0',       length: 1 },
  { symbol: '-1',  code: '100',     length: 3 },
  { symbol: '1',   code: '101',     length: 3 },
  { symbol: '2',   code: '1100',    length: 4 },
  { symbol: '-2',  code: '1101',    length: 4 },
  { symbol: '3',   code: '11100',   length: 5 },
  { symbol: '-3',  code: '11101',   length: 5 },
  { symbol: '4',   code: '11110',   length: 5 },
  { symbol: '-4',  code: '111110',  length: 6 },
  { symbol: '5',   code: '1111100', length: 7 },
  { symbol: '-5',  code: '1111101', length: 7 },
  { symbol: '6',   code: '11111100',length: 8 },
  { symbol: '7',   code: '11111101',length: 8 },
  { symbol: '8',   code: '111111100',length: 9 },
  { symbol: '-6',  code: '111111101',length: 9 },
  { symbol: 'EOB', code: '111111110',length: 9 },
];

// Reconstructed pixels (slightly different from original - compression artifacts)
const reconstructedPixels = makeGrid(ORIGINAL_H, ORIGINAL_W, (r, c) => {
  const rng = lcg(r * 100 + c);
  const grad = Math.round(((r / ORIGINAL_H) * 120) + ((c / ORIGINAL_W) * 80));
  const edge = (Math.abs(Math.sin(r * 0.5) * Math.cos(c * 0.4)) * 40);
  const artifact = (rng() - 0.5) * 18; // JPEG-like block artifacts
  return Math.min(255, Math.max(0, 50 + grad + Math.round(edge) + Math.round(artifact)));
});

function makeChannelPayload(seed: number) {
  const rng = lcg(seed);
  const jitter = () => (rng() - 0.5) * 30;

  return {
    step1_padded_pixels: paddedPixels.map(row => row.map(v => Math.min(255, Math.max(0, v + Math.round(jitter()))))),
    step2_dct_coefficients: dctCoeffs,
    step3_q_matrix: JPEG_Q_MATRIX,
    step4_quantized_blocks: quantizedBlocks,
    zero_fraction: zeroFraction,
    step5_rle_stream: rleStream,
    step6_huffman_tree: huffmanTree,
    step7_code_table: codeTable,
    step8_reconstructed_pixels: reconstructedPixels.map(row => row.map(v => Math.min(255, Math.max(0, v + Math.round(jitter()))))),
  };
}

export const MOCK_DATASET: ProfilerDataset = {
  metadata: {
    original_dims: [ORIGINAL_H, ORIGINAL_W],
    padded_dims: [PADDED_H, PADDED_W],
    q_factor: 1.5,
  },
  metrics: {
    psnr: 36.84,
    ssim: 0.871,
    layer_timings_us: {
      'Pad & Center': 412,
      '2D-DCT Transform': 18440,
      'Quantization': 2310,
      'RLE Encode': 1820,
      'Huffman Encode': 4290,
      'IDCT Reconstruct': 19870,
      'Metrics Compute': 6640,
    },
    memory_peak_bytes: 44_040_192,
  },
  channels: {
    y_channel: makeChannelPayload(42),
    cb_channel: makeChannelPayload(137),
    cr_channel: makeChannelPayload(251),
  },
};

export const MOCK_LOGS = [
  '[00:00:00.000] API: Multipart byte stream received — 45×60 px RGB',
  '[00:00:00.012] CELERY: Worker Node 3 assigned thread 0x7fa2c4',
  '[00:00:00.041] ENGINE: Splitting YCbCr channels from BGR input',
  '[00:00:00.058] ENGINE: Initializing 8×8 block padding routine',
  '[00:00:00.412] STAGE 1/7: Pad & Center — COMPLETE (412μs)',
  '[00:00:00.425] ENGINE: Running 2D separable DCT on 24 blocks',
  '[00:00:18.852] STAGE 2/7: 2D-DCT Transform — COMPLETE (18440μs)',
  '[00:00:21.162] STAGE 3/7: Quantization (q=1.5) — COMPLETE (2310μs)',
  '[00:00:22.982] STAGE 4/7: RLE Encode — 63 pairs (68.1% sparsity)',
  '[00:00:27.272] STAGE 5/7: Huffman Encode — COMPLETE (4290μs)',
  '[00:00:47.142] STAGE 6/7: IDCT Reconstruct — COMPLETE (19870μs)',
  '[00:00:53.782] STAGE 7/7: Metrics Compute — PSNR=36.84dB SSIM=0.871',
  '[00:00:53.794] SUCCESS: Job complete. Payload serialized (44.0 MB peak)',
];
