from app.core.phash import phash_distance

class BKNode:
    def __init__(self, phash_str: str, image_id: str):
        self.phash = phash_str
        self.image_ids = [image_id]  # Store multiple image_ids if they have identical hashes
        self.children = {}  # distance (int) -> BKNode


class BKTree:
    """
    A Burkhard-Keller (BK) Tree implementation for fast Hamming distance searches.
    Ideal for metric spaces like perceptual hashes.
    """
    def __init__(self):
        self.root = None

    def add(self, phash_str: str, image_id: str):
        if not self.root:
            self.root = BKNode(phash_str, image_id)
            return

        curr = self.root
        while True:
            dist = phash_distance(phash_str, curr.phash)
            if dist == 0:
                # Same pHash, append image_id to handle duplicates cleanly
                if image_id not in curr.image_ids:
                    curr.image_ids.append(image_id)
                return
            
            if dist in curr.children:
                curr = curr.children[dist]
            else:
                curr.children[dist] = BKNode(phash_str, image_id)
                return

    def search(self, query_phash: str, max_distance: int = 10) -> list[tuple[int, str, str]]:
        """
        Search for hashes within a maximum Hamming distance.
        Returns a sorted list of tuples: (distance, phash, image_id)
        """
        if not self.root:
            return []

        results = []
        candidates = [self.root]

        while candidates:
            node = candidates.pop()
            dist = phash_distance(query_phash, node.phash)
            
            # If distance is within threshold, keep all image_ids associated with this node
            if dist <= max_distance:
                for img_id in node.image_ids:
                    results.append((dist, node.phash, img_id))

            # Triangle inequality guarantees that any child worth exploring will have a
            # distance from the parent bounded by [dist - max_distance, dist + max_distance]
            lower_bound = dist - max_distance
            upper_bound = dist + max_distance

            for child_dist, child_node in node.children.items():
                if lower_bound <= child_dist <= upper_bound:
                    candidates.append(child_node)

        # Sort by closest first (distance ascending)
        return sorted(results, key=lambda x: x[0])
