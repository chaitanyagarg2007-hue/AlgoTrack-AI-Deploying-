import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { loginUser, registerUser, updateUserHandles } from '../../lib/api/auth';
import './AuthModal.css';

const COLLEGES = [
  'NSUT',
  'DTU',
  'IIIT Delhi',
  'IGDTUW',
  'IIT Delhi',
  'BITS Pilani',
  'Other'
];

export const AuthModal = () => {
  const { authModalOpen, authModalTab, closeAuthModal, setAuthModalTab, login } = useAuthStore();

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regCollege, setRegCollege] = useState('NSUT');
  const [regPassword, setRegPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!authModalOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMsg('Please enter both username/email and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await loginUser({
        username_or_email: loginIdentifier.trim(),
        password: loginPassword,
      });

      login(res.access_token, res.user);
      closeAuthModal();
    } catch (err) {
      console.error('Login error:', err);
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regUsername.trim()) {
      setErrorMsg('Username is required.');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMsg('Email address is required.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      const res = await registerUser({
        username: regUsername.trim(),
        email: regEmail.trim(),
        full_name: regFullName.trim() || regUsername.trim(),
        college: regCollege,
        password: regPassword,
      });

      login(res.access_token, res.user);

      // Check if user already typed handles in local storage and sync them to new account!
      try {
        const saved = JSON.parse(localStorage.getItem('algotrack_handles') || '{}');
        if (saved.lc || saved.cf || saved.cc) {
          await updateUserHandles({
            leetcode: saved.lc || '',
            codeforces: saved.cf || '',
            codechef: saved.cc || '',
            college: regCollege,
            full_name: regFullName.trim() || regUsername.trim(),
          });
        }
      } catch (e) {
        console.warn('Could not auto-sync local handles:', e);
      }

      closeAuthModal();
    } catch (err) {
      console.error('Registration error:', err);
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : 'Registration failed. Username or email may already be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-backdrop" onClick={closeAuthModal}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="auth-header">
          <button className="auth-close-btn" onClick={closeAuthModal} title="Close">
            ✕
          </button>
          <div className="auth-brand-badge">⚡ AlgoTrack AI Identity</div>
          <h2 className="auth-title">
            {authModalTab === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="auth-subtitle">
            {authModalTab === 'login'
              ? 'Sign in to access your saved college profile and analytics.'
              : 'Join your college leaderboard (NSUT, DTU, IIIT-D) & track your progress.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${authModalTab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setAuthModalTab('login');
              setErrorMsg('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${authModalTab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setAuthModalTab('register');
              setErrorMsg('');
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Form Body */}
        <div className="auth-body">
          {errorMsg && (
            <div className="auth-error-banner" style={{ marginBottom: '14px' }}>
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {authModalTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">Username or Email</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Enter username or email"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">Password</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>

              <div className="auth-footer">
                Don't have an account?{' '}
                <button
                  type="button"
                  className="auth-toggle-link"
                  onClick={() => {
                    setAuthModalTab('register');
                    setErrorMsg('');
                  }}
                >
                  Create one now
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">Username</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Enter username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">Email Address</label>
                <input
                  type="email"
                  className="auth-input"
                  placeholder="Enter email address"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="auth-field">
                  <label className="auth-label">Full Name</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Enter full name"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label">College / Campus</label>
                  <select
                    className="auth-select"
                    value={regCollege}
                    onChange={(e) => setRegCollege(e.target.value)}
                  >
                    {COLLEGES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Password (Min 6 chars)</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Enter password (min 6 characters)"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Creating Account...' : 'Sign Up & Join College Leaderboard →'}
              </button>

              <div className="auth-footer">
                Already have an account?{' '}
                <button
                  type="button"
                  className="auth-toggle-link"
                  onClick={() => {
                    setAuthModalTab('login');
                    setErrorMsg('');
                  }}
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default AuthModal;
