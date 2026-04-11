from modules.processing import process_ingredients
from modules.similarity import get_engine
import numpy as np
import math

engine = get_engine()

raw_list = ["i have 3 eggs", "and half onion and the tomotos pieces"]
results = []
for raw in raw_list:
    cleaned = process_ingredients([raw])
    if cleaned:
        c_str = cleaned[0]
        match = engine.find_match(c_str)
        print(f"Raw: {raw} -> Cleaned: {c_str} -> Confidence: {match.get('confidence')}")
        if math.isnan(match.get('confidence', 0)):
            print("FOUND NAN IN SIMILARITY!")

from modules.recommendation import get_recommendation_engine
rec_engine = get_recommendation_engine()
recs = rec_engine.find_recipes(['egg', 'onion', 'tomato'], limit=2)
for r in recs:
    print(r['name'], r.get('match_percentage'))
    if math.isnan(r.get('match_percentage', 0)):
        print("FOUND NAN IN REC RECOMMENDATION!")
