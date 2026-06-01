DOCUMENTATION:-

Huffman:- https://alexdowad.github.io/huffman-coding/
DCT/IDCT:- https://alexdowad.github.io/visualizing-the-idct/

phash:- 
- **Grayscale Conversion**: Image colors are dropped to focus purely on structural elements.
- **Shrink/Resize (32x32)**: The image is heavily downsized to intentionally lose sharp details and noise, keeping only broad shapes.
- **Discrete Cosine Transform (DCT)**: Maps the spatial data into the frequency domain to isolate the low-frequency components.
- **Mean Thresholding**: The top-left 8x8 low-frequency block is extracted. Each value is compared to the block's average to produce a 64-bit (1/0) array.
- **Hex Serialization**: The 64 bits are packed and converted into a final 16-character hexadecimal string for compact storage and fast Hamming distance comparison. 