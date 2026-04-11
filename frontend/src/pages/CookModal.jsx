import React, { useState, useEffect } from 'react';
import { X, Clock, ChefHat, Heart, CheckCircle, Circle, Utensils, Leaf, ShoppingBag } from 'lucide-react';
import './CookModal.css';

const CookModal = ({ recipe, onClose }) => {
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [liveSteps, setLiveSteps] = useState(null); // null = loading, [] = not found
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);

  const name = recipe?.name || recipe?.recipe_title || recipe?.title || 'Unknown Recipe';

  useEffect(() => {
    if (!recipe) return;
    setLoading(true);
    fetch(`http://localhost:8000/api/recipe-detail?name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(data => {
        setLiveSteps(data.steps || []);
        setSummary(data.summary || '');
      })
      .catch(() => setLiveSteps([]))
      .finally(() => setLoading(false));
  }, [name]);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  if (!recipe) return null;

  const toggleStep = (idx) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const prepTime = recipe.est_prep_time_min || 0;
  const cookTime = recipe.est_cook_time_min || recipe.minutes || 0;
  const totalTime = prepTime + cookTime || cookTime;
  const difficulty = recipe.difficulty || 'Medium';
  const healthScore = recipe.healthiness_score || 50;
  const ingredients = recipe.ingredients_canonical || recipe.ingredients || [];
  const dietary = recipe.dietary_profile || [];
  const tastes = recipe.tastes || [];
  const steps = liveSteps || [];
  const progress = steps.length > 0 ? Math.round((completedSteps.size / steps.length) * 100) : 0;

  return (
    <div
      className="cook-modal__overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="cook-modal__dialog glass-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Cook ${name}`}
      >
        {/* Header */}
        <div className="cook-modal__header">
          <div className="cook-modal__headerText">
            <h2 className="cook-modal__title">{name}</h2>
            <div className="cook-modal__meta">
              {totalTime > 0 && (
                <span className="cook-modal__metaItem">
                  <Clock size={14} className="cook-modal__metaIcon" /> {totalTime} min
                </span>
              )}
              <span className="cook-modal__metaItem">
                <ChefHat size={14} className="cook-modal__metaIcon" /> {difficulty}
              </span>
              <span className="cook-modal__metaItem">
                <Heart size={14} className={healthScore > 70 ? 'cook-modal__metaIcon cook-modal__metaIcon--good' : 'cook-modal__metaIcon'} /> {healthScore}/100 Health
              </span>
            </div>
          </div>
          <button onClick={onClose} className="cook-modal__closeBtn" aria-label="Close">
            <X size={22} />
          </button>
        </div>

        <div className="cook-modal__body">

          {/* Progress Bar */}
          {steps.length > 0 && (
            <div className="cook-modal__progress">
              <div className="cook-modal__progressRow">
                <span>Cooking Progress</span>
                <span>{completedSteps.size}/{steps.length} steps ({progress}%)</span>
              </div>
              <div className="cook-modal__progressTrack">
                <div className="cook-modal__progressFill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <p className="cook-modal__summary">
              {summary.slice(0, 300)}{summary.length > 300 ? '...' : ''}
            </p>
          )}

          {/* Dietary & Taste Tags */}
          {(dietary.length > 0 || tastes.length > 0) && (
            <div className="cook-modal__tags">
              {dietary.map(d => (
                <span key={d} className="chip cook-modal__chip cook-modal__chip--dietary">
                  <Leaf size={11} /> {d.replace(/_/g, ' ')}
                </span>
              ))}
              {tastes.map(t => (
                <span key={t} className="chip cook-modal__chip cook-modal__chip--taste">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Ingredients */}
          {ingredients.length > 0 && (
            <div>
              <h3 className="cook-modal__sectionTitle">
                <ShoppingBag size={18} className="cook-modal__sectionIcon" /> Ingredients
                <span className="cook-modal__sectionCount">({ingredients.length} items)</span>
              </h3>
              <div className="cook-modal__ingredientsGrid">
                {ingredients.map((ing, i) => (
                  <div key={i} className="cook-modal__ingredient">
                    <span className="cook-modal__dot" />
                    <span className="cook-modal__ingredientText">{ing}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step-by-Step Instructions */}
          <div>
            <h3 className="cook-modal__sectionTitle">
              <Utensils size={18} className="cook-modal__sectionIcon" /> Instructions
            </h3>

            {loading ? (
              <div className="cook-modal__loading">
                <span className="cook-modal__spinner" />
                <span>Fetching cooking steps...</span>
              </div>
            ) : steps.length === 0 ? (
              <div className="cook-modal__empty">
                <p>No step-by-step instructions found for this recipe.</p>
                <a
                  href={`https://www.youtube.com/results?search_query=how+to+cook+${encodeURIComponent(name)}+recipe`}
                  target="_blank" rel="noopener noreferrer"
                  className="cook-modal__youtubeLink">
                  🎬 Watch how to cook "{name}" on YouTube →
                </a>
              </div>
            ) : (
              <div className="cook-modal__steps">
                {steps.map((step, i) => (
                  <div
                    key={i}
                    onClick={() => toggleStep(i)}
                    className={`cook-modal__step ${completedSteps.has(i) ? 'cook-modal__step--done' : ''}`}
                  >
                    <div className="cook-modal__stepIcon">
                      {completedSteps.has(i)
                        ? <CheckCircle size={20} className="cook-modal__checkIcon" />
                        : <Circle size={20} className="cook-modal__circleIcon" />}
                    </div>
                    <div className="cook-modal__stepContent">
                      <span className="cook-modal__stepLabel">
                        Step {i + 1}
                      </span>
                      <p className={`cook-modal__stepText ${completedSteps.has(i) ? 'cook-modal__stepText--done' : ''}`}>
                        {step}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Done Footer */}
          {progress === 100 && (
            <div className="cook-modal__done">
              <p className="cook-modal__doneText">🎉 Recipe Complete! Enjoy your meal!</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CookModal;
