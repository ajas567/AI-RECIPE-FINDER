import json
import os
import sys

# Add the parent directory to sys.path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from modules.processing import clean_ingredient_text

def extract_canonical_ingredients():
    input_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db', 'recipes_extended.json')
    output_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db', 'unique_ingredients.json')
    
    print(f"Loading {input_file}...")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            recipes = json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find {input_file}!")
        return
        
    unique_ingredients = set()
    total_recipes = len(recipes)
    print(f"Loaded {total_recipes} recipes. Extracting canonical ingredients...")
    
    for recipe in recipes:
        if 'ingredients_canonical' in recipe and isinstance(recipe['ingredients_canonical'], list):
            for ingredient in recipe['ingredients_canonical']:
                # Run the aggressively trained NLP text-clearer module
                clean_ingredient = clean_ingredient_text(str(ingredient))
                if clean_ingredient:
                    unique_ingredients.add(clean_ingredient.strip())
                    
    # Sort alphabetically
    sorted_ingredients = sorted(list(unique_ingredients))
    
    print(f"Found {len(sorted_ingredients)} unique canonical ingredients.")
    
    print(f"Saving to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(sorted_ingredients, f, indent=4)
        
    print("Done!")

if __name__ == "__main__":
    extract_canonical_ingredients()
