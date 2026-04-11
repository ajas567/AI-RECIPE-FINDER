# debug_pipeline.py
# Run this from your project root: python debug_pipeline.py

from modules.processing import process_ingredients
from modules.similarity import get_engine
from modules.recommendation import get_recommendation_engine

print("=" * 60)
print("STEP 1 — Testing processing module")
print("=" * 60)
test_inputs = ["egg", "butter", "milk", "chicken", "onion"]
for t in test_inputs:
    result = process_ingredients([t])
    print(f"  '{t}' → {result}")

print("\n" + "=" * 60)
print("STEP 2 — Testing similarity engine")
print("=" * 60)
engine = get_engine()
print(f"  Loaded {len(engine.master_ingredients)} ingredients into RAM")

valid = []
for t in test_inputs:
    cleaned = process_ingredients([t])
    if cleaned:
        match = engine.find_match(cleaned[0])
        print(f"  '{t}' → cleaned='{cleaned[0]}' → match={match.get('match')} (confidence={match.get('confidence', 0):.2f})")
        if match.get("match"):
            valid.append(match["match"])

print(f"\n  valid_ingredients = {valid}")

print("\n" + "=" * 60)
print("STEP 3 — Testing recommendation engine")
print("=" * 60)
rec = get_recommendation_engine()

# Test with valid_ingredients from above
results = rec.find_recipes(valid, limit=3, min_match_percentage=0.1)
print(f"  Results count: {len(results)}")
for r in results:
    print(f"  → {r['name']} | match={r.get('match_percentage', 0)*100:.0f}%")

# Also test with raw ingredient names directly (bypass similarity)
print("\n--- Direct test bypassing similarity ---")
direct = ["egg", "butter", "milk", "chicken", "onion"]
results2 = rec.find_recipes(direct, limit=3, min_match_percentage=0.1)
print(f"  Results count with raw names: {len(results2)}")
for r in results2:
    print(f"  → {r['name']} | match={r.get('match_percentage', 0)*100:.0f}%")

    # Add this to the bottom of debug_pipeline.py
print("\n" + "=" * 60)
print("STEP 4 — Inspecting DB directly")
print("=" * 60)
from pymongo import MongoClient

col = MongoClient()['recipe_finder']['recipes']

# Check total recipe count
total = col.count_documents({})
print(f"  Total recipes in DB: {total}")

# Check if ingredients_canonical field exists at all
has_canonical = col.count_documents({"ingredients_canonical": {"$exists": True}})
print(f"  Recipes WITH ingredients_canonical field: {has_canonical}")

# Show what a sample document's ingredients_canonical looks like
sample = col.find_one({"ingredients_canonical": {"$exists": True}})
if sample:
    print(f"\n  Sample recipe: {sample.get('recipe_title')}")
    print(f"  ingredients_canonical: {sample.get('ingredients_canonical')}")
    print(f"  num_ingredients: {sample.get('num_ingredients')}")
else:
    print("  NO documents have ingredients_canonical!")

# Try the regex directly on one known ingredient
print("\n  Testing $regex 'egg' directly on DB...")
regex_count = col.count_documents({"ingredients_canonical": {"$regex": "egg", "$options": "i"}})
print(f"  Recipes matching regex 'egg': {regex_count}")

regex_count2 = col.count_documents({"ingredients_canonical": {"$regex": "butter", "$options": "i"}})
print(f"  Recipes matching regex 'butter': {regex_count2}")

# Check if ingredients_canonical is array of strings or something else
sample2 = col.find_one({"ingredients_canonical": {"$regex": "egg", "$options": "i"}})
if sample2:
    print(f"\n  First egg-matching recipe: {sample2.get('recipe_title')}")
    print(f"  ingredients_canonical type check: {type(sample2.get('ingredients_canonical'))}")
    print(f"  First element type: {type(sample2.get('ingredients_canonical', [''])[0])}")
    print(f"  First element value: '{sample2.get('ingredients_canonical', [''])[0]}'")
else:
    print("  Regex 'egg' matched NOTHING — ingredients_canonical may be wrong type or empty")

    # Add to debug_pipeline.py bottom and run
print("\n" + "=" * 60)
print("STEP 5 — Check recipe field names")
print("=" * 60)
from pymongo import MongoClient
col = MongoClient()['recipe_finder']['recipes']

sample = col.find_one({})
print("All fields in a sample document:")
for key in sample.keys():
    val = sample[key]
    # Show first 80 chars of value
    print(f"  '{key}': {str(val)[:80]}")