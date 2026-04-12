import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Loader2, Utensils, CheckCircle2, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ProcessingView.css';

const ProcessingView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { ingredients } = location.state || { ingredients: ['Sample Ingredient'] };
  
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 'analyze',
      title: 'Analyzing Ingredients',
      desc: 'Looking through your pantry items...',
      icon: <Search />,
      duration: 1500,
      log: `Found ${ingredients.length} ingredients. Checking availability.`
    },
    {
      id: 'match',
      title: 'Finding Flavor Profiles',
      desc: 'Matching ingredients with perfect culinary combinations...',
      icon: <Utensils />,
      duration: 2000,
      log: `Discovering complementary flavors and smart substitutes.`
    },
    {
      id: 'preferences',
      title: 'Applying Dietary Preferences',
      desc: 'Ensuring recipes match your health and diet goals...',
      icon: <Heart />,
      duration: 1500,
      log: `Filtering matches against your saved health preferences.`
    },
    {
      id: 'curate',
      title: 'Curating Best Recipes',
      desc: 'Selecting the most highly-rated and relevant recipes for you...',
      icon: <CheckCircle2 />,
      duration: 1500,
      log: `Ready! Organizing your personalized recipe list.`
    }
  ];

  useEffect(() => {
    let isMounted = true;
    let currentStepIndex = 0;
    
    // Animate the visual steps
    const processNextStep = () => {
      if (currentStepIndex < steps.length && isMounted) {
        setTimeout(() => {
          if (!isMounted) return;
          setActiveStep(currentStepIndex + 1);
          currentStepIndex++;
          processNextStep();
        }, steps[currentStepIndex].duration);
      }
    };

    const runAI = async () => {
      try {
        processNextStep(); // Start UI animation
        
        // Unified Request Payload to FastAPI Orchestrator
        const payload = {
            valid_ingredients: ingredients,
            user_id: user?.id, // Passing user ID to boost customized recommendations!
            cuisines: location.state?.cuisines?.length > 0 ? location.state.cuisines : undefined,
            tastes: location.state?.tastes?.length > 0 ? location.state.tastes : undefined,
            dietary_needs: location.state?.dietary?.length > 0 ? location.state.dietary : undefined,
            limit: 20,
            min_match_percentage: 0.1
        };

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/recommend_recipes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error("Failed to contact the AI pipeline");
        
        const data = await res.json();
        
        // Ensure the minimum animation time passes before redirecting
        setTimeout(() => {
            if (isMounted) {
                navigate('/results', { 
                  state: { 
                      ...location.state, 
                      aiResults: data.results,
                      validIngredients: ingredients
                  } 
                });
            }
        }, 5000); // Give the UI 5 seconds to show the cool processing screens

      } catch (err) {
        console.error("AI Engine Error:", err);
        // Fallback or error handling
        if (isMounted) {
           alert("Failed to connect to the AI Recipe Engine. Ensure Python backend is running.");
           navigate('/finder');
        }
      }
    };

    runAI();
    return () => { isMounted = false; };
  }, [navigate]);

  return (
    <div className="processing-container">
      <div className="processing-header text-center mb-8">
        <h2 className="animate-fade-in-up flex items-center justify-center gap-3" style={{ fontSize: '2.5rem' }}>
          <Loader2 className="spinner text-primary" size={40} /> Crafting Your Menu
        </h2>
        <p className="text-secondary animate-fade-in-up delay-100 mt-3 text-lg">
          Please wait while our chef analyzes your ingredients to find the perfect recipes...
        </p>
      </div>

      <div className="processing-layout processing-centered">
        <div className="steps-container">
          {steps.map((step, index) => {
            const isCompleted = activeStep > index;
            const isActive = activeStep === index;
            const isPending = activeStep < index;

            return (
              <div 
                key={step.id} 
                className={`glass-panel process-card interactive-hover ${isActive ? 'active pulse-border' : ''} ${isCompleted ? 'completed' : ''} ${isPending ? 'pending' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <div className="process-icon-box">
                  {isCompleted ? <CheckCircle2 className="text-success" /> : step.icon}
                </div>
                <div className="process-content">
                  <h4>{step.title}</h4>
                  <p className="text-secondary text-sm">{step.desc}</p>
                  
                  {(isActive || isCompleted) && (
                    <div className="feedback-log mt-2">
                       <span className="text-primary">✓</span> {step.log}
                    </div>
                  )}
                </div>
                {isActive && <Loader2 className="spinner mini-spinner" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProcessingView;
