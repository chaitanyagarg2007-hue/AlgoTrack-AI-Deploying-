import React from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { UpcomingContests } from '../../components/UpcomingContests';
import { useAuthStore } from '../../store/authStore';
import '../dashboard/Dashboard.css';

const ContestsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthModal, logout } = useAuthStore();

  // Retrieve handles from query params or localStorage
  let lc = searchParams.get('lc') || '';
  let cf = searchParams.get('cf') || '';
  let cc = searchParams.get('cc') || '';

  if (!lc && !cf && !cc) {
    try {
      const stored = JSON.parse(localStorage.getItem('algotrack_handles') || '{}');
      lc = stored.lc || '';
      cf = stored.cf || '';
      cc = stored.cc || '';
    } catch (e) {}
  }

  const queryParams = new URLSearchParams();
  if (lc) queryParams.append('lc', lc);
  if (cf) queryParams.append('cf', cf);
  if (cc) queryParams.append('cc', cc);
  const queryString = queryParams.toString();

  const profileUrl = queryString ? `/profile?${queryString}` : '/';
  const practiceUrl = queryString ? `/practice?${queryString}` : '/practice';
  const activeHandle = cf || lc || cc;

  const handleSmartBack = (e) => {
    e.preventDefault();
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(profileUrl);
    }
  };

  return (
    <div className="dashboard-layout animate-fade-in" style={{ minHeight: '100vh', background: '#0b1120' }}>
      <header className="dashboard-header glass">
        <div className="flex-header">
          {/* Smart Back button: returns to active profile */}
          <button 
            onClick={handleSmartBack}
            className="back-link" 
            style={{ 
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              fontWeight: 600,
              fontSize: '0.95rem',
              color: '#38bdf8',
              padding: '6px 12px',
              borderRadius: '6px',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            ← Back to Profile {activeHandle ? `(@${activeHandle})` : ''}
          </button>

          <div style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.25rem', margin: 0 }}>🏆 Live Competitive Programming Contests</h1>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isAuthenticated && user?.college && (
              <span style={{ 
                background: 'rgba(168, 85, 247, 0.2)', 
                color: '#c084fc', 
                border: '1px solid rgba(168, 85, 247, 0.4)', 
                borderRadius: '20px', 
                padding: '4px 10px', 
                fontSize: '0.78rem', 
                fontWeight: 700 
              }}>
                🏛️ {user.college}
              </span>
            )}

            <Link to={practiceUrl} className="btn-primary" style={{ textDecoration: 'none' }}>
              ⚡ Practice Arena
            </Link>

            {isAuthenticated ? (
              <button 
                onClick={logout} 
                style={{ 
                  background: 'transparent', 
                  border: '1px solid rgba(239, 68, 68, 0.4)', 
                  color: '#f87171', 
                  borderRadius: '6px', 
                  padding: '6px 10px', 
                  fontSize: '0.82rem', 
                  cursor: 'pointer' 
                }}
              >
                Log Out
              </button>
            ) : (
              <button 
                onClick={() => openAuthModal('login')} 
                style={{ 
                  background: 'rgba(59, 130, 246, 0.15)', 
                  border: '1px solid #3b82f6', 
                  color: '#60a5fa', 
                  borderRadius: '6px', 
                  padding: '6px 12px', 
                  fontSize: '0.82rem', 
                  fontWeight: 600, 
                  cursor: 'pointer' 
                }}
              >
                Sign In
              </button>
            )}

            <Link 
              to="/" 
              style={{ 
                color: '#94a3b8', 
                fontSize: '0.85rem', 
                textDecoration: 'none',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #334155'
              }}
            >
              🔄 New Search
            </Link>
          </div>
        </div>
      </header>

      <main className="dashboard-main" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
        <UpcomingContests />
      </main>
    </div>
  );
};

export default ContestsPage;
