class MinHeap:
    def __init__(self): 
        self.heap = []
        
    @property
    def length(self): 
        return len(self.heap)
        
    def push(self, child):
        self.heap.append(child)
        idx = self.length - 1
        parent = (idx - 1) // 2
        while idx > 0 and self.heap[parent] > self.heap[idx]:
            self.heap[parent], self.heap[idx] = self.heap[idx], self.heap[parent]
            idx = parent
            parent = (idx - 1) // 2
            
    def pop(self):
        if not self.heap: return None
        self.heap[0], self.heap[-1] = self.heap[-1], self.heap[0]
        temp = self.heap.pop()
        idx = 0
        while True:
            left, right = 2 * idx + 1, 2 * idx + 2
            smallest = idx
            if left < self.length and self.heap[left] < self.heap[smallest]:
                smallest = left
            if right < self.length and self.heap[right] < self.heap[smallest]:
                smallest = right
            if smallest == idx: break
            self.heap[idx], self.heap[smallest] = self.heap[smallest], self.heap[idx]
            idx = smallest
        return temp
    
class Heap:
    def __init__(self,size):
        self.list = [None]*(size+1)
        self.heapsize = 0
        self.maxsize = size+1


def heapify(root , index , type="Min"): # Used to heapify after a new node is inserted
    parent = index//2
    if index <= 1:
        return
    if type == "Min": 
        if root.list[index]<root.list[parent]:
            root.list[index] , root.list[parent] = root.list[parent] , root.list[index]
            heapify(root , parent , type)
    if type == "Max":
        if root.list[parent]<root.list[index]:
            root.list[index] , root.list[parent] = root.list[parent] , root.list[index]
            heapify(root , parent , type)

def insertNode(root , value , type="Min"):
    if root.heapsize == root.maxsize-1:
        return "Full"
    
    root.list[root.heapsize+1] = value
    root.heapsize += 1
    heapify(root , root.heapsize , type)
    return "Inserted Successfully"
    
def heapifyExtract(root , index , type="Min"): # Used to heapify after extracting the root node
    left = index*2
    right = left+1
    swapchild = 0
    if root.heapsize < left:
        return
    # If rootnode has only one-child (it will always be left because insertion takes place on left first)
    elif root.heapsize == left:
        if type == "Min":
            if root.list[index] > root.list[left]:
                root.list[left] , root.list[index] = root.list[index] , root.list[left]
            return
        else:
            if root.list[index] < root.list[left]:
                root.list[left] , root.list[index] = root.list[index] , root.list[left]
            return
    # If rootnode has two children
    # We will swap the minimum child's data with parent's data if type ={Min} 
    # We will swap the maximum child's data with parent's data if type ={Max}
    else:
        if type == 'Min':
            if root.list[left] < root.list[right]:
                swapchild = left
            else:
                swapchild = right
            if root.list[index] > root.list[swapchild]:
                root.list[swapchild] , root.list[index] = root.list[index] , root.list[swapchild]
                heapifyExtract(root , swapchild , type)
        else:
            if root.list[left] > root.list[right]:
                swapchild = left
            else:
                swapchild = right
            if root.list[index] < root.list[swapchild]:
                root.list[swapchild] , root.list[index] = root.list[index] , root.list[swapchild]
            # checking for next remaining nodes
            heapifyExtract(root , swapchild , type)

def extractNode(rootNode, heapType):
    if rootNode.heapsize == 0:
        return
    else:
        extractedNode = rootNode.list[1]
        rootNode.list[1] = rootNode.list[rootNode.heapsize]
        rootNode.list[rootNode.heapsize] = None
        rootNode.heapsize -= 1
        heapifyExtract(rootNode , 1 , heapType)
        return extractedNode