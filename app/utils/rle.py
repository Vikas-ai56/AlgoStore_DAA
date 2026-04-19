import cv2
import numpy as np

# ==========================================
# RLE CORE ALGORITHMS
# ==========================================

def rle_encode(flat_pixel_array):
    """
    Compresses a 1D array of pixels using Run-Length Encoding.
    Returns a list of tuples: [(pixel_value, count), ...]
    """
    if len(flat_pixel_array) == 0:
        return []

    encoded_data = []
    current_pixel = flat_pixel_array[0]
    count = 1

    for pixel in flat_pixel_array[1:]:
        if pixel == current_pixel:
            # The run continues
            count += 1
        else:
            # The run broke, save the previous run and start a new one
            encoded_data.append((int(current_pixel), count))
            current_pixel = pixel
            count = 1
            
    # Append the very last run
    encoded_data.append((int(current_pixel), count))
    
    return encoded_data

def rle_decode(encoded_data):
    """
    Decompresses the RLE tuples back into a flat 1D pixel array.
    """
    decoded_pixels = []
    for pixel_value, count in encoded_data:
        # Extend the list by repeating the pixel_value 'count' times
        decoded_pixels.extend([pixel_value] * count)
        
    return np.array(decoded_pixels, dtype=np.uint8)