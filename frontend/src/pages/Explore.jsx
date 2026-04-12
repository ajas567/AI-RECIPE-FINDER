import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Heart, Clock, Utensils, Star, Search, ArrowRight, TrendingUp, Loader2, X, ChefHat, PlayCircle, Sparkles } from 'lucide-react';
import './Results.css';
import CookModal from './CookModal';
import { useAuth } from '../context/AuthContext';

const Explore = () => {
  const [categories, setCategories] = useState({});
  const [topRecipes, setTopRecipes] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [cookRecipe, setCookRecipe] = useState(null);
  const debounceTimer = useRef(null);

  // Fetch default explore categories + top 10 on mount
  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Fetch categorized recipes
        const [catRes, topRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_BASE_URL}/explore`),
          fetch(`${import.meta.env.VITE_API_BASE_URL}/explore/top`)
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData);
        }

        if (topRes.ok) {
          const topData = await topRes.json();
          setTopRecipes(topData.results || []);
        }
      } catch (error) {
        console.error('Failed to fetch explore recipes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Debounced search handler
  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchQuery(val);

    clearTimeout(debounceTimer.current);

    if (!val.trim()) {
      setSearchMode(false);
      setSearchResults([]);
      return;
    }

    setSearchMode(true);
    setSearching(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/search/recipes?q=${encodeURIComponent(val.trim())}&limit=20`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchMode(false);
    setSearchResults([]);
    setSearching(false);
    clearTimeout(debounceTimer.current);
  };

  // Determine what sections to render in default view
  const hasCategories = Object.values(categories).some((arr) => arr.length > 0);

  return (
    <div className="results-container animate-fade-in-up">
      {/* Header */}
      <div className="results-header mb-8">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl mb-2 flex items-center gap-3">
              <TrendingUp className="text-primary" size={36} /> Explore Recipes
            </h1>
            <p className="text-secondary text-lg">
              {searchMode
                ? `Showing results for "${searchQuery}"`
                : 'Discover top-rated recipes directly from our database.'}
            </p>
          </div>
          <Link to="/finder" className="btn btn-primary pulse-shadow hover:scale-105 transition-all">
            Find by Ingredients <ArrowRight size={20} />
          </Link>
        </div>

        {/* Search Bar */}
        <div className="input-group search-group w-full max-w-xl mt-4 md:mt-0">
          <div className="input-wrapper group hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-shadow rounded-xl">
            {searching ? (
              <Loader2 className="input-icon text-primary animate-spin" size={20} />
            ) : (
              <Search className="input-icon group-focus-within:text-primary transition-colors" size={20} />
            )}
            <input
              type="text"
              placeholder="Search recipes by name..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="input-field icon-padding bg-black/20 focus:bg-black/40 border-white/10 hover:border-primary/50 text-white w-full pr-10 outline-none focus:ring-0"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-danger hover:bg-red-500/10 p-1.5 rounded-full transition-colors flex items-center justify-center z-10"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="spinner text-primary" size={48} />
        </div>
      ) : searchMode ? (
        /* ── SEARCH RESULTS ── */
        <div>
          {searching ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="spinner text-primary" size={40} />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
              <ChefHat size={56} className="text-muted mb-4 opacity-40" />
              <h3 className="text-xl font-bold text-secondary mb-2">No recipes found</h3>
              <p className="text-muted">
                Try a different name — e.g. <em>"pasta"</em>, <em>"chicken"</em>, or <em>"cake"</em>
              </p>
            </div>
          ) : (
            <div>
              <p className="text-secondary mb-4 text-sm">
                Found <span className="text-primary font-bold">{searchResults.length}</span> recipe(s)
              </p>
              <div className="recipes-grid">
                {searchResults.map((recipe, idx) => (
                  <RecipeCard key={recipe._id || recipe.id} recipe={recipe} delay={(idx + 1) * 50} onCook={() => setCookRecipe(recipe)} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── DEFAULT VIEW ── */
        <div>
          {/* Top 10 Recipes (always shown) */}
          {topRecipes.length > 0 && (
            <div className="mb-10">
              <h2 className="text-2xl mb-4 text-white font-bold flex items-center gap-2">
                <Star size={22} className="text-warning" fill="currentColor" /> Top 10 Recipes
              </h2>
              <div className="recipes-grid">
                {topRecipes.map((recipe, idx) => (
                  <RecipeCard key={recipe._id || recipe.id} recipe={recipe} delay={(idx + 1) * 80} onCook={() => setCookRecipe(recipe)} />
                ))}
              </div>
            </div>
          )}

          {/* Category Sections (if available from /explore) */}
          {hasCategories &&
            Object.keys(categories).map((categoryName) =>
              categories[categoryName].length > 0 && (
                <div key={categoryName} className="mb-8 mt-10">
                  <h2 className="text-2xl mb-4 text-white font-bold">{categoryName}</h2>
                  <div className="recipes-grid">
                    {categories[categoryName].map((recipe, idx) => (
                      <RecipeCard key={recipe._id || recipe.id} recipe={recipe} delay={(idx + 1) * 100} onCook={() => setCookRecipe(recipe)} />
                    ))}
                  </div>
                </div>
              )
            )}

          {/* Fallback: no data at all */}
          {topRecipes.length === 0 && !hasCategories && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ChefHat size={56} className="text-muted mb-4 opacity-30" />
              <h3 className="text-xl font-bold text-secondary mb-2">No recipes found in the database</h3>
              <p className="text-muted">Make sure MongoDB is running and the recipes collection is populated.</p>
            </div>
          )}
        </div>
      )}

      {/* Cook Modal — rendered via portal to ensure perfect centering on the page */}
      {cookRecipe && createPortal(
        <CookModal recipe={cookRecipe} onClose={() => setCookRecipe(null)} />,
        document.body
      )}
    </div>
  );
};

// Reusable Detailed Recipe Card (Matched to Results.jsx)
const RecipeCard = ({ recipe, delay, onCook }) => {
  const [saved, setSaved] = useState(false);
  const [showVideoOptions, setShowVideoOptions] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // If we had a global list of user favorites, we could initialize this here
  }, []);

  // Standardize Data (matching Results.jsx)
  const nameStr = recipe.name || recipe.title || "Delicious Meal";
  const safeImageUrl = recipe.image && recipe.image.includes('http') && !recipe.image.includes('loremflickr') 
    ? recipe.image 
    : `${import.meta.env.VITE_API_BASE_URL}/api/image?q=${encodeURIComponent(nameStr)}`;
  
  const totalTime = recipe.time || ((recipe.est_prep_time_min || 0) + (recipe.est_cook_time_min || 0)) || "30";
  const diffStr = recipe.difficulty || (recipe.num_ingredients ? `${recipe.num_ingredients} items` : 'Medium');
  const isStringDiff = typeof diffStr === 'string' && diffStr.includes('items') === false;
  const displayDiff = isStringDiff ? diffStr.charAt(0).toUpperCase() + diffStr.slice(1) : diffStr;
  const healthScore = recipe.healthiness_score || recipe.calories || 50;
  const tags = (recipe.health_flags || recipe.tastes || recipe.tags || []).slice(0, 4);

  return (
    <div className={`recipe-card glass-panel animate-fade-in-up`} style={{ animationDelay: `${delay}ms` }}>
      <div className="recipe-image-wrapper">
        <img src={safeImageUrl} alt={nameStr} className="recipe-image" />
        <button
          className={`save-btn ${saved ? 'saved' : ''}`}
          onClick={async (e) => {
            e.stopPropagation();
            const next = !saved;
            setSaved(next);
            if (!user?.id || !recipe?.id) return;
            try {
              await fetch(`${import.meta.env.VITE_API_BASE_URL}/user/${user.id}/interact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  recipe_id: String(recipe.id),
                  interaction_type: next ? 'favorite' : 'unfavorite'
                })
              });
            } catch {
              // error ignored to keep UI snappy
            }
          }}
          title={saved ? "Saved to Favorites" : "Save Recipe"}
        >
          <Heart size={20} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="recipe-content relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold cursor-pointer hover:text-primary transition-colors pr-2 leading-tight min-h-[48px] line-clamp-2 text-xl capitalize">
            {nameStr}
          </h3>
          <div className="rating flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-warning/20 text-warning shrink-0">
            <Star size={14} fill="currentColor" />
            <span className="text-sm font-bold text-white shadow-sm">{recipe.rating || 4.5}</span>
          </div>
        </div>

        <div className="recipe-meta flex items-center justify-between text-sm text-secondary mb-4 pb-4 border-b border-white/10">
          <span className="flex items-center gap-1">
            <Clock size={16} className="text-primary" /> {typeof totalTime === 'number' ? `${totalTime} mins` : totalTime}
          </span>
          <span className="flex items-center gap-1">
            <Utensils size={16} className="text-primary" /> {displayDiff}
          </span>
          <span className="flex items-center gap-1 select-none" title="Healthiness Score">
            <Heart size={16} className={healthScore > 75 ? 'text-success' : 'text-primary'} />
            {healthScore}/100 Health
          </span>
        </div>

        <div className="recipe-tags flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <span
              key={tag}
              className="chip text-xs py-1 px-3 bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white transition-colors cursor-pointer capitalize"
            >
              {(typeof tag === 'string' ? tag : '').replace(/_/g, ' ').replace(/-/g, ' ')}
            </span>
          ))}
        </div>

        <div className="recipe-actions flex flex-col gap-3 w-full mt-auto relative z-[999]">
          <div className="flex gap-3">
            <button
              className="btn btn-primary flex-1 py-3 hover:scale-105 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.3)] relative z-[999]"
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                if (onCook) onCook(recipe);
              }}
            >
              Cook This
            </button>
          </div>
          
          <div className="mt-8 border-t border-white/10 pt-5" style={{ position: 'relative', zIndex: 20 }}>
            {!showVideoOptions ? (
              <button 
                className="w-full py-2.5 flex items-center justify-center gap-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ pointerEvents: 'all', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform='translateY(-2px) scale(1.02)'; e.currentTarget.style.background='rgba(16,185,129,0.08)'; e.currentTarget.style.borderColor='rgba(16,185,129,0.3)'; e.currentTarget.style.color='#10b981'; e.currentTarget.style.boxShadow='0 4px 15px -3px rgba(16,185,129,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform='translateY(0) scale(1)'; e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; e.currentTarget.style.color='#94a3b8'; e.currentTarget.style.boxShadow='none'; }}
                onClick={(e) => { e.stopPropagation(); setShowVideoOptions(true); }}
              >
                <PlayCircle size={16} /> Need Video Tutorial?
              </button>
            ) : (
              <div className="flex flex-col gap-2 animate-fade-in-up">
                <div className="flex flex-col gap-2 justify-center mt-1">
                  <a 
                    href={`https://www.youtube.com/results?search_query=how+to+cook+${encodeURIComponent(nameStr)}+recipe`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer font-medium relative z-[999]"
                    style={{ pointerEvents: 'auto', color: '#f87171', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <PlayCircle size={16} /> Watch on YouTube
                  </a>
                  <a 
                    href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(nameStr)}+recipe+plated+photography`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer font-medium relative z-[999]"
                    style={{ pointerEvents: 'auto', color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Sparkles size={16} /> Verify Food Image
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explore;
