import os
import json
import faiss
import numpy as np
import time
from sentence_transformers import SentenceTransformer
from database import get_client, DB_NAME

# 1. Connect to Database
client = get_client()
db = client[DB_NAME]
recipes_col = db['recipes']

total_recipes = recipes_col.count_documents({})
print(f"Preparing to embed {total_recipes} recipes into FAISS Semantic Space...")

# 2. Load the AI Transformer Model
print("Loading NLP Transformer Model (all-MiniLM-L6-v2)...")
model = SentenceTransformer('all-MiniLM-L6-v2')
D = 384 # Embedding dimensionality of this specific model

# 3. Initialize FAISS Index (L2 distance or Inner Product)
# IndexFlatIP is Inner Product (good for Cosine Similarity if normalized)
# IndexFlatL2 is Euclidean standard. We will use L2 distance for exact matches.
index = faiss.IndexFlatL2(D)

# 4. Prepare batching architecture
batch_size = 2500
processed = 0
mapper = {} # Maps FAISS index integer to MongoDB ObjectId strictly
documents = []
mongo_ids = []

print("Extracting features from MongoDB...")
start_time = time.time()

cursor = recipes_col.find({}, {
    "_id": 1, 
    "recipe_title": 1, 
    "description": 1, 
    "ingredients_canonical": 1
})

for recipe in cursor:
    # Safely extract text fields
    title = str(recipe.get('recipe_title') or '')
    desc = str(recipe.get('description') or '')
    ingredients = " ".join(recipe.get('ingredients_canonical') or [])
    
    # Concatenate into one continuous NLP block for maximal semantic density
    nlp_string = f"Recipe: {title}. {desc} Ingredients: {ingredients}."
    
    documents.append(nlp_string)
    mongo_ids.append(str(recipe['_id']))
    
    if len(documents) == batch_size:
        print(f"  Encoding batch ({processed} -> {processed + batch_size})")
        # Generate mathematical coordinates
        embeddings = model.encode(documents, convert_to_numpy=True)
        # Normalize vectors prior to FAISS injection if needed, but L2 distance naturally sorts semantic closeness
        index.add(embeddings)
        
        # Link mapping
        for i, m_id in enumerate(mongo_ids):
            mapper[processed + i] = m_id
            
        processed += batch_size
        documents = []
        mongo_ids = []

# Process remaining
if documents:
    print(f"  Encoding final batch...")
    embeddings = model.encode(documents, convert_to_numpy=True)
    index.add(embeddings)
    for i, m_id in enumerate(mongo_ids):
        mapper[processed + i] = m_id
    processed += len(documents)

# 5. Save the neural network outputs to the physical drive
print("Saving FAISS index & Object Mapper to disk...")
faiss.write_index(index, "recipe_faiss.index")

with open("index_to_mongo_id.json", "w") as f:
    json.dump(mapper, f)
    
elapsed = time.time() - start_time
print(f"Complete! Successfully vectorized {processed} global definitions in {elapsed:.2f} seconds.")
