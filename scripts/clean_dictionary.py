"""
clean_dictionary.py
====================
One-time offline script to purge noisy phrases from multi_word_ingredients.json.

Applies the same two-layer filter used at runtime:
  Layer 1 — Explicit culinary descriptor blocklist (fast)
  Layer 2 — POS tagger check (accurate)

After this runs, multi_word_ingredients.json contains ONLY clean noun-based
ingredient phrases. Runtime processing.py no longer needs to POS-check each
phrase on every query — making it significantly faster.

Run once from project root:
  python scripts/clean_dictionary.py
"""

import sys, os, json
from nltk import pos_tag

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

DICT_PATH = os.path.join(os.path.dirname(__file__), '..', 'multi_word_ingredients.json')

# ─── Same blocklist as processing.py ─────────────────────────────────────────
CULINARY_DESCRIPTORS = {
    'chopped', 'diced', 'minced', 'sliced', 'peeled', 'grated', 'shredded',
    'crushed', 'mashed', 'pureed', 'melted', 'softened', 'cooked', 'beaten',
    'roasted', 'baked', 'fried', 'smoked', 'dried', 'frozen', 'canned',
    'toasted', 'ground', 'squeezed', 'halved', 'quartered', 'julienned',
    'blanched', 'steamed', 'sauteed', 'grilled', 'boiled', 'poached',
    'organic', 'fresh', 'raw', 'whole', 'boneless', 'skinless',
    'freshly', 'finely', 'roughly', 'thinly', 'lightly', 'well',
}

def is_clean_phrase(phrase: str) -> bool:
    """
    Returns True only if phrase is a valid noun-based ingredient.
    Layer 1: fast blocklist check
    Layer 2: POS tagger check
    """
    words = phrase.split()

    # Layer 1 — blocklist (fast, no model needed)
    if any(w in CULINARY_DESCRIPTORS for w in words):
        return False

    # Layer 2 — POS tagger (accurate)
    tagged = pos_tag(words)
    for _, tag in tagged:
        if tag.startswith(('J', 'R', 'V')):
            return False

    return True


def clean():
    # Load
    print(f"\n[1] Loading dictionary from: {DICT_PATH}")
    with open(DICT_PATH, 'r', encoding='utf-8') as f:
        phrases = json.load(f)
    total_before = len(phrases)
    print(f"  ✅ Loaded {total_before:,} phrases")

    # Filter
    print(f"\n[2] Applying two-layer filter...")
    print(f"  (This may take 1-2 minutes for {total_before:,} POS checks...)")

    clean_phrases = []
    rejected = []

    for i, phrase in enumerate(phrases):
        if is_clean_phrase(phrase):
            clean_phrases.append(phrase)
        else:
            rejected.append(phrase)

        # Progress every 2000
        if (i + 1) % 2000 == 0:
            print(f"  Processed {i+1:,} / {total_before:,} ...")

    total_after  = len(clean_phrases)
    total_removed = total_before - total_after

    # Show sample of what was removed
    print(f"\n[3] Filter complete!")
    print(f"  Before  : {total_before:,} phrases")
    print(f"  After   : {total_after:,} phrases")
    print(f"  Removed : {total_removed:,} noisy phrases ({total_removed/total_before*100:.1f}%)")

    print(f"\n  Sample of REMOVED phrases (noise):")
    for p in rejected[:20]:
        print(f"    ❌  {p}")

    print(f"\n  Sample of KEPT phrases (clean):")
    for p in sorted(clean_phrases)[:20]:
        print(f"    ✅  {p}")

    # Save back
    print(f"\n[4] Saving cleaned dictionary...")
    with open(DICT_PATH, 'w', encoding='utf-8') as f:
        json.dump(sorted(clean_phrases), f, indent=2, ensure_ascii=False)

    print(f"  ✅ Saved → {DICT_PATH}")
    print(f"\n{'='*55}")
    print(f"  ✅ Dictionary cleaned successfully!")
    print(f"  Runtime processing.py will now be MUCH faster.")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    clean()
