import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from database import get_client, DB_NAME
from bson import ObjectId
from typing import List

class PersonalizationEngine:
    def __init__(self):
        print("Initializing Personalization Engine...")
        self.client = get_client()
        self.user_db = self.client[DB_NAME]
        self.recipe_db = self.client[DB_NAME]
        self.users_col = self.user_db['users']
        self.recipes_col = self.recipe_db['recipes']

    def log_interaction(self, user_id: str, recipe_id: str, interaction_type: str = "view"):
        try:
            recipe_obj_id = ObjectId(recipe_id)
        except Exception:
            return False

        # Fetch candidate preference signals.
        # Your recipe docs may not have a `tags` field; instead they store signals in:
        # - dietary_profile
        # - tastes
        # - health_flags
        projection = {"tags": 1, "dietary_profile": 1, "tastes": 1, "health_flags": 1}
        recipe = self.recipes_col.find_one({"_id": recipe_obj_id}, projection)
        if not recipe:
            return False

        tag_candidates = []
        if recipe.get("tags"):
            tag_candidates.extend(recipe.get("tags") or [])
        # These fields are present in your DB schema (see ai_recipe_finder.recipes)
        for field in ("dietary_profile", "tastes", "health_flags"):
            val = recipe.get(field)
            if isinstance(val, list) and val:
                tag_candidates.extend(val)

        # For "view"/"favorite" we only increment preferences if we have candidates.
        # For "unfavorite" we still want to remove from favorites even if no tags exist.
        if interaction_type in ("view", "favorite") and not tag_candidates:
            return False

        inc_data = {}
        if interaction_type in ("view", "favorite") and tag_candidates:
            for tag in tag_candidates:
                safe_tag = str(tag).replace(".", "_").replace(" ", "_").replace("-", "_")
                inc_data[f"preferences.{safe_tag}"] = 1

        update_doc = {}
        if inc_data:
            update_doc["$inc"] = inc_data
        if interaction_type == "favorite":
            update_doc["$addToSet"] = {"favorites": recipe_id}
        elif interaction_type == "unfavorite":
            update_doc["$pull"] = {"favorites": recipe_id}

        try:
            user_obj_id = ObjectId(user_id)
        except Exception:
            return False

        if not update_doc:
            return False

        self.users_col.update_one({"_id": user_obj_id}, update_doc, upsert=False)
        return True

    def get_user_profile(self, user_id: str) -> dict:
        try:
            user_obj_id = ObjectId(user_id)
        except Exception:
            return {"favorites": [], "top_preferences": [], "total_interactions": 0}

        user = self.users_col.find_one({"_id": user_obj_id})
        if not user:
            return {"favorites": [], "top_preferences": [], "total_interactions": 0}

        prefs = user.get("preferences", {})
        sorted_prefs = sorted(prefs.items(), key=lambda item: item[1], reverse=True)
        top_5_tags = [tag for tag, score in sorted_prefs[:5]]
        favorites = user.get("favorites", [])
        return {"favorites": favorites, "top_preferences": top_5_tags, "total_interactions": len(favorites)}

engine = None
def get_personalization_engine():
    global engine
    if engine is None:
        engine = PersonalizationEngine()
    return engine