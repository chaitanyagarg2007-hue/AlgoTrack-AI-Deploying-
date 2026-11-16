import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

export const Navbar = () => {
  const { user, isAuthenticated, openAuthModal, logout, fetchMe } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

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

      <div className="nav-auth-section" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border-strong)',
            color: 'var(--color-text-primary)',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>

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
