import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Utensils, Activity, Settings2, Sparkles, ArrowRight, ArrowLeft, Clock, Coffee, Sunset, Moon, Loader2, AlertCircle, Tag } from 'lucide-react';
import './RecipeFinder.css';

const PREDEFINED_INGREDIENTS = ['Chicken', 'Rice', 'Tomato', 'Onion', 'Garlic', 'Spinach', 'Pasta', 'Eggs', 'Milk', 'Cheese'];
const CUISINES = [
  "American", "Asian", "British", "Caribbean", "Chinese", "European", 
  "French", "German", "Greek", "Indian", "Italian", "Japanese", "Korean", 
  "Latin American", "Mediterranean", "Mexican", "Middle Eastern", 
  "Spanish", "Thai", "Vietnamese"
];
const TASTES = ["Bitter", "Neutral", "Savory", "Sour", "Spicy", "Sweet", "Umami"];

const RecipeFinder = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [categorizedPantry, setCategorizedPantry] = useState({});
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchError, setMatchError] = useState('');
  const inputRef = useRef(null);
  
  // Preferences
  const [dietary, setDietary] = useState([]);
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [selectedTastes, setSelectedTastes] = useState([]);

  const handleAddIngredient = async (ing) => {
    if (!ing || matchingLoading) return;
    
    // Support comma-separated lists natively
    const itemsToProcess = ing.split(',').map(i => i.trim()).filter(Boolean);
    if (itemsToProcess.length === 0) return;

    setSearchInput('');
    setMatchError('');
    setMatchingLoading(true);

    try {
      const res = await fetch('http://localhost:8000/match_ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_ingredients: itemsToProcess })
      });
      const data = await res.json();
      
      let newObjPantry = {};
      let newlyAdded = [];
      let errors = [];

      data.results.forEach(result => {
        if (!result || result.error || !result.match) {
          errors.push(`"${result.raw}" not recognized.`);
          return;
        }

        const matchedName = result.match;
        const category = result.category || 'Other';

        // Check if already in pantry or added this batch
        if (ingredients.includes(matchedName) || newlyAdded.includes(matchedName)) {
          return; 
        }

        newlyAdded.push(matchedName);
        if (!newObjPantry[category]) newObjPantry[category] = [];
        newObjPantry[category].push(matchedName);
      });

      if (errors.length > 0) {
        setMatchError(errors.join(' '));
        setTimeout(() => setMatchError(''), 5000);
      }

      if (newlyAdded.length > 0) {
        setIngredients(prev => [...prev, ...newlyAdded]);
        setCategorizedPantry(prev => {
          const updated = { ...prev };
          for (const [cat, items] of Object.entries(newObjPantry)) {
            if (!updated[cat]) updated[cat] = [];
            updated[cat] = [...updated[cat], ...items];
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Match API error:', err);
      setMatchError('Could not reach the AI server. Is the backend running?');
      setTimeout(() => setMatchError(''), 5000);
    } finally {
      setMatchingLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleRemoveIngredient = (ing) => {
    setIngredients(prev => prev.filter(i => i !== ing));
    setCategorizedPantry(prev => {
      const updated = {};
      for (const [cat, items] of Object.entries(prev)) {
        const filtered = items.filter(i => i !== ing);
        if (filtered.length > 0) updated[cat] = filtered;
      }
      return updated;
    });
  };

  const clearAllIngredients = () => {
    setIngredients([]);
    setCategorizedPantry({});
  };

  const toggleDietary = (pref) => {
    if (dietary.includes(pref)) {
      setDietary(dietary.filter(d => d !== pref));
    } else {
      setDietary([...dietary, pref]);
    }
  };

  const toggleCuisine = (cuisine) => {
    if (selectedCuisines.includes(cuisine)) {
      setSelectedCuisines(selectedCuisines.filter(c => c !== cuisine));
    } else {
      if (selectedCuisines.length >= 2) {
        setMatchError("Maximum 2 cuisines allowed!");
        setTimeout(() => setMatchError(''), 3000);
        return;
      }
      setSelectedCuisines([...selectedCuisines, cuisine]);
    }
  };

  const toggleTaste = (taste) => {
    if (selectedTastes.includes(taste)) {
      setSelectedTastes(selectedTastes.filter(t => t !== taste));
    } else {
      if (selectedTastes.length >= 2) {
        setMatchError("Maximum 2 tastes allowed!");
        setTimeout(() => setMatchError(''), 3000);
        return;
      }
      setSelectedTastes([...selectedTastes, taste]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchInput.trim()) handleAddIngredient(searchInput.trim());
    }
  };

  const handleProcess = () => {
    if (ingredients.length === 0) return;
    
    // Check for dummy omelette combo (must include tomato, onion, egg AND be a Snack)
    const isDummyOmelette = 
      ingredients.length === 3 && 
      ingredients.some(i => i.toLowerCase() === 'tomato') &&
      ingredients.some(i => i.toLowerCase() === 'onion') &&
      ingredients.some(i => i.toLowerCase() === 'egg') &&
      selectedTastes.includes('Savory'); // Replaced MealType=Snack with Savory parameter as a fallback

    navigate('/processing', { 
      state: { ingredients, dietary, cuisines: selectedCuisines, tastes: selectedTastes, isDummyOmelette } 
    });
  };

  return (
    <div className="finder-container animate-fade-in-up">
      <div className="wizard-header">
        <h1 className="text-center mb-2">Design Your Meal</h1>
        <p className="text-center text-secondary mb-8 text-lg">Input your ingredients and let our chef do the rest.</p>
        
        <div className="stepper">
          <div 
            className={`step ${step >= 1 ? 'active' : ''}`} 
            onClick={() => setStep(1)}
            style={{ cursor: step === 2 ? 'pointer' : 'default' }}
          >
            <div className="step-circle pulse-hover">1</div>
            <span className="step-label">Pantry</span>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <div className="step-circle hover:border-primary transition-colors">2</div>
            <span className="step-label">Tastes</span>
          </div>
        </div>
      </div>

      <div className="glass-panel wizard-card shadow-[0_8px_32px_rgba(0,0,0,0.5)] border-white/10">
        {step === 1 && (
          <div className="step-content animate-fade-in-up">
            <h3 className="flex items-center gap-2 mb-6 text-xl">
              <Utensils className="text-primary" /> What's available to cook?
            </h3>
            
            <div className="input-group search-group">
              <div className="input-wrapper group hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-shadow rounded-xl">
                {matchingLoading ? (
                  <Loader2 className="input-icon text-primary animate-spin" size={20} />
                ) : (
                  <Search className="input-icon group-focus-within:text-primary transition-colors" size={20} />
                )}
                <input 
                  ref={inputRef}
                  type="text" 
                  className="input-field icon-padding finder-input bg-black/20 focus:bg-black/40 border-r-0" 
                  placeholder="e.g. Chicken breast, Garlic, Spinach..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={matchingLoading}
                />
                <button 
                  className="btn btn-primary add-btn m-0 rounded-l-none"
                  onClick={() => handleAddIngredient(searchInput.trim())}
                  disabled={!searchInput.trim() || matchingLoading}
                >
                  {matchingLoading ? <Loader2 size={20} className="animate-spin" /> : <><Plus size={20} /> Add</>}
                </button>
              </div>
              {matchError && (
                <div className="match-error animate-fade-in-up">
                  <AlertCircle size={16} /> {matchError}
                </div>
              )}
            </div>

            <div className="suggestions mt-6 bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2"><Sparkles size={16}/> Suggested Additions:</span>
              <div className="suggestion-chips">
                {PREDEFINED_INGREDIENTS.filter(i => !ingredients.includes(i)).map(ing => (
                  <button key={ing} className="chip hover:bg-primary/20 hover:text-primary border-transparent hover:border-primary/50 transition-all cursor-pointer" onClick={() => handleAddIngredient(ing)}>
                    <Plus size={14} className="opacity-50" /> {ing}
                  </button>
                ))}
              </div>
            </div>

            <div className="selected-ingredients mt-8 flex-1">
              <h4 className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
                <span>Your AI Pantry ({ingredients.length})</span>
                {ingredients.length > 0 && (
                  <button onClick={clearAllIngredients} className="text-xs text-danger hover:text-red-400 bg-red-500/10 px-2 py-1 rounded">Clear All</button>
                )}
              </h4>
              
              {ingredients.length === 0 ? (
                <div className="empty-state border-dashed border-2 hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => document.querySelector('.finder-input').focus()}>
                  <div className="empty-icon-wrapper group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Search size={32} />
                  </div>
                  <p className="text-lg">Your basket is empty.</p>
                  <p className="text-sm mt-1 text-muted">Type an ingredient above — our AI will categorize it instantly</p>
                </div>
              ) : (
                <div className="pantry-categories">
                  {Object.entries(categorizedPantry).map(([category, items]) => (
                    <div key={category} className="pantry-category-group animate-fade-in-up">
                      <div className="pantry-category-header">
                        <Tag size={14} className="text-primary" />
                        <span className="pantry-category-name">{category}</span>
                        <span className="pantry-category-count">{items.length}</span>
                      </div>
                      <div className="pantry-category-items">
                        {items.map(ing => (
                          <div key={ing} className="ingredient-item glass-panel hover:-translate-y-1 hover:shadow-lg transition-all group border-primary/30 bg-primary/5">
                            <span className="font-semibold text-white group-hover:text-primary transition-colors">{ing}</span>
                            <button className="remove-btn bg-black/20 hover:bg-danger hover:text-white" onClick={() => handleRemoveIngredient(ing)}>
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="wizard-actions mt-8 pt-6 border-t border-white/5">
              <button 
                className={`btn ml-auto w-full md-w-auto px-8 py-3 text-lg ${ingredients.length > 0 || searchInput.trim() ? 'btn-primary pulse-shadow hover:scale-105' : 'bg-white/10 text-white/50 cursor-not-allowed'}`}
                onClick={() => {
                  if (searchInput.trim() && !ingredients.includes(searchInput.trim())) {
                    setIngredients(prev => [...prev, searchInput.trim()]);
                    setSearchInput('');
                  }
                  setStep(2);
                }}
                disabled={ingredients.length === 0 && !searchInput.trim()}
              >
                Next: Preferences <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content animate-fade-in-up">
            <h3 className="flex items-center gap-2 mb-6 text-xl">
              <Settings2 className="text-primary" /> How do you want to eat?
            </h3>
            
            {matchError && (
              <div className="match-error animate-fade-in-up mb-6">
                <AlertCircle size={16} /> {matchError}
              </div>
            )}
            
            <div className="preferences-grid">
              {/* Cuisines - Multi-Select Chips (Max 2) */}
              <div className="pref-section" style={{ gridColumn: '1 / -1' }}>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="flex items-center gap-2 text-lg"><Utensils size={20} className="text-primary" /> What are you craving?</h4>
                  <span className="text-xs text-secondary bg-black/30 px-2 py-1 rounded-full">{selectedCuisines.length}/2 Cuisines</span>
                </div>
                <div className="chips-grid">
                  {CUISINES.map(c => (
                    <button 
                      key={c}
                      type="button"
                      className={`chip select-chip ${selectedCuisines.includes(c) ? 'active' : ''}`}
                      onClick={() => toggleCuisine(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tastes - Multi-Select Chips (Max 2) */}
              <div className="pref-section">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="flex items-center gap-2 text-lg"><Activity size={20} className="text-primary" /> Flavor Profile</h4>
                  <span className="text-xs text-secondary bg-black/30 px-2 py-1 rounded-full">{selectedTastes.length}/2 Tastes</span>
                </div>
                <div className="chips-grid">
                  {TASTES.map(t => (
                    <button 
                      key={t}
                      type="button"
                      className={`chip select-chip ${selectedTastes.includes(t) ? 'active' : ''}`}
                      onClick={() => toggleTaste(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Health Preferences - Toggle Chips */}
              <div className="pref-section">
                <h4 className="flex items-center gap-2 mb-4 text-lg"><Activity size={20} className="text-primary" /> Diet & Allergies</h4>
                <div className="chips-grid">
                  {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal', 'Kosher'].map(pref => (
                    <button 
                      key={pref}
                      type="button"
                      className={`chip select-chip ${dietary.includes(pref) ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleDietary(pref);
                      }}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>


            </div>

            <div className="wizard-actions mt-8 flex gap-4">
              <button className="btn btn-secondary px-6 hover:bg-white/10 border-white/20" onClick={() => setStep(1)}>
                <ArrowLeft size={18} /> Back
              </button>
              <button 
                className="btn btn-primary flex-1 text-lg py-3 pulse-shadow bg-gradient-to-r from-primary to-blue-500 hover:scale-[1.02] transition-transform border-none flex justify-center items-center gap-2" 
                onClick={handleProcess}
              >
                <Sparkles size={22} /> Find Recipe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeFinder;
