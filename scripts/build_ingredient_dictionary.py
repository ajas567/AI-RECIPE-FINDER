"""
build_ingredient_dictionary.py
===============================
Extracts multi-word ingredients from MongoDB using N-gram frequency analysis.

PHASES COVERED:
  Phase 1  – MongoDB connection & data validation
  Phase 2  – Extract ingredients_canonical (duplicates preserved)
  Phase 3  – Normalize + tokenize
  Phase 4  – Bigram + Trigram generation
  Phase 5  – Frequency analysis & sorted output
  Phase 6  – Threshold selection
  Phase 7  – Filter valid phrases
  Phase 8  – Save multi_word_ingredients.json
  Phase 10 – Trigram support (included)

Run from the project root:
  python scripts/build_ingredient_dictionary.py
"""

import sys, os, re, json
from collections import Counter

# ─── Path setup so we can import database.py from root ────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from database import get_client, DB_NAME

# ─────────────────────────────────────────────────────────────────────────────
#  CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
MIN_FREQ        = 10         # Phase 6: minimum appearances to be considered valid
OUTPUT_FILE     = os.path.join(os.path.dirname(__file__), '..', 'multi_word_ingredients.json')
FREQ_REPORT     = os.path.join(os.path.dirname(__file__), '..', 'ngram_frequency_report.txt')
COLLECTION_NAME = 'recipes'

# Words that should never START a valid ingredient phrase (noise filter)
STOP_PHRASE_STARTS = {
    'a', 'an', 'the', 'about', 'or', 'and', 'for', 'of', 'to',
    'in', 'at', 'by', 'if', 'as', 'up', 'is', 'it', 'no',
    'not', 'with', 'from', 'into', 'than', 'its', 'be', 'that',
    'per', 'each', 'your', 'you', 'i', 'we', 'they', 'he', 'she',
    'use', 'add', 'mix', 'stir', 'bake', 'cook', 'heat', 'place',
}

# Words that should never END a valid ingredient phrase (noise filter)  
STOP_PHRASE_ENDS = {
    'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'at', 'by',
    'with', 'for', 'if', 'as', 'like', 'than', 'your', 'you', 'i',
    'f',   # e.g. "degrees f"
}

def is_valid_phrase(phrase: str) -> bool:
    """Returns False if phrase starts/ends with a known noise word."""
    words = phrase.split()
    if not words:
        return False
    if words[0] in STOP_PHRASE_STARTS:
        return False
    if words[-1] in STOP_PHRASE_ENDS:
        return False
    # Must contain at least one word with 3+ characters (not all short noise)
    if not any(len(w) >= 3 for w in words):
        return False
    return True


# ─────────────────────────────────────────────────────────────────────────────
#  PHASE 1 — MongoDB Connection & Data Validation
# ─────────────────────────────────────────────────────────────────────────────
def validate_connection():
    print("\n[PHASE 1] Validating MongoDB connection...")
    client = get_client()
    db = client[DB_NAME]
    col = db[COLLECTION_NAME]

    count = col.count_documents({})
    print(f"  ✅ Connected to '{DB_NAME}.{COLLECTION_NAME}' — {count:,} documents found")

    # Validate data structure
    sample = col.find_one({}, {"ingredients_canonical": 1})
    if not sample or "ingredients_canonical" not in sample:
        print("  ❌ ERROR: Field 'ingredients_canonical' not found in documents!")
        sys.exit(1)

    sample_val = sample["ingredients_canonical"]
    if not isinstance(sample_val, list):
        print(f"  ❌ ERROR: 'ingredients_canonical' is not a list (got {type(sample_val)})")
        sys.exit(1)

    print(f"  ✅ Data structure valid. Example: {sample_val[:3]}")
    return col


# ─────────────────────────────────────────────────────────────────────────────
#  PHASE 2 — Extract Ingredients (Duplicates Preserved!)
# ─────────────────────────────────────────────────────────────────────────────
def extract_ingredients(col):
    print("\n[PHASE 2] Extracting ingredients_canonical from all documents...")
    all_ingredients = []   # ← NO deduplication — frequency must be preserved

    cursor = col.find({}, {"ingredients_canonical": 1, "_id": 0})
    for doc in cursor:
        items = doc.get("ingredients_canonical", [])
        if isinstance(items, list):
            all_ingredients.extend(items)

    print(f"  ✅ Extracted {len(all_ingredients):,} ingredient entries (with duplicates)")
    return all_ingredients


# ─────────────────────────────────────────────────────────────────────────────
#  PHASE 3 — Preprocessing: Normalize + Tokenize
# ─────────────────────────────────────────────────────────────────────────────
def normalize(text: str) -> str:
    """Lowercase + remove special characters."""
    text = text.lower()
    text = re.sub(r'[^a-z\s]', ' ', text)   # Phase 3.1
    return text.strip()

def tokenize(text: str) -> list:
    """Split into words."""
    return text.split()                       # Phase 3.2

def preprocess(all_ingredients: list) -> list:
    print("\n[PHASE 3] Preprocessing: normalizing and tokenizing...")
    token_lists = []
    for ingredient in all_ingredients:
        normalized = normalize(ingredient)
        words = tokenize(normalized)
        if len(words) >= 2:                   # Phase 3.3 — keep only multi-word entries
            token_lists.append(words)

    print(f"  ✅ {len(token_lists):,} multi-word entries kept out of {len(all_ingredients):,}")
    return token_lists


# ─────────────────────────────────────────────────────────────────────────────
#  PHASE 4 — N-gram Generation (Bigrams + Trigrams)
# ─────────────────────────────────────────────────────────────────────────────
def generate_ngrams(token_lists: list):
    print("\n[PHASE 4] Generating bigrams and trigrams...")
    bigram_counts  = Counter()
    trigram_counts = Counter()

    for words in token_lists:
        # Bigrams — Phase 4.1
        for i in range(len(words) - 1):
            bigram = words[i] + " " + words[i + 1]
            bigram_counts[bigram] += 1   # Phase 4.2

        # Trigrams — Phase 10.1
        for i in range(len(words) - 2):
            trigram = words[i] + " " + words[i + 1] + " " + words[i + 2]
            trigram_counts[trigram] += 1  # Phase 10.2

    print(f"  ✅ {len(bigram_counts):,} unique bigrams   | "
          f"{len(trigram_counts):,} unique trigrams generated")
    return bigram_counts, trigram_counts


# ─────────────────────────────────────────────────────────────────────────────
#  PHASE 5 — Frequency Analysis: Sort & Report
# ─────────────────────────────────────────────────────────────────────────────
def analyze_frequencies(bigram_counts, trigram_counts):
    print("\n[PHASE 5] Analyzing frequencies...")

    # Sort ascending (Phase 5.1)
    sorted_bigrams  = sorted(bigram_counts.items(),  key=lambda x: x[1])
    sorted_trigrams = sorted(trigram_counts.items(), key=lambda x: x[1])

    # Write full report to file (Phase 5.2)
    with open(FREQ_REPORT, 'w', encoding='utf-8') as f:
        f.write("=" * 60 + "\n")
        f.write("  BIGRAM FREQUENCY REPORT\n")
        f.write("=" * 60 + "\n")
        for phrase, count in sorted_bigrams:
            f.write(f"  {phrase:<40} → {count}\n")

        f.write("\n" + "=" * 60 + "\n")
        f.write("  TRIGRAM FREQUENCY REPORT\n")
        f.write("=" * 60 + "\n")
        for phrase, count in sorted_trigrams:
            f.write(f"  {phrase:<40} → {count}\n")

    print(f"  ✅ Full frequency report saved → ngram_frequency_report.txt")

    # Show top 20 most frequent bigrams on screen
    print("\n  📊 Top 20 most frequent BIGRAMS:")
    for phrase, count in sorted(bigram_counts.items(), key=lambda x: x[1], reverse=True)[:20]:
        print(f"     {phrase:<35} → {count:,}")

    print("\n  📊 Top 10 most frequent TRIGRAMS:")
    for phrase, count in sorted(trigram_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"     {phrase:<45} → {count:,}")

    return sorted_bigrams, sorted_trigrams


# ─────────────────────────────────────────────────────────────────────────────
#  PHASE 7 — Filter Valid Phrases
# ─────────────────────────────────────────────────────────────────────────────
def filter_phrases(bigram_counts, trigram_counts):
    print(f"\n[PHASE 7] Filtering phrases with frequency ≥ {MIN_FREQ}...")

    valid_bigrams = {
        phrase for phrase, count in bigram_counts.items()
        if count >= MIN_FREQ and is_valid_phrase(phrase)
    }
    valid_trigrams = {
        phrase for phrase, count in trigram_counts.items()
        if count >= MIN_FREQ and is_valid_phrase(phrase)
    }

    # Merge bigrams + trigrams (Phase 10.2)
    multi_word_ingredients = valid_bigrams | valid_trigrams

    print(f"  ✅ {len(valid_bigrams):,} valid bigrams")
    print(f"  ✅ {len(valid_trigrams):,} valid trigrams")
    print(f"  ✅ {len(multi_word_ingredients):,} total multi-word ingredients after merge")

    # Print sample
    sample = sorted(list(multi_word_ingredients))[:15]
    print(f"\n  Sample output: {sample}")

    return multi_word_ingredients


# ─────────────────────────────────────────────────────────────────────────────
#  PHASE 8 — Save Output
# ─────────────────────────────────────────────────────────────────────────────
def save_dictionary(multi_word_ingredients: set):
    print(f"\n[PHASE 8] Saving dictionary to multi_word_ingredients.json...")

    sorted_list = sorted(list(multi_word_ingredients))

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(sorted_list, f, indent=2, ensure_ascii=False)

    print(f"  ✅ Saved {len(sorted_list):,} entries → {OUTPUT_FILE}")


# ─────────────────────────────────────────────────────────────────────────────
#  MAIN PIPELINE
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  🍳 Multi-Word Ingredient Dictionary Builder")
    print("=" * 60)

    col = validate_connection()
    all_ingredients = extract_ingredients(col)
    token_lists = preprocess(all_ingredients)
    bigram_counts, trigram_counts = generate_ngrams(token_lists)
    sorted_bigrams, sorted_trigrams = analyze_frequencies(bigram_counts, trigram_counts)
    multi_word_ingredients = filter_phrases(bigram_counts, trigram_counts)
    save_dictionary(multi_word_ingredients)

    print("\n" + "=" * 60)
    print("  ✅ DONE! Dictionary is ready for integration.")
    print("  📄 Files created:")
    print("     → multi_word_ingredients.json")
    print("     → ngram_frequency_report.txt")
    print("=" * 60)
