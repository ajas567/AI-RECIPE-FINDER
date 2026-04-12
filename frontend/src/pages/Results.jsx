import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Heart, Clock, Utensils, Star, Info, Settings, ShoppingBag, ArrowLeft, PlayCircle, FileText, BrainCircuit, Sparkles } from 'lucide-react';
import './Results.css';
import CookModal from './CookModal';
import { useAuth } from '../context/AuthContext';

const MOCK_RECIPES = [
  {
    id: 1,
    title: 'Garlic Butter Herb Chicken',
    image: 'https://images.unsplash.com/photo-1598515314815-46aaeb2eef1c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    time: '25 min',
    difficulty: 'Easy',
    rating: 4.8,
    matchRate: 98,
    calories: 420,
    tags: ['High Protein', 'Gluten-Free']
  },
  {
    id: 2,
    title: 'Creamy Spinach Pasta',
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    time: '20 min',
    difficulty: 'Medium',
    rating: 4.5,
    matchRate: 85,
    calories: 550,
    tags: ['Vegetarian', 'Comfort Food']
  },
  {
    id: 3,
    title: 'Mediterranean Tomato Salad',
    image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    time: '10 min',
    difficulty: 'Easy',
    rating: 4.9,
    matchRate: 75,
    calories: 210,
    tags: ['Vegan', 'Low Carb']
  }
];

const OMELETTE_RECIPE = {
  id: 999,
  title: 'Classic Tomato & Onion Omelette',
  image: 'https://images.unsplash.com/photo-1510693061432-472528ced10b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  time: '10 min',
  difficulty: 'Easy',
  rating: 4.9,
  matchRate: 100,
  calories: 250,
  tags: ['High Protein', 'Breakfast', 'Quick']
};

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ingredients = [], dietary = [] } = location.state || {};
  const [saved, setSaved] = useState([]);
  const [videoState, setVideoState] = useState({});
  const [cookRecipe, setCookRecipe] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetch(`${import.meta.env.VITE_API_BASE_URL}/user/${user.id}/profile`)
        .then(res => res.json())
        .then(data => {
          if (data && data.favorites) {
             // Backend stores as strings mostly or objectids, ensure uniformity
             setSaved(data.favorites || []);
          }
        })
        .catch(err => console.error("Failed to fetch favorites", err));
    }
  }, [user]);

  const displayRecipes = location.state?.isDummyOmelette 
    ? [OMELETTE_RECIPE] 
    : (location.state?.aiResults || []);

  const toggleSave = async (id) => {
    const alreadySaved = saved.includes(id);
    setSaved(prev => alreadySaved ? prev.filter(s => s !== id) : [...prev, id]);

    if (!user?.id) return;

    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/user/${user.id}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_id: String(id),
          interaction_type: alreadySaved ? 'unfavorite' : 'favorite'
        })
      });
    } catch {
      // keep UI responsive; dashboard will reflect once backend is available
    }
  };

  const handleVideoClick = (id) => {
    setVideoState(prev => ({
      ...prev,
      [id]: { showVideoOptions: true, processingSummary: false }
    }));
  };

  const handleSummaryClick = (id) => {
    setVideoState(prev => ({
      ...prev,
      [id]: { ...prev[id], processingSummary: true }
    }));
    
    // Simulate AI summary generation
    setTimeout(() => {
      alert("AI Summary: 1. Preheat pan. 2. Season chicken. 3. Sear for 5 mins each side. 4. Baste with garlic butter.");
      setVideoState(prev => ({
        ...prev,
        [id]: { ...prev[id], processingSummary: false }
      }));
    }, 2000);
  };

  const handleFullVideoClick = (id) => {
    alert("Opening full YouTube tutorial link...");
  };

  return (
    <div className="results-container">
      <div className="results-header animate-fade-in-up">
        <button 
          onClick={() => navigate('/finder')} 
          className="btn btn-secondary inline-flex items-center gap-2 mb-6 hover:bg-white/10"
        >
          <ArrowLeft size={18} /> Modify Search
        </button>

        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl mb-2">Your Curated Menu</h1>
            <p className="text-secondary text-lg">
              We found the perfect recipes based on {ingredients.length} ingredients 
              {dietary.length > 0 ? ` and your ${dietary.join(', ')} diet` : ''}.
            </p>
          </div>
        </div>

        <div className="ai-summary glass-panel p-6 cursor-pointer hover:border-primary transition-all">
          <div className="flex items-center gap-3 mb-3">
            <Info size={22} className="text-primary" />
            <span className="insights-title">Chef's Insights</span>
          </div>
          <p className="insights-body">
             We discovered <strong style={{ color: 'var(--primary-color)' }}>{(location.state?.aiResults || []).length}</strong> highly-rated recipes that perfectly align with your pantry. 
            All results respect your selected dietary preferences and culinary filters.
          </p>
        </div>
      </div>

      <div className="recipes-grid mt-10">
        {(!displayRecipes || displayRecipes.length === 0) ? (
          <div className="col-span-full text-center py-10">
            <h3 className="text-2xl text-secondary mb-2">No perfect matches found.</h3>
            <p className="text-muted">Try modifying your search or lowering your cooking time limits.</p>
          </div>
        ) : displayRecipes.map((recipe, idx) => {
          
          // Backend Semantic Image Router - returns category-accurate food photos
          const nameStr = recipe.name || recipe.title || "Delicious Meal";
          const safeImageUrl = recipe.image && recipe.image.includes('http') && !recipe.image.includes('loremflickr') 
            ? recipe.image 
            : `${import.meta.env.VITE_API_BASE_URL}/api/image?q=${encodeURIComponent(nameStr)}`;
          
          const matchPercent = recipe.match_percentage !== undefined 
            ? Math.round(recipe.match_percentage * 100) 
            : recipe.matchRate || 0;
            
          const totalTime = recipe.time || ((recipe.est_prep_time_min || 0) + (recipe.est_cook_time_min || 0));
          const diffStr = recipe.difficulty || (recipe.num_ingredients ? `${recipe.num_ingredients} items` : 'Medium');
          const isStringDiff = typeof diffStr === 'string' && diffStr.includes('items') === false;
          const displayDiff = isStringDiff ? diffStr.charAt(0).toUpperCase() + diffStr.slice(1) : diffStr;
          const healthScore = recipe.healthiness_score || recipe.calories || 50;

          return (
            <div 
              key={recipe._id || recipe.id} 
              className={`recipe-card glass-panel animate-fade-in-up delay-${(idx % 4 + 1) * 100}`}
            >
              <div className="recipe-image-wrapper">
                <img src={safeImageUrl} alt={recipe.name || recipe.title} className="recipe-image" />
                <div className={`match-badge ${matchPercent >= 80 ? 'text-success' : 'text-warning'}`}>
                  <Sparkles size={14} className="inline mr-1" />
                  {matchPercent}% Match
                </div>
                <button 
                  className={`save-btn ${saved.includes(recipe._id || recipe.id) ? 'saved' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSave(recipe._id || recipe.id);
                  }}
                  title={saved.includes(recipe._id || recipe.id) ? "Saved to Favorites" : "Save Recipe"}
                >
                  <Heart size={20} fill={saved.includes(recipe._id || recipe.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
              
              <div className="recipe-content relative z-10 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold cursor-pointer hover:text-primary transition-colors capitalize text-xl">{recipe.name || recipe.title}</h3>
                </div>

                <div className="recipe-meta flex items-center justify-between text-sm text-secondary mb-4 pb-4 border-b border-white/10">
                  <span className="flex items-center gap-1"><Clock size={16} className="text-primary" /> {typeof totalTime === 'number' ? `${totalTime} mins` : totalTime}</span>
                  <span className="flex items-center gap-1"><Utensils size={16} className="text-primary" /> {displayDiff}</span>
                  <span className="flex items-center gap-1" title="Healthiness Score"><Heart size={16} className={healthScore > 75 ? 'text-success' : 'text-primary'} /> {healthScore}/100 Health</span>
                </div>

                <div className="recipe-tags flex flex-wrap gap-2 mb-4">
                  {(recipe.health_flags || recipe.tastes || recipe.tags || []).slice(0, 4).map(tag => (
                    <span key={tag} className="chip text-xs py-1 px-3 bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white transition-colors cursor-pointer capitalize">{tag.replace(/_/g, ' ').replace(/-/g, ' ')}</span>
                  ))}
                </div>

                {recipe.missing_ingredients?.length > 0 && (
                  <div className="missing-tags mb-6 pt-2 border-t border-white/5">
                      <span className="text-xs font-semibold text-secondary mb-2 block uppercase tracking-wider">You Need To Buy:</span>
                      <div className="flex flex-wrap gap-1">
                        {recipe.missing_ingredients.slice(0, 4).map(missing => (
                            <span key={missing} className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20">• {missing}</span>
                        ))}
                        {recipe.missing_ingredients.length > 4 && (
                            <span className="text-xs text-muted self-center ml-1">+{recipe.missing_ingredients.length - 4} more</span>
                        )}
                      </div>
                  </div>
                )}

                <div className="recipe-actions flex flex-col gap-3 w-full mt-auto relative z-[999]">
                  <div className="flex gap-3">
                    <button
                      className="btn btn-primary flex-1 py-3 hover:scale-105 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.3)] relative z-[999]"
                      style={{pointerEvents:'auto', cursor:'pointer'}}
                      onClick={(e) => {
                        // Avoid preventDefault() on pointer events; it can suppress React click delivery.
                        e.stopPropagation();
                        setCookRecipe(recipe);
                      }}
                    >
                      Cook This
                    </button>
                  </div>
                  
                  {/* Video Tutorial Interactive Section */}
                  <div className="mt-8 border-t border-white/10 pt-5" style={{position:'relative', zIndex:20}}>
                    {!videoState[recipe._id || recipe.id]?.showVideoOptions ? (
                      <button 
                        className="w-full py-2.5 flex items-center justify-center gap-2 rounded-lg text-sm font-medium cursor-pointer"
                        style={{pointerEvents:'all', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'#94a3b8', transition:'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'}}
                        onMouseEnter={(e) => { e.currentTarget.style.transform='translateY(-2px) scale(1.02)'; e.currentTarget.style.background='rgba(16,185,129,0.08)'; e.currentTarget.style.borderColor='rgba(16,185,129,0.3)'; e.currentTarget.style.color='#10b981'; e.currentTarget.style.boxShadow='0 4px 15px -3px rgba(16,185,129,0.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform='translateY(0) scale(1)'; e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; e.currentTarget.style.color='#94a3b8'; e.currentTarget.style.boxShadow='none'; }}
                        onClick={(e) => { e.stopPropagation(); handleVideoClick(recipe._id || recipe.id); }}
                      >
                        <PlayCircle size={16} /> Need Video Tutorial?
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2 animate-fade-in-up">
                        <div className="flex flex-col gap-2 justify-center mt-1">
                          <a 
                            href={`https://www.youtube.com/results?search_query=how+to+cook+${encodeURIComponent(recipe.name || recipe.title)}+recipe`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer font-medium relative z-[999]"
                            style={{pointerEvents:'auto', color:'#f87171', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}
                          >
                            <PlayCircle size={16} /> Watch on YouTube
                          </a>
                          <a 
                            href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(recipe.name || recipe.title)}+recipe+plated+photography`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer font-medium relative z-[999]"
                            style={{pointerEvents:'auto', color:'#94a3b8', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}
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
        })}
      </div>

      {/* Cook Modal — rendered via portal to ensure perfect centering on the page */}
      {cookRecipe && createPortal(
        <CookModal recipe={cookRecipe} onClose={() => setCookRecipe(null)} />,
        document.body
      )}
    </div>
  );
};

export default Results;
