import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import './Navbar.css';

export const Navbar = () => {
  const { user, isAuthenticated, openAuthModal, logout, fetchMe } = useAuthStore();

  // Load session from backend if token exists
  useEffect(() => {
    fetchMe();
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <nav className="algotrack-navbar">
      <Link to="/" className="nav-brand">
        <span className="nav-brand-logo">⚡</span>
        <span>AlgoTrack AI</span>
      </Link>

      <div className="nav-links">
        <Link to="/leaderboard" className="nav-link-item">
          🏆 Leaderboard
        </Link>
        <Link to="/contests" className="nav-link-item">
          📅 Contests
        </Link>
        <Link to="/practice" className="nav-link-item">
          ⚡ Practice Arena
        </Link>
      </div>

      <div className="nav-auth-section">
        {isAuthenticated && user ? (
          <div className="nav-user-profile">
            {/* College Badge */}
            <span className="college-badge" title="College Affiliation">
              🏛️ {user.college || 'NSUT'}
            </span>

            {/* User Pill */}
            <div className="user-pill" title={user.email || user.username}>
              <div className="user-avatar-circle">
                {getInitials(user.full_name || user.username)}
              </div>
              <span>@{user.username}</span>
            </div>

            <button
              onClick={logout}
              className="btn-nav-logout"
              title="Sign Out"
            >
              Log Out
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => openAuthModal('login')}
              className="btn-nav-login"
            >
              Sign In
            </button>
            <button
              onClick={() => openAuthModal('register')}
              className="btn-nav-signup"
            >
              Sign Up
            </button>
          </>
        )}
      </div>
    </nav>
  );
};
export default Navbar;
