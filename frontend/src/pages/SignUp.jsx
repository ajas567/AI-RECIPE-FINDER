import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ChefHat, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const SignUp = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Signup failed');
      }
      
      login(data); // Auto-login the new user
      navigate('/finder');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel animate-fade-in-up">
        <div className="auth-header">
          <div className="auth-icon-wrapper float-anim" style={{ background: 'linear-gradient(135deg,rgba(139, 92, 246, 0.2) 0%, rgba(244, 114, 182, 0.2) 100%)' }}>
            <User size={40} className="auth-icon" style={{ color: '#a78bfa' }} />
          </div>
          <h2>Create Account</h2>
          <p className="text-secondary">Join to save health preferences & recipes</p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="auth-form">
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <div className="input-wrapper">
              <User className="input-icon" size={20} />
              <input 
                type="text" 
                className="input-field icon-padding" 
                placeholder="Gordon Ramsay"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input 
                type="email" 
                className="input-field icon-padding" 
                placeholder="chef@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label mb-0">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input 
                type="password" 
                className="input-field icon-padding" 
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full mt-6 auth-submit" style={{ background: 'var(--secondary-color)', boxShadow: '0 4px 15px -3px var(--secondary-glow)' }}>
            Sign Up <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-footer">
          <p className="text-secondary">
            Already have an account? <Link to="/login" className="auth-link" style={{ color: '#a78bfa' }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
