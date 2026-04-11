import re
import json
import os
import nltk
from functools import lru_cache
from nltk.corpus import stopwords, wordnet
from nltk.stem import WordNetLemmatizer
from nltk import pos_tag

# ─────────────────────────────────────────────────────────────
#  DEVELOPER CONFIGURATION
# ─────────────────────────────────────────────────────────────
DEBUG = False  # Set to True to see step-by-step NLP pipeline logs in terminal
nltk.download('punkt')

# Ensure required NLTK data is available
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

# POS tagger (handle both old + new NLTK versions)
try:
    nltk.data.find('taggers/averaged_perceptron_tagger_eng')
except LookupError:
    try:
        nltk.download('averaged_perceptron_tagger_eng')
    except:
        nltk.download('averaged_perceptron_tagger')

try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet')

# Initialize tools
lemmatizer = WordNetLemmatizer()
nltk_stops = set(stopwords.words('english'))

# ─────────────────────────────────────────────────────────────
#  PHASE 9 — Load Multi-Word Ingredient Dictionary
# ─────────────────────────────────────────────────────────────
_DICT_PATH = os.path.join(os.path.dirname(__file__), '..', 'multi_word_ingredients.json')

MULTI_WORD_INGREDIENTS: set = set()
if os.path.exists(_DICT_PATH):
    with open(_DICT_PATH, 'r', encoding='utf-8') as _f:
        MULTI_WORD_INGREDIENTS = set(json.load(_f))
    print(f"[processing] Loaded {len(MULTI_WORD_INGREDIENTS):,} multi-word ingredients from dictionary.")
else:
    print("[processing] Warning: multi_word_ingredients.json not found. Run scripts/build_ingredient_dictionary.py first.")

# Culinary stopwords and Blacklist (Measurement units + Cooking instructions)
CRAFT_STOPWORDS = {
    # Measurements & Units
    'cup', 'cups', 'teaspoon', 'teaspoons', 'tsp', 'tablespoon', 'tablespoons', 'tbsp',
    'ounce', 'ounces', 'oz', 'pound', 'pounds', 'lb', 'lbs',
    'gram', 'grams', 'g', 'kilogram', 'kilograms', 'kg',
    'milliliter', 'milliliters', 'ml', 'liter', 'liters', 'l',
    'pint', 'pints', 'quart', 'quarts', 'gallon', 'gallons',
    'inch', 'inches', 'cm', 'mm', 'fluid', 'fl',
    'pinch', 'dash', 'smidgen', 'drop', 'drops', 'stick', 'sticks',
    'can', 'cans', 'jar', 'jars', 'bottle', 'bottles', 'box', 'boxes',
    'package', 'packages', 'pkg', 'packet', 'packets',
    'slice', 'slices', 'piece', 'pieces', 'clove', 'cloves', 'head', 'heads',
    'bunch', 'bunches', 'sprig', 'sprigs', 'stalk', 'stalks', 'leaf', 'leaves',
    'whole', 'half', 'quarter',
    
    # Blacklist edge-cases (Words that fool the POS tagger in isolation)
    'mix', 'stir', 'heat', 'cook', 'serve', 'bake', 'boil', 'fry', 'roast', 'grill',
    'recipe', 'style', 'preparation', 'method', 'taste', 'garnish', 'optional',
    'temperature', 'degree', 'degrees', 'f', 'c', 'instructions', 'directions'
}

# Map POS tags to WordNet format
def get_wordnet_pos(tag):
    if tag.startswith('J'):
        return wordnet.ADJ
    elif tag.startswith('V'):
        return wordnet.VERB
    elif tag.startswith('N'):
        return wordnet.NOUN
    elif tag.startswith('R'):
        return wordnet.ADV
    return wordnet.NOUN


@lru_cache(maxsize=10000)
def cached_pos_tag(words_tuple):
    """
    Performance Boost: Caches POS tagging results for frequently seen word combinations.
    Requires a tuple because lists are unhashable in Python caches.
    """
    return pos_tag(list(words_tuple))


def _detect_multiword_phrases(text: str) -> tuple:
    """
    Phase 9.2 — Fast string lookup against the pre-cleaned dictionary.
    No runtime POS check needed — dictionary was already cleaned offline
    by scripts/clean_dictionary.py (only noun-based phrases remain).

    Returns:
      - found_phrases : list of matched multi-word phrases
      - remaining_text: text with matched phrases removed
    """
    found_phrases = []
    remaining = text

    # Sort by length desc — match trigrams before bigrams
    for phrase in sorted(MULTI_WORD_INGREDIENTS, key=len, reverse=True):
        # Use regex word boundaries (\b) to prevent partial substring matches
        pattern = r'\b' + re.escape(phrase) + r'\b'
        
        if re.search(pattern, remaining):
            found_phrases.append(phrase)
            remaining = re.sub(pattern, ' ', remaining)

    return found_phrases, remaining


def clean_ingredient_text(text: str) -> str:
    """
    Advanced cleaning:
    - Lowercase
    - Remove punctuation/numbers
    - Phase 9: Detect & preserve known multi-word ingredients first
    - POS tagging (to remove adjectives/adverbs like 'freshly', 'chopped')
    - Lemmatization with POS
    - Remove stopwords + culinary words
    """

    # 1. Lowercase & save original for debugging
    text_original = text
    text = text.lower()

    # 2. Remove non-letters
    text = re.sub(r'[^a-z\s]', ' ', text)
    text = ' '.join(text.split())  # collapse extra spaces

    # 3. Phase 9.2 — Detect multi-word ingredients BEFORE tokenization strips them
    preserved_phrases, remaining_text = _detect_multiword_phrases(text)

    if DEBUG:
        print(f"\n[DEBUG] Original      : '{text_original}'")
        print(f"[DEBUG] Multi-word    : {preserved_phrases}")
        print(f"[DEBUG] Remaining     : '{remaining_text}'")

    # 4. Process the remaining (non-phrase) words normally
    words = remaining_text.split()
    tagged_words = cached_pos_tag(tuple(words))

    cleaned_words = []
    for word, tag in tagged_words:

        # Skip unwanted POS (adjectives, adverbs, verbs)
        if tag.startswith(('J', 'R', 'V')):
            continue

        # Remove stopwords and custom words
        if word in nltk_stops or word in CRAFT_STOPWORDS or len(word) <= 1:
            continue

        # Lemmatize with POS awareness
        wn_tag = get_wordnet_pos(tag)
        lemma = lemmatizer.lemmatize(word, wn_tag)
        cleaned_words.append(lemma)

    # 5. Merge: preserved multi-word phrases + remaining cleaned single words
    all_tokens = preserved_phrases + cleaned_words

    if DEBUG:
        print(f"[DEBUG] POS Tags      : {tagged_words}")
        print(f"[DEBUG] Cleaned Single: {cleaned_words}")
        print(f"[DEBUG] Final Tokens  : {all_tokens}")
        print("-" * 50)

    return ' '.join(all_tokens).strip()


def process_ingredients(raw_ingredients: list) -> list:
    """
    Process list of ingredients → unique cleaned list
    """
    cleaned_set = set()

    for item in raw_ingredients:
        cleaned = clean_ingredient_text(item)
        if cleaned:
            cleaned_set.add(cleaned)

    return sorted(cleaned_set)


# Test
if __name__ == '__main__':
    test_cases = [
        "2 cups of freshly chopped TOMATOES!!! and 3 large organic eggs, beaten",
        "1/2 lb of boneless chicken-breasts",
        "a pinch of Kosher salt to taste",
        "3 large organic eggs, beaten" ,
        "teapowder"
    ]

    print("Testing advanced processing module...\n")

    for t in test_cases:
        print(f"Original : {t}")
        print(f"Processed: {clean_ingredient_text(t)}\n")