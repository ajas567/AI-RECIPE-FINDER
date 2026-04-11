import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import RecipeFinder from './pages/RecipeFinder';
import ProcessingView from './pages/ProcessingView';
import Results from './pages/Results';
import Explore from './pages/Explore';
import Profile from './pages/Profile';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <div className="app-bg"></div>
      <Router>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/finder" element={<RecipeFinder />} />
            <Route path="/processing" element={<ProcessingView />} />
            <Route path="/results" element={<Results />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/saved" element={<Profile />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;
