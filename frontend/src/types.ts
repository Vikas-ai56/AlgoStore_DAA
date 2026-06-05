export interface JobPollResponse {
  job_id: string;
  status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE';
  progress: number;
  current_stage: string;
  error_traceback?: string;
  payload?: ProfilerDataset | StorageJobResult;
}

export interface ProfilerDataset {
  metadata: {
    original_dims: [number, number];
    padded_dims: [number, number];
    q_factor: number;
  };
  metrics: {
    psnr: number;
    ssim: number;
    layer_timings_us: Record<string, number>;
    memory_peak_bytes: number;
  };
  channels: {
    y_channel: StepPayload;
    cb_channel: StepPayload;
    cr_channel: StepPayload;
  };
}

export interface StepPayload {
  step1_padded_pixels: number[][];
  step2_dct_coefficients: number[][];
  step3_q_matrix: number[][];
  step4_quantized_blocks: number[][];
  zero_fraction: number;
  step5_rle_stream: [number, number][];
  step6_huffman_tree: HuffmanTreeNode;
  step7_code_table: Array<{ symbol: string; code: string; length: number }>;
  step8_reconstructed_pixels: number[][];
}

export interface HuffmanTreeNode {
  freq: number;
  symbol?: string;
  left?: HuffmanTreeNode;
  right?: HuffmanTreeNode;
}

export interface JobEntry {
  id: string;
  filename: string;
  status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE';
  progress: number;
  stage: string;
  error?: string;
  payload?: ProfilerDataset;
  createdAt: number;
  storageJobId?: string;
  storageStatus?: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE';
  imageId?: string;
}

export interface StorageJobResult {
  upload_response: {
    image_id: string;
    bucket: string;
    object_name: string;
    stored_path: string;
    sha256: string;
  };
}

export type ChannelKey = 'y_channel' | 'cb_channel' | 'cr_channel';
export type ChannelLabel = 'Y' | 'Cb' | 'Cr';

export interface StoredImage {
  image_id: string;
  filename: string;
  upload_timestamp: string;
  width: number;
  height: number;
  file_size: number;
  compression_ratio: number | null;
}

export interface StoredImagesResponse {
  images: StoredImage[];
  total: number;
}
