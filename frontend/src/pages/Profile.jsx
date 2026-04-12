import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { User, Heart, Settings, Utensils, Activity, AlertCircle, TrendingUp, Compass, Clock, Sparkles, PlayCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CookModal from './CookModal';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [cookRecipe, setCookRecipe] = useState(null);
  const [videoState, setVideoState] = useState({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/user/${user.id}/profile`);
        if (!res.ok) throw new Error('Failed to load profile data');
        const data = await res.json();
        setProfileData({
            ...data,
            dietary_preferences: data.top_preferences || [] 
        });

        // Fetch actual recipe documents if favorites exist
        if (data.favorites && data.favorites.length > 0) {
            const recipesRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/recipes/batch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipe_ids: data.favorites })
            });
            if (recipesRes.ok) {
                const recipesData = await recipesRes.json();
                setFavoriteRecipes(recipesData.results || []);
            }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate]);

  const toggleSave = async (id) => {
    const alreadySaved = favoriteRecipes.some(r => (r._id || r.id) === id);
    if (alreadySaved) {
      setFavoriteRecipes(prev => prev.filter(r => (r._id || r.id) !== id));
    }

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
      // keep UI responsive
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

  if (!user) return null;

  return (
    <div className="container profile-container">
      <div className="profile-header">
        <h1 className="profile-title">
            <div className="profile-title-icon">
                <User size={36} />
            </div>
            Chef's Dashboard
        </h1>
        <p className="profile-subtitle">Welcome back, <strong style={{color: '#fff', textTransform: 'capitalize'}}>{user.name.split(' ')[0]}</strong>! Manage your culinary preferences.</p>
      </div>

      {error ? (
        <div className="error-banner glass-panel">
            <AlertCircle /> {error}
        </div>
      ) : loading ? (
        <div className="center-spinner">
            <div className="spinner-element"></div>
        </div>
      ) : (
        <div className="profile-grid">
            
            {/* Left Column: Account & AI Profile */}
            <div className="profile-col">
                <div className="profile-card">
                    <h3 className="card-title">
                        <Settings className="icon-primary"/> Account Details
                    </h3>
                    <div>
                        <div className="detail-row">
                            <span className="detail-label">Full Name</span>
                            <span className="detail-value capitalize">{user.name}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Email Address</span>
                            <span className="detail-value">{user.email}</span>
                        </div>
                    </div>
                    
                    <button className="btn btn-secondary w-full" style={{ marginTop: '1.5rem', justifyContent: 'center' }}>
                         Edit Details
                    </button>
                </div>

                <div className="profile-card">
                    <h3 className="card-title">
                        <Activity className="icon-primary"/> AI Taste Profile
                    </h3>
                    <p className="card-description">
                        These tags are permanently saved to your account. Our neural network boosts recommended recipes matching these tags.
                    </p>
                    <div className="tags-container">
                        {profileData?.dietary_preferences?.length > 0 ? (
                            profileData.dietary_preferences.map(pref => (
                                <span key={pref} className="preference-chip">
                                    <Utensils size={14} /> {pref.replace(/-/g, ' ')}
                                </span>
                            ))
                        ) : (
                            <div className="empty-tags">
                                <span>No permanent preferences set. <br/> Heart some recipes!</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Analytics & Discoveries */}
            <div className="profile-col">
                
                {/* Stats Row */}
                <div className="stats-grid">
                    <div className="profile-stat-box">
                        <div className="profile-stat-number">{profileData?.total_interactions || 0}</div>
                        <div className="profile-stat-label">Saved Favorites</div>
                    </div>
                    <div className="profile-stat-box">
                        <div className="profile-stat-number purple">{profileData?.dietary_preferences?.length || 0}</div>
                        <div className="profile-stat-label">Active Triggers</div>
                    </div>
                </div>

                <div className="profile-card" style={{ flexGrow: 1 }}>
                    <div className="card-header-flex">
                        <h3 className="card-title"><Heart className="icon-pink"/> Culinary Journey</h3>
                        <span className="live-badge"><TrendingUp size={14}/> LIVE ANALYTICS</span>
                    </div>

                    {profileData?.total_interactions > 0 ? (
                         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
                            <p className="card-description" style={{ marginBottom: 0, fontSize: '1.1rem' }}>
                                You have successfully logged interactions with the AI Recommendation Engine. Our backend is currently tracking your favorites to tailor future recipe matching scores.
                            </p>
                            
                            <div className="ai-insight-box">
                                <div className="insight-icon">
                                    <TrendingUp size={28} />
                                </div>
                                <div className="insight-content">
                                    <h4>Engine Insights Active</h4>
                                    <p>
                                        Your top culinary affinities detected are <strong>{profileData.top_preferences?.[0] || 'Savory'}</strong> and <strong>{profileData.top_preferences?.[1] || 'Healthy Cuisine'}</strong>.
                                    </p>
                                </div>
                            </div>
                         </div>
                    ) : (
                        <div className="history-empty-state">
                            <div className="history-icon-wrapper">
                                <Compass size={36} strokeWidth={1.5} />
                            </div>
                            <h4 className="history-title">Your cookbook is empty</h4>
                            <p className="card-description" style={{ maxWidth: '300px', fontSize: '1.1rem', marginBottom: '2rem' }}>
                                Hit the kitchen and start liking recipes to build your permanent AI taste profile.
                            </p>
                            <button onClick={() => navigate('/finder')} className="btn btn-primary" style={{ padding: '0.8rem 2rem', justifyContent: 'center' }}>
                                <Utensils size={18} /> Discover Recipes
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Saved Favorites Section */}
      {!loading && !error && favoriteRecipes.length > 0 && (
         <div className="saved-favorites-section" style={{ marginTop: '2rem' }}>
             <h2 className="profile-title" style={{ fontSize: '1.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                 <Heart size={28} className="icon-pink" /> Your Saved Masterpieces
             </h2>
             <div className="recipes-grid">
                {favoriteRecipes.map((recipe, idx) => {
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
                          className="save-btn saved"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSave(recipe._id || recipe.id);
                          }}
                          title="Saved to Favorites"
                        >
                          <Heart size={20} fill="currentColor" />
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

                        <div className="recipe-actions flex flex-col gap-3 w-full mt-auto relative z-[999]">
                          <div className="flex gap-3">
                            <button
                              className="btn btn-primary flex-1 py-3 hover:scale-105 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.3)] relative z-[999]"
                              style={{pointerEvents:'auto', cursor:'pointer'}}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCookRecipe(recipe);
                              }}
                            >
                              Cook This
                            </button>
                          </div>
                          
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
                                    href={`https://www.youtube.com/results?search_query=how+to+cook+${encodeURIComponent(nameStr)}+recipe`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer font-medium relative z-[999]"
                                    style={{pointerEvents:'auto', color:'#f87171', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}
                                  >
                                    <PlayCircle size={16} /> Watch on YouTube
                                  </a>
                                  <a 
                                    href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(nameStr)}+recipe+plated+photography`}
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
         </div>
      )}

      {/* Cook Modal — rendered via portal so it escapes the profile-container stacking context */}
      {cookRecipe && createPortal(
        <CookModal recipe={cookRecipe} onClose={() => setCookRecipe(null)} />,
        document.body
      )}
    </div>
  );
};

export default Profile;
