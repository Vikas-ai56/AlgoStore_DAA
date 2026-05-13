# NOTE:- You have to add intermediate images during the compression process for presentation
# MAKE SURE TO THE ABOVE

import numpy as np
import cv2
from collections import Counter
from scipy.fft import dct, idct

from ..utils import MinHeap


class HuffmanNode:
    def __init__(self, value, frequency):
        self.value = value
        self.frequency = frequency
        self.left = None
        self.right = None

    def __lt__(self, other):
        return self.frequency < other.frequency

    def __gt__(self, other):
        return self.frequency > other.frequency


class Huffman:
    def __init__(self):
        self.tree = None

    def rle_encode(self, image_array):
        flat = image_array.flatten()
        if len(flat) == 0:
            return []

        encoded = []
        prev = int(flat[0])
        count = 1

        for pixel in flat[1:]:
            pixel = int(pixel)
            if pixel == prev:
                count += 1
            else:
                encoded.append((prev, count))
                prev = pixel
                count = 1

        encoded.append((prev, count))
        return encoded

    def huffman_encode(self, table):
        heap = MinHeap()
        for symbol, freq in table.items():
            heap.push(HuffmanNode(symbol, freq))

        if heap.length == 0:
            self.tree = None
            return {}

        if heap.length == 1:
            self.tree = heap.pop()
            return {self.tree.value: "0"}

        while heap.length > 1:
            left = heap.pop()
            right = heap.pop()
            parent = HuffmanNode(None, left.frequency + right.frequency)
            parent.left = left
            parent.right = right
            heap.push(parent)

        self.tree = heap.pop()
        return self._get_codes(self.tree)

    def _get_codes(self, node, current_code="", codes=None):
        if codes is None:
            codes = {}
        if node is None:
            return codes

        if node.left is None and node.right is None:
            codes[node.value] = current_code if current_code else "0"
            return codes

        self._get_codes(node.left, current_code + "0", codes)
        self._get_codes(node.right, current_code + "1", codes)
        return codes

    def huffman_decode(self, bitstream, code_to_symbol):
        decoded = []
        current = ""

        for bit in bitstream:
            current += bit
            if current in code_to_symbol:
                decoded.append(code_to_symbol[current])
                current = ""

        if current:
            raise ValueError("Invalid or incomplete bitstream for given Huffman codes.")

        return decoded

    def rle_decode(self, rle_encoded, shape):
        flat = []
        for value, count in rle_encoded:
            flat.extend([value] * count)
        return np.array(flat, dtype=np.int16).reshape(shape)


def _dct2(block):
    return dct(dct(block, axis=0, norm="ortho"), axis=1, norm="ortho")


def _idct2(block):
    return idct(idct(block, axis=0, norm="ortho"), axis=1, norm="ortho")


def dct_quantize_image(gray, q_factor=1.0):
    gray = gray.astype(np.float32)
    h, w = gray.shape

    pad_h = (8 - (h % 8)) % 8
    pad_w = (8 - (w % 8)) % 8
    padded = np.pad(gray, ((0, pad_h), (0, pad_w)), mode="constant", constant_values=0)

    qmat = np.array(
        [
            [16, 11, 10, 16, 24, 40, 51, 61],
            [12, 12, 14, 19, 26, 58, 60, 55],
            [14, 13, 16, 24, 40, 57, 69, 56],
            [14, 17, 22, 29, 51, 87, 80, 62],
            [18, 22, 37, 56, 68, 109, 103, 77],
            [24, 35, 55, 64, 81, 104, 113, 92],
            [49, 64, 78, 87, 103, 121, 120, 101],
            [72, 92, 95, 98, 112, 100, 103, 99],
        ],
        dtype=np.float32,
    ) * float(q_factor)
    qmat[qmat < 1] = 1

    shifted = padded - 128.0
    quantized = np.zeros_like(shifted, dtype=np.int16)

    H, W = padded.shape
    for i in range(0, H, 8):
        for j in range(0, W, 8):
            block = shifted[i : i + 8, j : j + 8]
            dct_block = _dct2(block)
            quantized[i : i + 8, j : j + 8] = np.round(dct_block / qmat).astype(np.int16)

    return quantized, (h, w), padded.shape


def dct_dequantize_reconstruct(quantized, orig_shape, padded_shape, q_factor=1.0):
    qmat = np.array(
        [
            [16, 11, 10, 16, 24, 40, 51, 61],
            [12, 12, 14, 19, 26, 58, 60, 55],
            [14, 13, 16, 24, 40, 57, 69, 56],
            [14, 17, 22, 29, 51, 87, 80, 62],
            [18, 22, 37, 56, 68, 109, 103, 77],
            [24, 35, 55, 64, 81, 104, 113, 92],
            [49, 64, 78, 87, 103, 121, 120, 101],
            [72, 92, 95, 98, 112, 100, 103, 99],
        ],
        dtype=np.float32,
    ) * float(q_factor)
    qmat[qmat < 1] = 1

    recon_shifted = np.zeros(padded_shape, dtype=np.float32)

    H, W = padded_shape
    for i in range(0, H, 8):
        for j in range(0, W, 8):
            qblock = quantized[i : i + 8, j : j + 8].astype(np.float32)
            dequant = qblock * qmat
            recon_shifted[i : i + 8, j : j + 8] = _idct2(dequant)

    recon = np.clip(np.round(recon_shifted + 128.0), 0, 255).astype(np.uint8)
    h, w = orig_shape
    return recon[:h, :w]


def compress_image(channel, quantization_factor=24):
    huffman = Huffman()

    if channel.ndim == 3:
        channel = cv2.cvtColor(channel, cv2.COLOR_BGR2GRAY)
    elif channel.ndim != 2:
        raise ValueError(f"Unsupported input shape: {channel.shape}. Expected 2D or 3D image.")

    quantized, orig_shape, padded_shape = dct_quantize_image(channel, q_factor=quantization_factor)

    rle_encoded = huffman.rle_encode(quantized)
    freq_table = Counter(rle_encoded)
    codes = huffman.huffman_encode(freq_table)

    if not codes:
        return "", {}, {"orig_shape": orig_shape, "padded_shape": padded_shape, "q_factor": quantization_factor}

    bitstream = "".join(codes[symbol] for symbol in rle_encoded)
    code_to_symbol = {code: symbol for symbol, code in codes.items()}

    meta = {
        "orig_shape": orig_shape,
        "padded_shape": padded_shape,
        "q_factor": quantization_factor,
    }
    return bitstream, code_to_symbol, meta


def decompress_image(bitstream, code_to_symbol, meta):
    huffman = Huffman()

    if bitstream == "":
        h, w = meta["orig_shape"]
        return np.zeros((h, w), dtype=np.uint8)

    decoded_rle = huffman.huffman_decode(bitstream, code_to_symbol)
    quantized = huffman.rle_decode(decoded_rle, meta["padded_shape"])

    return dct_dequantize_reconstruct(
        quantized=quantized,
        orig_shape=meta["orig_shape"],
        padded_shape=meta["padded_shape"],
        q_factor=meta["q_factor"],
    )
