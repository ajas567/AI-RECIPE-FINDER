import json
from pymongo import MongoClient

def upload_categories():
    print("Connecting to local MongoDB (mongodb://localhost:27017/)...")
    try:
        client = MongoClient('mongodb://localhost:27017/')
        db = client['ai_recipe_finder']
        collection = db['ingredient_categories']
        
        # Clear out any old versions
        collection.drop()
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return

    print("Loading categories.json...")
    with open('db/categories.json', 'r', encoding='utf-8') as f:
        categories = json.load(f)

    # Convert dictionary {"ingredient": "Category"} to a list of records
    # [{"ingredient": "salt", "category": "Spices & Seasonings"}, ...]
    records = [{"ingredient": k, "category": v} for k, v in categories.items()]

    print(f"Inserting {len(records)} category mappings into 'ingredient_categories' collection...")
    if records:
        collection.insert_many(records)
        
    print("Creating index on 'ingredient' for fast lookups...")
    collection.create_index('ingredient', unique=True)
    
    print("Creating index on 'category'...")
    collection.create_index('category')

    print("Done! Categories uploaded successfully.")

if __name__ == '__main__':
    upload_categories()
