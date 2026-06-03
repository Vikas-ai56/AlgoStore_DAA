// Matplotlib "inferno" colormap — perceptually uniform, great for scientific heatmaps
const INFERNO: [number, number, number][] = [
  [0,   0,   4],   [27,  12,  65],  [74,  12,  78],  [120, 28,  109],
  [165, 44,  96],  [207, 68,  70],  [237, 105, 37],  [251, 155, 6],
  [247, 209, 61],  [252, 255, 164],
];

export function infernoRgb(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  const n = INFERNO.length - 1;
  const i = Math.floor(t * n);
  const f = t * n - i;
  if (i >= n) return INFERNO[n];
  const c0 = INFERNO[i], c1 = INFERNO[i + 1];
  return [
    Math.round(c0[0] + f * (c1[0] - c0[0])),
    Math.round(c0[1] + f * (c1[1] - c0[1])),
    Math.round(c0[2] + f * (c1[2] - c0[2])),
  ];
}

export function infernoHex(t: number): string {
  const [r, g, b] = infernoRgb(t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Electric blue scale for quantized blocks (dark → electric blue)
export function electricBlue(t: number): string {
  t = Math.max(0, Math.min(1, t));
  const r = Math.round(29  + t * (96  - 29));
  const g = Math.round(78  + t * (165 - 78));
  const b = Math.round(216 + t * (250 - 216));
  return `rgb(${r},${g},${b})`;
}

// Draw a 2D grid onto an ImageData using a normalized value mapper
export function renderGridToImageData(
  grid: number[][],
  imageData: ImageData,
  colorFn: (norm: number) => [number, number, number],
  logScale = false,
): void {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return;

  let min = Infinity, max = -Infinity;
  for (const row of grid) {
    for (const v of row) {
      const vv = logScale ? Math.log(Math.abs(v) + 1) : v;
      if (vv < min) min = vv;
      if (vv > max) max = vv;
    }
  }
  const range = max - min || 1;

  const scaleX = imageData.width / cols;
  const scaleY = imageData.height / rows;
  const data = imageData.data;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const raw = logScale ? Math.log(Math.abs(grid[r][c]) + 1) : grid[r][c];
      const norm = (raw - min) / range;
      const [cr, cg, cb] = colorFn(norm);
      const px0x = Math.round(c * scaleX);
      const px1x = Math.round((c + 1) * scaleX);
      const px0y = Math.round(r * scaleY);
      const px1y = Math.round((r + 1) * scaleY);
      for (let y = px0y; y < px1y; y++) {
        for (let x = px0x; x < px1x; x++) {
          const idx = (y * imageData.width + x) * 4;
          data[idx]     = cr;
          data[idx + 1] = cg;
          data[idx + 2] = cb;
          data[idx + 3] = 255;
        }
      }
    }
  }
}
