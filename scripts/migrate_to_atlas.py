import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

def migrate_database():
    print("Connecting to Local MongoDB...")
    local_client = MongoClient("mongodb://localhost:27017/")
    local_db = local_client["ai_recipe_finder"]
    
    print("Connecting to Atlas Cloud...")
    atlas_uri = os.getenv("MONGO_URI")
    if not atlas_uri:
        raise ValueError("MONGO_URI not found in .env file")
    
    atlas_client = MongoClient(atlas_uri)
    atlas_db = atlas_client["ai_recipe_finder"]
    
    collections = local_db.list_collection_names()
    
    for coll_name in collections:
        print(f"\nMigrating collection: {coll_name}...")
        local_col = local_db[coll_name]
        atlas_col = atlas_db[coll_name]
        
        atlas_col.drop() # Clear anything currently in atlas for a fresh slate
        
        docs = list(local_col.find())
        if not docs:
            print(f"  Empty collection, skipping.")
            continue
            
        print(f"  Found {len(docs)} documents. Uploading in batches...")
        
        # Batch insert to handle massive data limits
        batch_size = 5000
        for i in range(0, len(docs), batch_size):
            batch = docs[i:i+batch_size]
            atlas_col.insert_many(batch)
            print(f"  -> Uploaded {min(i+batch_size, len(docs))} of {len(docs)}...")
            
        # Re-apply vital indexes based on collection
        print(f"  Applying performance indexes...")
        if coll_name == "recipes":
            from pymongo import ASCENDING
            atlas_col.create_index([("ingredients_canonical", ASCENDING)])
            atlas_col.create_index([("tags", ASCENDING)])
        elif coll_name == "ingredients":
            from pymongo import ASCENDING
            atlas_col.create_index([("name", ASCENDING)], unique=True)
        elif coll_name == "ingredient_categories":
            atlas_col.create_index("ingredient", unique=True)
            atlas_col.create_index("category")
        elif coll_name == "user_dictionary":
            atlas_col.create_index("raw_ingredient", unique=True)
        elif coll_name == "users":
            atlas_col.create_index("email", unique=True)
            
    print("\nAll Collections cleanly migrated to Atlas!")

if __name__ == "__main__":
    migrate_database()
