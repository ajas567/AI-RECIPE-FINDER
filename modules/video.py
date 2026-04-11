import urllib.parse

def get_youtube_search_link(recipe_name: str) -> str:
    """
    Takes a recipe name and generates a safe YouTube search URL.
    This provides instant access to video tutorials for free without API keys.
    """
    # Clean the recipe name and prepare the query
    query = f"how to cook {recipe_name} recipe"
    
    # URL encode the string (e.g. turns spaces into + or %20 safely)
    encoded_query = urllib.parse.quote_plus(query)
    
    return f"https://www.youtube.com/results?search_query={encoded_query}"

# Testing
if __name__ == '__main__':
    print(get_youtube_search_link("Chicken Parmesan"))
    print(get_youtube_search_link("Spicy Beef & Broccoli"))
