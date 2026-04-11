from pymongo import MongoClient
from sentence_transformers import SentenceTransformer

def generate_ingredient_vectors():
    print("Connecting to local MongoDB (mongodb://localhost:27017/)...")
    try:
        client = MongoClient('mongodb://localhost:27017/')
        db = client['ai_recipe_finder']
        collection = db['ingredient_categories']
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return

    print("Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
    # This model is fast, tiny, and creates 384-dimensional vectors
    model = SentenceTransformer('all-MiniLM-L6-v2')

    # Find documents that don't have an embedding yet
    # This makes the script resumable if it crashes
    query = {"embedding": {"$exists": False}}
    total_docs = collection.count_documents(query)
    
    if total_docs == 0:
        print("All ingredients already have vector embeddings!")
        return
        
    print(f"Generating vectors for {total_docs} ingredients...")
    
    # Process in batches to be safe
    cursor = collection.find(query)
    
    # We will process and update 500 at a time
    batch_size = 500
    docs_to_update = []
    
    processed_count = 0
    for doc in cursor:
        docs_to_update.append(doc)
        
        if len(docs_to_update) == batch_size:
            _process_batch(docs_to_update, model, collection)
            processed_count += len(docs_to_update)
            print(f"Processed {processed_count} / {total_docs} ingredients...")
            docs_to_update = [] # Reset batch
            
    # Process any remaining documents in the last batch
    if docs_to_update:
        _process_batch(docs_to_update, model, collection)
        processed_count += len(docs_to_update)
        print(f"Processed {processed_count} / {total_docs} ingredients...")
        
    print("\nVector generation complete!")

def _process_batch(docs, model, collection):
    """Helper function to encode a batch and update MongoDB."""
    # Extract just the ingredient strings
    ingredient_texts = [doc['ingredient'] for doc in docs]
    
    # Generate vectors for the whole batch at once (much faster)
    # Convert numpy arrays to standard python lists of floats for MongoDB safety
    embeddings = model.encode(ingredient_texts).tolist()
    
    # Update MongoDB
    for doc, embedding in zip(docs, embeddings):
        collection.update_one(
            {'_id': doc['_id']},
            {'$set': {'embedding': embedding}}
        )

if __name__ == '__main__':
    generate_ingredient_vectors()
