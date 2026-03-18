# Quantize the DCT matrix -> Apply Run-Length Encoding (RLE) to the sparse zeros -> Apply Huffman Encoding for final compression.

from utils import (
    Heap, 
    heapify,
    heapifyExtract,
    insertNode,
    extractNode
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
# 
# -------------------------------------------------------------------------------