from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from modules.similarity import get_engine
from modules.processing import process_ingredients
from modules.recommendation import get_recommendation_engine
from modules.personalization import get_personalization_engine
from modules.video import get_youtube_search_link
from modules.auth import get_auth_engine
from database import get_client, DB_NAME

from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException

app = FastAPI(title="INGREDIENT BASED AI RECIPE FINDER API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # React Vite local dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IngredientRequest(BaseModel):
    raw_ingredients: List[str]

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ProcessedIngredient(BaseModel):
    raw: str
    cleaned: str
    match: Optional[str] = None
    category: Optional[str] = None
    confidence: float
    error: Optional[str] = None
    cached: bool = False

class MatchResponse(BaseModel):
    results: List[ProcessedIngredient]
    rejected_count: int

class RecommendRequest(BaseModel):
    valid_ingredients: List[str]
    user_id: Optional[str] = None
    cuisines: Optional[List[str]] = None
    tastes: Optional[List[str]] = None
    dietary_needs: Optional[List[str]] = None
    limit: int = 10
    min_match_percentage: float = 0.5
    max_time: Optional[int] = None

class GenerateRecipesRequest(BaseModel):
    raw_ingredients: List[str]
    user_id: Optional[str] = None
    cuisines: Optional[List[str]] = None
    tastes: Optional[List[str]] = None
    dietary_needs: Optional[List[str]] = None
    limit: int = 12
    min_match_percentage: float = 0.5
    max_time: Optional[int] = None

class RecipesByIdsRequest(BaseModel):
    recipe_ids: List[str]

class InteractRequest(BaseModel):
    recipe_id: str
    interaction_type: str = "view" # "view" | "favorite" | "unfavorite"

@app.on_event("startup")
def startup_event():
    # Pre-load the Vector Engine and Recommendation Engine into RAM when the server boots
    get_engine()
    get_recommendation_engine()
    get_personalization_engine()
    get_auth_engine()
    
    # Warm up the NLP processor 
    # NLTK lazily loads huge tagger datasets on its FIRST execution causing a 6-second API freeze.
    # Running a dummy string fixes this by loading it into RAM before users connect.
    from modules.processing import clean_ingredient_text
    clean_ingredient_text("warmup sequence")

@app.post("/signup")
async def create_user(req: SignupRequest):
    auth = get_auth_engine()
    result = auth.register_user(req.name, req.email, req.password)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result

@app.post("/login")
async def login(req: LoginRequest):
    auth = get_auth_engine()
    user = auth.login_user(req.email, req.password)
    
    if "error" in user:
         raise HTTPException(status_code=401, detail=user["error"])
         
    return user

@app.get("/")
def read_root():
    return {"message": "Welcome to the Recipe Finder API"}

@app.post("/match_ingredients", response_model=MatchResponse)
def api_match_ingredients(request: IngredientRequest):
    engine = get_engine()
    results = []
    rejected = 0
    
    for raw_item in request.raw_ingredients:
        cleaned_item = process_ingredients([raw_item])
        
        if not cleaned_item:
            rejected += 1
            results.append(ProcessedIngredient(
                raw=raw_item, cleaned="", confidence=0.0, error="Invalid empty input after cleaning."
            ))
            continue
            
        cleaned_str = cleaned_item[0]
        match_data = engine.find_match(cleaned_str)
        
        if match_data.get("error"):
            rejected += 1
            
        results.append(ProcessedIngredient(
            raw=raw_item,
            cleaned=cleaned_str,
            match=match_data.get("match"),
            category=match_data.get("category"),
            confidence=match_data.get("confidence"),
            error=match_data.get("error"),
            cached=match_data.get("cached", False)
        ))

    return MatchResponse(results=results, rejected_count=rejected)

@app.post("/recommend_recipes")
def api_recommend_recipes(request: RecommendRequest):
    """
    Takes a clean list of final ingredients and finds the best recipe matches.
    Allows for filtering by meal type and dietary needs.
    """
    rec_engine = get_recommendation_engine()
    
    user_preferences = None
    if request.user_id:
        pers_engine = get_personalization_engine()
        profile = pers_engine.get_user_profile(request.user_id)
        user_preferences = profile.get("top_preferences", [])
    
    recipes = rec_engine.find_recipes(
        user_ingredients=request.valid_ingredients,
        cuisines=request.cuisines,
        tastes=request.tastes,
        dietary_needs=request.dietary_needs,
        user_preferences=user_preferences,
        limit=request.limit,
        min_match_percentage=request.min_match_percentage,
        max_time=request.max_time
    )
    
    return {"results": recipes, "count": len(recipes)}

@app.post("/generate_recipes")
def api_generate_recipes(request: GenerateRecipesRequest):
    """
    Unified Pipeline Endpoint (Controller Pattern).
    1. Takes raw ingredients
    2. Runs Text Processing
    3. Runs Semantic Similarity Matching
    4. Runs Database Recipe Recommendation
    5. Returns unified results
    """
    # Step 1 & 2: Process and Match Ingredients
    engine = get_engine()
    valid_ingredients = []
    
    for raw_item in request.raw_ingredients:
        # Pass to the processing module
        cleaned_item = process_ingredients([raw_item])
        
        if cleaned_item:
            cleaned_str = cleaned_item[0]
            # Pass to the similarity module
            match_data = engine.find_match(cleaned_str)
            if match_data.get("match"):
                valid_ingredients.append(match_data.get("match"))
                
    # Step 3: Recommend Recipes
    rec_engine = get_recommendation_engine()
    
    user_preferences = None
    if request.user_id:
        pers_engine = get_personalization_engine()
        profile = pers_engine.get_user_profile(request.user_id)
        user_preferences = profile.get("top_preferences", [])
        
    recipes = rec_engine.find_recipes(
        user_ingredients=valid_ingredients,
        cuisines=request.cuisines,
        tastes=request.tastes,
        dietary_needs=request.dietary_needs,
        user_preferences=user_preferences,
        limit=request.limit,
        min_match_percentage=request.min_match_percentage,
        max_time=request.max_time
    )
    
    return {
        "valid_ingredients": valid_ingredients,
        "results": recipes,
        "count": len(recipes)
    }

@app.post("/user/{user_id}/interact")
def api_user_interact(user_id: str, request: InteractRequest):
    engine = get_personalization_engine()
    success = engine.log_interaction(user_id, request.recipe_id, request.interaction_type)
    return {"success": success}

@app.get("/user/{user_id}/profile")
def api_user_profile(user_id: str):
    engine = get_personalization_engine()
    return engine.get_user_profile(user_id)

@app.post("/recipes/batch")
def api_recipes_batch(request: RecipesByIdsRequest):
    rec_engine = get_recommendation_engine()
    recipes = rec_engine.get_recipes_by_ids(request.recipe_ids)
    return {"results": recipes}

@app.get("/recipe/{recipe_name}/video")
def api_recipe_video(recipe_name: str):
    link = get_youtube_search_link(recipe_name)
    return {"video_link": link}

@app.get("/explore")
def api_explore_recipes():
    """
    Returns pre-categorized recipes natively directly from MongoDB 
    to populate the frontend Explore page without requiring user context.
    """
    rec_engine = get_recommendation_engine()
    explore_data = rec_engine.get_explore_recipes(limit_per_category=6)
    return explore_data

@app.get("/explore/top")
def api_explore_top_recipes():
    """
    Returns a flat list of 10 recipes for the Explore page.
    Tries top-rated first, falls back to any 10 if needed.
    """
    rec_engine = get_recommendation_engine()
    results = rec_engine.get_top_recipes(limit=10)
    return {"results": results}

@app.get("/search/recipes")
def api_search_recipes(q: str = "", limit: int = 20):
    """
    Full-text search on recipe title/name from MongoDB.
    Returns matching recipes for the Explore search bar.
    """
    if not q or not q.strip():
        return {"results": [], "count": 0}
    rec_engine = get_recommendation_engine()
    results = rec_engine.search_recipes_by_name(q.strip(), limit=limit)
    return {"results": results, "count": len(results)}

from fastapi.responses import RedirectResponse
import threading
import requests as http_requests
import os
image_cache = {}
cache_lock = threading.Lock()

SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")

FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
    "https://images.unsplash.com/photo-1499028344343-cd173ffc68a9?w=600&q=80",
    "https://images.unsplash.com/photo-1484723091791-0f379ea2b55b?w=600&q=80",
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80",
    "https://images.unsplash.com/photo-1504630083234-14187a9df0f5?w=600&q=80",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
]

@app.get("/api/image")
def api_fetch_real_image(q: str):
    """
    Spoonacular Image Fetcher:
    Searches Spoonacular's 365,000+ recipe database by title and returns
    the exact real photograph of that dish.
    """
    with cache_lock:
        if q in image_cache:
            return RedirectResponse(url=image_cache[q])

    hash_val = sum(ord(c) for c in q)
    fallback = FALLBACK_IMAGES[hash_val % len(FALLBACK_IMAGES)]
    real_image_url = None

    try:
        resp = http_requests.get(
            "https://api.spoonacular.com/recipes/complexSearch",
            params={
                "query": q,
                "number": 1,
                "addRecipeInformation": False,
                "apiKey": SPOONACULAR_API_KEY
            },
            timeout=5
        )
        data = resp.json()
        results = data.get("results", [])
        if results and results[0].get("image"):
            real_image_url = results[0]["image"]
    except Exception as e:
        print(f"Spoonacular lookup failed for '{q}': {e}")

    final_url = real_image_url if real_image_url else fallback

    with cache_lock:
        image_cache[q] = final_url

    return RedirectResponse(url=final_url)

@app.get("/api/recipe-detail")
def api_recipe_detail(name: str):
    """
    Fetches cooking instructions for a recipe name.
    Primary source: MongoDB `recipes.directions`
    DB-only: no external fallback
    """
    try:
        # 0) Query MongoDB first for stored directions
        import re

        mongo = get_client()
        recipes_col = mongo[DB_NAME]['recipes']

        escaped_name = re.escape((name or "").strip())
        title_query = {"$regex": f"^{escaped_name}$", "$options": "i"}

        doc = recipes_col.find_one(
            {"$or": [
                {"recipe_title": title_query},
                {"name": title_query},
                {"title": title_query}
            ]},
            {"directions": 1, "summary": 1, "description": 1}
        )

        if doc and doc.get("directions") is not None:
            directions = doc.get("directions")
            if isinstance(directions, list):
                steps = [str(s).strip() for s in directions if str(s).strip()]
            elif isinstance(directions, str):
                raw = directions.replace("\r\n", "\n").strip()
                steps = [s.strip(" \t-•") for s in re.split(r"\n+|(?<=[.!?])\s+", raw) if s.strip(" \t-•")]
            else:
                val = str(directions).strip()
                steps = [val] if val else []

            summary = str(doc.get("summary") or doc.get("description") or "").strip()
            return {
                "steps": steps,
                "summary": summary,
                "found": bool(steps),
                "source": "db"
            }
        # Not found in DB
        return {"steps": [], "summary": "", "found": False, "source": "db"}

    except Exception as e:
        print(f"DB recipe detail fetch failed for '{name}': {e}")
        return {"steps": [], "summary": "", "found": False, "source": "db"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
