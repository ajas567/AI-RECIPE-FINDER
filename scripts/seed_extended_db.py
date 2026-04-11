import json
import pymongo
import os

def seed_database():
    print("Connecting to MongoDB [localhost:27017]...")
    try:
        client = pymongo.MongoClient("mongodb://localhost:27017/")
        db = client["ai_recipe_finder"]
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        return
        
    # --- 1. Seed the massive Recipes collection ---
    recipes_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db', 'recipes_extended.json')
    print(f"Loading {recipes_file}...")
    try:
        with open(recipes_file, 'r', encoding='utf-8') as f:
            recipes = json.load(f)
    except Exception as e:
        print(f"Error loading recipes JSON: {e}")
        return
            
    print(f"Dropping old 'recipes' collection and batch-inserting {len(recipes)} recipes...")
    db.recipes.drop()
    if recipes:
        db.recipes.insert_many(recipes)
    print("✅ Recipes seeded successfully!\n")
    
    # --- 2. Seed the Unique Ingredients dictionary ---
    ingredients_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db', 'unique_ingredients.json')
    print(f"Loading {ingredients_file}...")
    try:
        with open(ingredients_file, 'r', encoding='utf-8') as f:
            ingredients = json.load(f)
    except Exception as e:
        print(f"Error loading ingredients JSON: {e}")
        return
        
    print(f"Dropping old 'ingredients' collection and batch-inserting {len(ingredients)} ingredients...")
    # MongoDB requires documents (dictionaries), not primitive strings
    ingredient_docs = [{"name": ing} for ing in ingredients]
    db.ingredients.drop()
    if ingredient_docs:
        db.ingredients.insert_many(ingredient_docs)
    print("✅ Ingredients dictionary seeded successfully!\n")
    
    # 3. Create Indexes for Lightning-Fast Queries
    print("Building high-performance indexes...")
    db.recipes.create_index([("ingredients_canonical", pymongo.ASCENDING)])
    db.recipes.create_index([("tags", pymongo.ASCENDING)])
    db.ingredients.create_index([("name", pymongo.ASCENDING)], unique=True)
    print("✅ Indexes deployed!\n")
    
    print("🎉 Database Migration Complete!")

if __name__ == "__main__":
    seed_database()
