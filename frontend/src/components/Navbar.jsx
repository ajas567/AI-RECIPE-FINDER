import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChefHat, User, Menu, X, LogOut, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth(); // Globally accessible auth state

  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/');
  };

  return (
    <nav className="glass-nav">
      <div className="container nav-container">
        <Link to="/" className="brand">
          <ChefHat size={32} className="brand-icon" />
          <span className="brand-text">A1 RecipeFinder</span>
        </Link>
        
        {!isAuthPage && (
          <>
            <div className={`nav-links ${isOpen ? 'open' : ''}`}>
              <Link to="/finder" className="nav-link" onClick={() => setIsOpen(false)}>Find Recipes</Link>
              
              {user ? (
                <>
                  <Link to="/saved" className="nav-link flex items-center gap-1" onClick={() => setIsOpen(false)}>
                    <Heart size={16} className="text-primary"/> Saved
                  </Link>
                  <Link to="/profile" className="nav-link flex items-center gap-1 text-primary focus:text-primary" onClick={() => setIsOpen(false)}>
                    <User size={18} /> {user.name?.split(' ')[0] || 'Profile'}
                  </Link>
                  <button onClick={handleLogout} className="btn btn-secondary nav-auth-btn flex items-center gap-2 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40">
                    <LogOut size={16} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-secondary nav-auth-btn" onClick={() => setIsOpen(false)}>Login</Link>
                  <Link to="/signup" className="btn btn-primary nav-auth-btn" onClick={() => setIsOpen(false)}>Sign Up</Link>
                </>
              )}
            </div>
            
            <button className="mobile-menu-btn" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
