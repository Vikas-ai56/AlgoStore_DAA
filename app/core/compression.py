# Quantize the DCT matrix -> Apply Run-Length Encoding (RLE) to the sparse zeros -> Apply Huffman Encoding for final compression.
import os
import sys
import numpy as np
import cv2
from collections import Counter
from skimage.metrics import structural_similarity as ssim  

from ..utils import (
    Heap, 
    heapify,
    heapifyExtract,
    insertNode,
    extractNode,
    MinHeap
)

# -------------------------------------------------------------------------------
# Huffman Node initialization
# -------------------------------------------------------------------------------

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

    def __repr__(self):
        return f"Node(val={self.value}, freq={self.frequency})"
    
# -------------------------------------------------------------------------------
# Huffman Encode and Decode
# -------------------------------------------------------------------------------

class Huffman:
    def __init__(self): 
        self.tree = None

    def rle_encode(self, image_array):
        # Flatten the 2D array
        flat = image_array.flatten()
        encoded = []
        
        if len(flat) == 0:
            return encoded
            
        prev = flat[0]
        count = 1
        
        for pixel in flat[1:]:
            if pixel == prev:
                count += 1
            else:
                encoded.append((int(prev), count))
                prev = pixel
                count = 1
        encoded.append((int(prev), count))
        return encoded

    def huffman_encode(self, table: dict):
        minHeap = MinHeap()
        for char, freq in table.items():
            minHeap.push(HuffmanNode(char, freq))
            
        # Edge case: If the image is a single solid color
        if minHeap.length == 1:
            self.tree = minHeap.pop()
            return {self.tree.char: "0"}
            
        while minHeap.length > 1:
            l = minHeap.pop()
            r = minHeap.pop()
            node = HuffmanNode(str(l.frequency + r.frequency), l.frequency + r.frequency)
            node.left, node.right = l, r
            minHeap.push(node)
            
        self.tree = minHeap.pop()
        
        # Pass None instead of {} to avoid the mutable default argument bug!
        return self.get_codes(self.tree, "", codes=None)

    def get_codes(self, node, current_code="", codes=None):
        if codes is None:
            codes = {}
        if not node: 
            return codes
            
        if isinstance(node.value, tuple):
            codes[node.value] = current_code
            
        self.get_codes(node.left, current_code + "0", codes)
        self.get_codes(node.right, current_code + "1", codes)
        return codes

    def huffman_decode(self, bitstream, code_to_symbol):
        decoded = []
        current = ""
        for bit in bitstream:
            current += bit
            if current in code_to_symbol:
                decoded.append(code_to_symbol[current])
                current = ""
        return decoded

    def rle_decode(self, rle_encoded, shape):
        flat = []
        for value, count in rle_encoded:
            flat.extend([value] * count)
        return np.array(flat, dtype=np.uint8).reshape(shape)

# ------------------------------------------------------------------------------
# Core Wrappers
# ------------------------------------------------------------------------------

def compress_image(channel, quantization_factor=32):
    huffman = Huffman()
    
    if len(channel.shape) == 3:
        channel = cv2.cvtColor(channel, cv2.COLOR_BGR2GRAY)
        
    original_shape = channel.shape
        
    quantized_channel = (channel // quantization_factor) * quantization_factor
    rle_encoded = huffman.rle_encode(quantized_channel)
    
    freq_table = Counter(rle_encoded)
    
    codes = huffman.huffman_encode(freq_table)
    
    bitstream = ''.join([codes[symbol] for symbol in rle_encoded])
    code_to_symbol = {v: k for k, v in codes.items()}
    
    return bitstream, code_to_symbol, original_shape
    
def decompress_image(bitstream, code_to_symbol, shape):
    huffman = Huffman()
    
    decoded_rle = huffman.huffman_decode(bitstream, code_to_symbol)
    reconstructed = huffman.rle_decode(decoded_rle, shape)
    
    return reconstructed

# ------------------------------------------------------------------------------
# Engineering Optimization Functions (NEW)
# ------------------------------------------------------------------------------

def evaluate_compression(original_img, quantized_img, bitstream_length):
    """Calculates the Rate (Size) and Distortion (SSIM)."""
    score, _ = ssim(original_img, quantized_img, full=True, data_range=255)
    original_bits = original_img.size * 8
    compression_ratio = bitstream_length / original_bits
    return score, compression_ratio

def find_optimal_quantization(image, target_ssim=0.85):
    """Sweeps through quantization factors to find optimal compression."""
    if len(image.shape) == 3:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    print(f"\n--- Running Rate-Distortion Optimization Sweep ---")
    print(f"{'Factor':<10} | {'SSIM (Quality)':<15} | {'Compression Ratio'}")
    print("-" * 50)

    best_factor = 1
    best_ratio = 1.0
    test_factors = [1, 8, 16, 24, 32, 48, 64, 96, 128]

    for q in test_factors:
        quantized = (image // q) * q
        bitstream, _, _ = compress_image(image, quantization_factor=q)
        current_ssim, current_ratio = evaluate_compression(image, quantized, len(bitstream))
        
        print(f"q={q:<8} | {current_ssim:<15.4f} | {current_ratio:.2%}")

        if current_ssim >= target_ssim:
            if current_ratio < best_ratio:
                best_ratio = current_ratio
                best_factor = q
        else:
            break

    print("-" * 50)
    print(f"Optimal Factor Selected: {best_factor} (Target SSIM >= {target_ssim})\n")
    return best_factor

# ------------------------------------------------------------------------------
# Execution
# ------------------------------------------------------------------------------

if __name__ == "__main__":
    image_path = "/home/vikas/Pictures/Screenshots/Screenshot from 2026-03-21 16-00-21.png"
    print(f"Loading test image from: {image_path}")
    real_image = cv2.imread(image_path)
    
    if real_image is None:
        print("Error: Could not load image. Please verify the file path.")
    else:
        if len(real_image.shape) == 3:
            original_gray = cv2.cvtColor(real_image, cv2.COLOR_BGR2GRAY)
        else:
            original_gray = real_image

        optimal_q = find_optimal_quantization(original_gray, target_ssim=0.85)

        print("Compressing with optimal factor...")
        bitstream, dict_mapping, shape = compress_image(original_gray, quantization_factor=optimal_q)

        original_bits = original_gray.size * 8
        compressed_bits = len(bitstream)
        ratio = compressed_bits / original_bits
        
        print("\n--- Final Compression Report ---")
        print(f"Original Size (Grayscale): {original_bits:,} bits")
        print(f"Compressed Size:           {compressed_bits:,} bits")
        print(f"Compression Ratio:         {ratio:.2%} of original size")
        
        print("\nDecompressing...")
        reconstructed_image = decompress_image(bitstream, dict_mapping, shape)
        print(f"Reconstruction Successful: {reconstructed_image.shape == shape}")
               
        cv2.imshow("1 - Original (Grayscale)", original_gray)
        cv2.imshow(f"2 - Reconstructed (Quantization Factor={optimal_q})", reconstructed_image)
        
        cv2.waitKey(0)
        cv2.destroyAllWindows()