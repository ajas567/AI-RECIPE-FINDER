import React from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Sparkles, Heart, Leaf, ArrowRight, Salad, Pizza, Coffee } from 'lucide-react';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="badge animate-fade-in-up">
            <Sparkles size={16} className="text-primary" />
            <span>Smart Personal Chef</span>
          </div>
          <h1 className="hero-title animate-fade-in-up delay-100">
            What's in your <span className="text-gradient">Fridge?</span>
          </h1>
          <p className="hero-subtitle animate-fade-in-up delay-200">
            Simply tell us what ingredients you have. Our smart recipe engine will instantly find the perfect meals that fit your diet, taste, and schedule.
          </p>
          <div className="hero-actions animate-fade-in-up delay-300">
            <Link to="/finder" className="btn btn-primary btn-lg pulse-shadow transform hover:scale-105 transition-all">
              Start Cooking Now <ArrowRight size={20} />
            </Link>
            <Link to="/explore" className="btn btn-secondary btn-lg transform hover:scale-105 transition-all">
              Explore Recipes
            </Link>
          </div>
        </div>
        
        <div className="hero-visual animate-fade-in-up delay-200">
          <div className="interactive-grid">
            {/* Interactive floating elements */}
            <div className="floating-card c1 glass-panel">
              <Salad className="text-success mb-2" size={32} />
              <h4>Healthy Salads</h4>
              <p className="text-xs text-secondary mt-1">240 matches</p>
            </div>
            <div className="floating-card c2 glass-panel">
              <Pizza className="text-warning mb-2" size={32} />
              <h4>Comfort Food</h4>
              <p className="text-xs text-secondary mt-1">156 matches</p>
            </div>
            <div className="floating-card c3 glass-panel">
              <Coffee className="text-primary mb-2" size={32} />
              <h4>Quick Breakfasts</h4>
              <p className="text-xs text-secondary mt-1">89 matches</p>
            </div>
            <div className="center-circle pulse-glow-bg">
              <ChefHat size={48} className="text-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header text-center">
          <h2>Why Choose A1 Recipe Finder?</h2>
          <p className="text-secondary">Your intelligent companion in the kitchen</p>
        </div>
        
        <div className="features-grid">
          <div className="glass-panel feature-card interactive-hover">
            <div className="feature-icon-wrapper">
              <Heart className="feature-icon" />
            </div>
            <h3>Diet & Allergy Safe</h3>
            <p className="text-secondary">We actively filter out ingredients that conflict with your customized health preferences and allergies.</p>
          </div>
          
          <div className="glass-panel feature-card interactive-hover">
            <div className="feature-icon-wrapper">
              <Sparkles className="feature-icon" />
            </div>
            <h3>Smart Substitutes</h3>
            <p className="text-secondary">Missing an ingredient? We intelligently suggest the best alternatives so you can still cook the meals you love.</p>
          </div>
          
          <div className="glass-panel feature-card interactive-hover">
            <div className="feature-icon-wrapper">
              <Leaf className="feature-icon" />
            </div>
            <h3>Zero Food Waste</h3>
            <p className="text-secondary">We analyze your exact pantry items and normalize them to find recipes that use primarily what you already have.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
