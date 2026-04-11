from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# ─────────────────────────────────────────────
#  Central Database Configuration
#  Change MONGO_URI here once → affects all modules
# ─────────────────────────────────────────────

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")

DB_NAME = "ai_recipe_finder"   # Single database — contains all collections

# ─────────────────────────────────────────────
#  Singleton MongoClient — shared across modules
# ─────────────────────────────────────────────
_client = None

def get_client() -> MongoClient:
    """Returns a shared MongoClient instance (singleton)."""
    global _client
    if _client is None:
        if "mongodb+srv" in MONGO_URI:
            print("🚀 DATABASE: Connecting to secure MongoDB Atlas (Cloud)...")
        else:
            print("🖥️ DATABASE: Connecting to Local MongoDB...")
        _client = MongoClient(MONGO_URI)
    return _client

def get_db(db_name: str = DB_NAME):
    """Returns a database handle by name."""
    return get_client()[db_name]
