import json

def categorize_ingredients(input_file='db/unique_ingredients.json', output_file='db/categories.json'):
    print(f"Loading {input_file}...")
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            ingredients = json.load(f)
    except Exception as e:
        print(f"Error loading {input_file}: {e}")
        return

    # Define our extensive categorization ruleset
    # Order matters here! E.g., check for specific things before broad things
    rules = {
        "Meat": ["beef", "pork", "lamb", "mutton", "veal", "venison", "bacon", "prosciutto", "ham", "sausage", "pepperoni", "salami", "steak", "ground meat", "meatball"],
        "Poultry": ["chicken", "turkey", "duck", "goose", "quail", "game hen"],
        "Seafood": ["fish", "salmon", "tuna", "shrimp", "prawn", "crab", "lobster", "scallop", "clam", "mussel", "oyster", "squid", "octopus", "cod", "tilapia", "halibut", "anchovy"],
        "Dairy": ["milk", "cheese", "butter", "cream", "yogurt", "whey", "buttermilk", "ghee", "paneer", "curd"],
        "Eggs": ["egg"],
        "Produce (Vegetables)": ["onion", "garlic", "tomato", "potato", "carrot", "celery", "pepper", "peppers", "lettuce", "spinach", "kale", "broccoli", "cauliflower", "cabbage", "zucchini", "cucumber", "squash", "eggplant", "mushroom", "peas", "corn", "bean", "beans", "lentils", "chickpeas", "asparagus", "artichoke", "radish", "turnip", "beet", "yam", "sweet potato"],
        "Produce (Fruits)": ["apple", "banana", "orange", "lemon", "lime", "grape", "strawberry", "blueberry", "raspberry", "blackberry", "cranberry", "cherry", "peach", "plum", "pear", "pineapple", "mango", "papaya", "watermelon", "melon", "kiwi", "pomegranate", "fig", "date", "coconut", "avocado", "olive"],
        "Grains & Pasta": ["rice", "pasta", "noodle", "spaghetti", "macaroni", "wheat", "oat", "barley", "quinoa", "cornmeal", "flour", "bread", "bun", "pita", "tortilla", "taco", "couscous", "bulgur", "cereal", "granola"],
        "Nuts & Seeds": ["almond", "walnut", "pecan", "cashew", "peanut", "pistachio", "macadamia", "hazelnut", "chestnut", "pine nut", "sesame", "sunflower seed", "pumpkin seed", "chia seed", "flax seed", "hemp seed"],
        "Baking & Sweets": ["sugar", "syrup", "honey", "brownie", "cookie", "cake", "chocolate", "cocoa", "vanilla", "baking powder", "baking soda", "yeast", "gelatin", "pudding", "marshmallow", "caramel", "candy", "sprinkles", "icing", "frosting", "molasses", "maple", "agave", "stevia", "sweetener"],
        "Spices & Seasonings": ["salt", "pepper", "cinnamon", "nutmeg", "ginger", "clove", "cardamom", "cumin", "coriander", "paprika", "chili", "cayenne", "turmeric", "saffron", "oregano", "basil", "thyme", "rosemary", "sage", "parsley", "cilantro", "dill", "mint", "chive", "tarragon", "bay leaf", "seasoning", "rub", "msg"],
        "Oils & Fats": ["oil", "shortening", "lard", "margarine", "spray", "grease"],
        "Sauces & Condiments": ["sauce", "ketchup", "mustard", "mayo", "mayonnaise", "relish", "vinegar", "dressing", "marinade", "salsa", "guacamole", "hummus", "pesto", "gravy", "paste", "extract", "bouillon", "broth", "stock"],
        "Beverages": ["water", "juice", "soda", "coffee", "tea", "wine", "beer", "liquor", "vodka", "rum", "whiskey", "gin", "tequila", "brandy", "champagne", "liqueur", "drink", "mix"],
        "Snacks": ["chip", "chips", "pretzel", "popcorn", "cracker"]
    }

    print(f"Assigning categories to {len(ingredients)} ingredients...")
    
    ingredient_categories = {}
    category_counts = {category: 0 for category in rules.keys()}
    category_counts["Other/Pantry"] = 0

    for item in ingredients:
        assigned_category = "Other/Pantry"
        item_lower = item.lower()
        
        # We find the first category where a keyword is a substring
        for category, keywords in rules.items():
            if any(keyword in item_lower for keyword in keywords):
                assigned_category = category
                break
                
        ingredient_categories[item] = assigned_category
        category_counts[assigned_category] += 1

    print(f"Saving mappings to {output_file}...")
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(ingredient_categories, f, indent=4)
    except Exception as e:
        print(f"Error saving {output_file}: {e}")
        return

    print("\nCategorization Summary:")
    for cat, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat}: {count} items")
        
    print("\nDone!")

if __name__ == '__main__':
    categorize_ingredients()
