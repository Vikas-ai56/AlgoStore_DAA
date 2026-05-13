# Compression Migration Notes (JPEG-style)

1. Updated block transform from 1D DCT/IDCT to true 2D separable DCT/IDCT.
2. The new transform uses orthonormal normalization on both axes.
3. This matches the IDCT explanation where each 8x8 block is frequency-domain encoded.
4. Kept level shift (subtract 128 before DCT, add 128 after IDCT).
5. Kept 8x8 quantization matrix workflow and per-block quantize/dequantize steps.
6. Removed global matrix flattening for entropy preparation.
7. Added standard 8x8 zigzag coefficient ordering helpers.
8. Encoding now works per block, not over a full flattened image.
9. DC coefficient is now differential coded against previous block DC.
10. DC symbol uses magnitude category, amplitude bits are appended raw.
11. AC coefficients now use JPEG-like (run, size) symbols.
12. Added ZRL behavior for runs longer than 15 zeros: symbol (15, 0).
13. Added EOB behavior for trailing zero run at block end: symbol (0, 0).
14. Huffman frequency tables are now built separately for DC and AC symbols.
15. Added optional dummy-node tree handling for JPEG padding-safety constraints.
16. Huffman output is now converted to canonical Huffman codes.
17. Decoder now uses separate DC and AC codebooks with bit-by-bit symbol parsing.
18. Added amplitude bit decode logic for signed reconstruction of coefficients.
19. Decompressor rebuilds each 8x8 block from zigzag stream and places it in raster order.
20. Meta now includes num_blocks for explicit block-level decode intent.
21. Public API is unchanged: compress_image/decompress_image signatures are preserved.
22. Return payload remains (bitstream, code_to_symbol, meta) to keep caller compatibility.
23. code_to_symbol is now structured as nested tables: dc and ac.
24. Implementation is now aligned with the Huffman and IDCT references at algorithm level.
