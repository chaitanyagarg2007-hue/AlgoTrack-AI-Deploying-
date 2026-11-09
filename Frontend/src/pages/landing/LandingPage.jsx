import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAuthStore } from '../../store/authStore';
import { updateUserHandles } from '../../lib/api/auth';
import './Landing.css';

const LandingPage = () => {
  const { user, isAuthenticated } = useAuthStore();

  const savedHandles = (() => {
    try {
      return JSON.parse(localStorage.getItem('algotrack_handles') || '{}');
    } catch (e) {
      return {};
    }
  })();

  const [leetcode, setLeetcode] = useState(savedHandles.lc || '');
  const [codeforces, setCodeforces] = useState(savedHandles.cf || '');
  const [codechef, setCodechef] = useState(savedHandles.cc || '');
  const [errorMsg, setErrorMsg] = useState('');

  // If user logs in, auto-fill handles from user account if available
  useEffect(() => {
    if (user && user.accounts && user.accounts.length > 0) {
      user.accounts.forEach((acc) => {
        if (acc.platform === 'LeetCode' && !leetcode) setLeetcode(acc.handle);
        if (acc.platform === 'Codeforces' && !codeforces) setCodeforces(acc.handle);
        if (acc.platform === 'CodeChef' && !codechef) setCodechef(acc.handle);
      });
    }
  }, [user]);

  const hasSavedProfile = Boolean(savedHandles.lc || savedHandles.cf || savedHandles.cc);

  const navigate = useNavigate();

  const cleanHandle = (val) => {
    let s = val.trim();
    if (s.includes('leetcode.com/')) {
      s = s.split('leetcode.com/')[1].replace('u/', '').replace('profile/', '').split('/')[0].split('?')[0];
    } else if (s.includes('codeforces.com/profile/')) {
      s = s.split('codeforces.com/profile/')[1].split('/')[0].split('?')[0];
    } else if (s.includes('codechef.com/users/')) {
      s = s.split('codechef.com/users/')[1].split('/')[0].split('?')[0];
    }
    return s;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const lc = cleanHandle(leetcode);
    const cf = cleanHandle(codeforces);
    const cc = cleanHandle(codechef);

    if (!lc && !cf && !cc) {
      setErrorMsg("Please provide at least one handle (LeetCode, Codeforces, or CodeChef). You can leave the others blank.");
      return;
    }

    try {
      localStorage.setItem('algotrack_handles', JSON.stringify({ lc, cf, cc }));
    } catch (e) {}

    // If logged in, automatically save handles to user database account!
    if (isAuthenticated) {
      try {
        await updateUserHandles({
          leetcode: lc,
          codeforces: cf,
          codechef: cc,
          college: user?.college,
        });
      } catch (err) {
        console.warn('Could not sync handles to server:', err);
      }
    }

    const params = new URLSearchParams();
    if (lc) params.append('lc', lc);
    if (cf) params.append('cf', cf);
    if (cc) params.append('cc', cc);

    navigate(`/profile?${params.toString()}`);
  };

  const loadDemo = (lcUser, cfUser, ccUser) => {
    setLeetcode(lcUser);
    setCodeforces(cfUser);
    setCodechef(ccUser);
    setErrorMsg('');
  };

  return (
    <div className="landing-page-wrapper">
      <Navbar />

      <div className="landing-container">
        <div className="landing-content glass animate-fade-in" style={{ maxWidth: '640px', width: '92%' }}>
          <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '20px', color: '#60a5fa', fontSize: '0.8rem', fontWeight: 600, marginBottom: '14px' }}>
            🚀 Resume-Grade CP & DSA Intelligence Platform
          </div>
          
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>AlgoTrack AI</h1>
          <p className="subtitle" style={{ fontSize: '0.98rem', color: '#94a3b8', marginBottom: '22px' }}>
            Connect your coding platforms for unified DSA analytics, cross-platform weak spot detection, and in-app coding with AI TLE/MLE diagnostics.
          </p>

          {/* User College Greeting if logged in */}
          {isAuthenticated && user && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '10px',
              padding: '10px 16px',
              marginBottom: '18px',
              fontSize: '0.88rem',
              color: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <span>👋 Welcome back, <strong>{user.full_name || user.username}</strong>!</span>
              <span className="college-badge" style={{ fontSize: '0.75rem' }}>🏛️ {user.college}</span>
            </div>
          )}

          {/* Informative Guidance Pill */}
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '0.84rem', color: '#cbd5e1' }}>
            💡 <strong>Tip:</strong> You only need to enter <strong>at least one handle</strong>. Leave any platform you don't use blank!
          </div>

          {hasSavedProfile && (
            <div style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Active Session Detected
                </div>
                <div style={{ color: '#f8fafc', fontSize: '0.92rem', fontWeight: 600, marginTop: '2px' }}>
                  {[savedHandles.lc && `LC: @${savedHandles.lc}`, savedHandles.cf && `CF: @${savedHandles.cf}`, savedHandles.cc && `CC: @${savedHandles.cc}`].filter(Boolean).join(' • ')}
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.84rem',
                  whiteSpace: 'nowrap',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  const params = new URLSearchParams();
                  if (savedHandles.lc) params.append('lc', savedHandles.lc);
                  if (savedHandles.cf) params.append('cf', savedHandles.cf);
                  if (savedHandles.cc) params.append('cc', savedHandles.cc);
                  navigate(`/profile?${params.toString()}`);
                }}
              >
                Resume Profile →
              </button>
            </div>
          )}

          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px', color: '#f87171', fontSize: '0.85rem', marginBottom: '16px' }}>
              {errorMsg}
            </div>
          )}

          {/* Clean Unified Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '0.84rem', color: '#fbbf24', fontWeight: 600, display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>🟧 LeetCode Username</span>
                <span style={{ color: '#64748b', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                type="text"
                className="handle-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                placeholder="e.g. neal_wu (or leave blank)"
                value={leetcode}
                onChange={(e) => setLeetcode(e.target.value)}
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '0.84rem', color: '#60a5fa', fontWeight: 600, display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>🟦 Codeforces Handle</span>
                <span style={{ color: '#64748b', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                type="text"
                className="handle-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                placeholder="e.g. tourist (or leave blank)"
                value={codeforces}
                onChange={(e) => setCodeforces(e.target.value)}
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '0.84rem', color: '#c084fc', fontWeight: 600, display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>🟫 CodeChef Username</span>
                <span style={{ color: '#64748b', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                type="text"
                className="handle-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                placeholder="e.g. your CodeChef username (or leave blank)"
                value={codechef}
                onChange={(e) => setCodechef(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '12px', fontSize: '1rem', marginTop: '6px' }}>
              Analyze My Profile →
            </button>

            {/* Quick Demo Button for Recruiters */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => loadDemo('neal_wu', 'tourist', '')}
                style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                🎯 1-Click Recruiter Demo (neal_wu + tourist)
              </button>
              <span style={{ color: '#475569' }}>•</span>
              <Link 
                to="/contests" 
                style={{ color: '#fbbf24', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 600 }}
              >
                🏆 View Live Upcoming Contests →
              </Link>
            </div>
          </form>

          {/* Practice Arena Direct Shortcut */}
          <div style={{ marginTop: '26px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.92rem', display: 'block' }}>
                ⚡ In-App Practice Arena & AI Diagnostics
              </span>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                Practice DSA questions with starter templates & AI complexity analysis.
              </span>
            </div>

            <Link 
              to="/practice" 
              className="btn-primary" 
              style={{ 
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                padding: '8px 18px',
                fontSize: '0.88rem',
                whiteSpace: 'nowrap'
              }}
            >
              Open Arena →
            </Link>
          </div>

          {/* College Leaderboard Shortcut */}
          <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.92rem', display: 'block' }}>
                🏆 College Leaderboard (NSUT vs DTU vs IIIT-D)
              </span>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                See where you rank among your college peers across all platforms.
              </span>
            </div>

            <Link 
              to="/leaderboard" 
              className="btn-primary" 
              style={{ 
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                padding: '8px 18px',
                fontSize: '0.88rem',
                whiteSpace: 'nowrap'
              }}
            >
              View Rankings →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
