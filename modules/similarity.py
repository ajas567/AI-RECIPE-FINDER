import numpy as np
from scipy.spatial.distance import cdist
from sentence_transformers import SentenceTransformer
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from database import get_client, DB_NAME

class SemanticEngine:
    def __init__(self):
        print("Initializing Semantic Similarity Engine...")
        self.client = get_client()
        self.db = self.client[DB_NAME]
        self.cache_db = self.client[DB_NAME]
        self.categories_col = self.db['ingredient_categories']
        self.cache_col = self.cache_db['user_dictionary'] # The cache we discussed
        
        # Ensure cache index exists for fast lookup
        self.cache_col.create_index('raw_ingredient', unique=True)
        
        print("Loading Model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        print("Loading Master Vectors into RAM...")
        self.master_ingredients = []
        self.master_categories = []
        vectors = []
        
        # Load all documents that have an embedding
        # We project only the fields we need to save memory
        cursor = self.categories_col.find(
            {"embedding": {"$exists": True}}, 
            {"ingredient": 1, "category": 1, "embedding": 1, "_id": 0}
        )
        for doc in cursor:
            self.master_ingredients.append(doc['ingredient'])
            self.master_categories.append(doc['category'])
            vectors.append(doc['embedding'])
            
        # Convert the list of vectors into a fast numpy matrix for instantaneous math
        self.vector_matrix = np.array(vectors)
        print(f"Engine Ready! Loaded {len(self.master_ingredients)} ingredients into Memory.")

    def find_match(self, user_ingredient: str, threshold: float = 0.65) -> dict:
        """
        Takes a cleaned user ingredient string.
        Returns the best matched master ingredient, its category, and confidence score.
        Uses the MongoDB Cache first!
        """
        # 1. FAST PATH: Check User Dictionary Cache
        cached_result = self.cache_col.find_one({"raw_ingredient": user_ingredient})
        if cached_result:
            return {
                "match": cached_result['match'],
                "category": cached_result['category'],
                "confidence": cached_result['confidence'],
                "cached": True
            }

        # 1.5. FAST PATH 2: Exact Match Bypass
        # If the cleaned user string perfectly matches a master ingredient in RAM, skip vector math!
        if user_ingredient in self.master_ingredients:
            idx = self.master_ingredients.index(user_ingredient)
            return {
                "match": self.master_ingredients[idx],
                "category": self.master_categories[idx],
                "confidence": 1.0,
                "cached": False,
                "exact_match": True
            }

        # 2. SLOW PATH: Vector Math
        # Generate the 384-dimensional vector dynamically
        user_vector = self.model.encode([user_ingredient])
        
        # Calculate Cosine distances between User Vector and ALL 20,000+ Master Vectors at once
        # cdist returns distance (0 is identical, 2 is opposite).
        distances = cdist(user_vector, self.vector_matrix, metric='cosine')[0]
        
        # Convert distances to similarity scores (0.0 to 1.0)
        similarities = 1 - distances
        
        import math
        # Find the index of the highest score (ignoring NaNs)
        best_index = np.nanargmax(similarities)
        best_score = float(similarities[best_index])
        
        best_match = self.master_ingredients[best_index]
        best_category = self.master_categories[best_index]
        
        # 3. Apply Threshold Rejection (and catch any mathematical NaNs just in case)
        if math.isnan(best_score) or best_score < threshold:
            result = {
                "match": None,
                "category": None,
                "confidence": best_score,
                "error": "Below similarity threshold"
            }
        else:
             result = {
                "match": best_match,
                "category": best_category,
                "confidence": best_score,
                "cached": False
             }
             
             # Save to User Dictionary Cache so it's instant next time!
             try:
                 self.cache_col.insert_one({
                     "raw_ingredient": user_ingredient,
                     "match": best_match,
                     "category": best_category,
                     "confidence": best_score
                 })
             except Exception:
                 pass # Ignore duplicate key errors if hitting concurrently
                 
        return result

# Singleton instance to be used by FastAPI so it only loads into RAM once on startup
engine = None

def get_engine():
    global engine
    if engine is None:
        engine = SemanticEngine()
    return engine

# Local Testing
if __name__ == '__main__':
    e = SemanticEngine()
    
    # Test cases
    tests = ["chicken breast", "sea salt", "white sugar", "chocolate chip", "salt", "car tire"]
    
    for t in tests:
        print(f"\nUser Typed: '{t}'")
        res = e.find_match(t)
        if res.get("match"):
            print(f"Matched -> '{res['match']}' (Category: {res['category']}) Confidence: {res['confidence']:.2f}")
            print(f"Was cached: {res.get('cached')}")
        else:
             print(f"Rejected! Best score was {res['confidence']:.2f}. {res['error']}")
