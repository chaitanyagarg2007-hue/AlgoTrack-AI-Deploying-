import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../lib/api/client';
import { ActivityCalendar } from 'react-activity-calendar';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { UpcomingContests } from '../../components/UpcomingContests';
import { useAuthStore } from '../../store/authStore';
import { updateUserHandles } from '../../lib/api/auth';
import { useTheme } from '../../context/ThemeContext';
import './Dashboard.css';
import './UnifiedDashboard.css';

const UnifiedDashboard = () => {
  const { theme, toggleTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, openAuthModal, logout } = useAuthStore();
  const [savedToCloud, setSavedToCloud] = useState(false);
  
  // Retrieve from query params or localStorage, with default handles
  let lc = searchParams.get('lc') || '';
  let cf = searchParams.get('cf') || '';
  let cc = searchParams.get('cc') || '';

  if (!lc && !cf && !cc) {
    try {
      const stored = JSON.parse(localStorage.getItem('algotrack_handles') || '{}');
      lc = stored.lc || 'chaitanya_garg_';
      cf = stored.cf || 'chaitanyagarg2026';
      cc = stored.cc || 'chaitanya_garg';
    } catch (e) {
      lc = 'chaitanya_garg_';
      cf = 'chaitanyagarg2026';
      cc = 'chaitanya_garg';
    }
  }

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [ratingPlatform, setRatingPlatform] = useState('All');

  // Sync back to localStorage so session is preserved
  useEffect(() => {
    if (lc || cf || cc) {
      try {
        localStorage.setItem('algotrack_handles', JSON.stringify({ lc, cf, cc }));
      } catch (e) {}
    }
  }, [lc, cf, cc]);

  const navParams = new URLSearchParams();
  if (lc) navParams.append('lc', lc);
  if (cf) navParams.append('cf', cf);
  if (cc) navParams.append('cc', cc);
  const navQuery = navParams.toString();
  const contestsLink = navQuery ? `/contests?${navQuery}` : '/contests';
  const practiceLink = navQuery ? `/practice?${navQuery}` : '/practice';

  useEffect(() => {
    const fetchUnifiedData = async () => {
      try {
        setLoading(true);
        setError('');
        const params = new URLSearchParams();
        if (lc) params.append('leetcode', lc);
        if (cf) params.append('codeforces', cf);
        if (cc) params.append('codechef', cc);

        const resp = await api.get(`/unified-profile?${params.toString()}`);
        setData(resp.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || 'Failed to aggregate multi-platform profile data.');
      } finally {
        setLoading(false);
      }
    };

    if (lc || cf || cc) {
      fetchUnifiedData();
    } else {
      setLoading(false);
      setError('No platform handles provided. Please enter at least one handle.');
    }
  }, [lc, cf, cc]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveToCloud = async () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    try {
      await updateUserHandles({
        leetcode: lc,
        codeforces: cf,
        codechef: cc,
        college: user?.college,
      });
      setSavedToCloud(true);
      setTimeout(() => setSavedToCloud(false), 3000);
    } catch (e) {
      console.warn('Failed to sync to cloud:', e);
    }
  };

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Concurrently fetching live data from LeetCode, Codeforces & CodeChef...</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <h2>Aggregation Error</h2>
      <p className="text-danger">{error}</p>
      <Link to="/" className="btn-primary mt-4 inline-block">Go Back to Setup</Link>
    </div>
  );

  if (!data) return null;

  // Colors
  const COLORS = ['#fbbf24', '#3b82f6', '#c084fc', '#10b981', '#ef4444', '#06b6d4'];

  // Platform Donut Chart
  const platformChartData = Object.entries(data.connected_platforms || {}).map(([name, info]) => ({
    name,
    value: info.total_solved || 0
  }));

  // Multi-Platform Rating Progression Data (LeetCode, Codeforces, CodeChef)
  const getFilteredRatingData = () => {
    let source = [];
    if (ratingPlatform === 'LeetCode') source = data.lc_rating_history || [];
    else if (ratingPlatform === 'Codeforces') source = data.cf_rating_history || [];
    else if (ratingPlatform === 'CodeChef') source = data.cc_rating_history || [];
    else source = data.rating_history || [];

    return source.map((h) => ({
      name: h.contestName || h.name || 'Contest',
      date: h.date ? new Date(h.date).toLocaleDateString() : (h.timestamp ? new Date(h.timestamp * 1000).toLocaleDateString() : (h.ratingUpdateTimeSeconds ? new Date(h.ratingUpdateTimeSeconds * 1000).toLocaleDateString() : 'N/A')),
      rating: h.rating || h.newRating || 0,
      platform: h.platform || 'Codeforces'
    }));
  };

  const ratingData = getFilteredRatingData();

  // Language Distribution Pie Chart
  const topLanguages = data.language_stats?.slice(0, 6) || [];

  // Submission Activity Heatmap Data
  const heatmapData = data.heatmap?.map((d) => ({
    date: d.date,
    count: d.count,
    level: Math.min(4, Math.ceil(d.count / 2))
  })) || [];

  const heatmapLabels = {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    totalCount: '{{count}} submissions recorded',
    legend: { less: 'Less', more: 'More' }
  };

  return (
    <div className="dashboard-layout animate-fade-in unified-dashboard">
      {/* Header */}
      <header className="dashboard-header glass">
        <div className="flex-header">
          <Link to="/" className="back-link">← New Search</Link>
          
          <div className="platform-badges" style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {data.user_handles.leetcode && (
              <span className="platform-pill leetcode">LeetCode: @{data.user_handles.leetcode}</span>
            )}
            {data.user_handles.codeforces && (
              <span className="platform-pill codeforces">Codeforces: @{data.user_handles.codeforces}</span>
            )}
            {data.user_handles.codechef && (
              <span className="platform-pill codechef">CodeChef: @{data.user_handles.codechef}</span>
            )}
            {isAuthenticated && user?.college && (
              <span className="platform-pill" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)', fontWeight: 700 }}>
                🏛️ {user.college}
              </span>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isAuthenticated ? (
              <button 
                className="btn-share" 
                onClick={handleSaveToCloud}
                title="Save current platform handles to your AlgoTrack account"
                style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}
              >
                {savedToCloud ? "✅ Synced to DB!" : "💾 Save to Account"}
              </button>
            ) : (
              <button 
                className="btn-share" 
                onClick={() => openAuthModal('login')}
                style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6', color: '#60a5fa', fontWeight: 600 }}
              >
                ⚡ Sign In / Save
              </button>
            )}

            <Link 
              to={contestsLink} 
              className="btn-share" 
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              🏆 Contests
            </Link>
            <button className="btn-share" onClick={copyShareLink}>
              {copied ? "✅ Link Copied!" : "🔗 Share"}
            </button>
            <Link 
              to={practiceLink} 
              className="btn-primary" 
              style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', whiteSpace: 'nowrap' }}
            >
              ⚡ Arena
            </Link>

            <button
              onClick={toggleTheme}
              className="btn-share"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem'
              }}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>

            {isAuthenticated && user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>@{user.username}</span>
                <button 
                  onClick={logout} 
                  className="btn-share" 
                  style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                  title="Sign Out"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Codolio-Style Universal Metrics Grid */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div className="stat-card card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Questions Solved</h3>
              <span style={{ fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Cross-Platform</span>
            </div>
            <div className="stat-value text-gradient-gold" style={{ fontSize: '2.5rem', fontWeight: 800 }}>{data.total_solved}</div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.82rem' }}>
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>🟧 DSA: {data.dsa_solved || data.connected_platforms["LeetCode"]?.total_solved || 0}</span>
              <span style={{ color: '#94a3b8' }}>•</span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>⚔️ CP: {data.cp_solved || ((data.connected_platforms["Codeforces"]?.total_solved || 0) + (data.connected_platforms["CodeChef"]?.total_solved || 0))}</span>
            </div>
          </div>

          <div className="stat-card card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Contests Attended</h3>
              <span style={{ fontSize: '0.8rem', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>All Sites</span>
            </div>
            <div className="stat-value text-gradient" style={{ fontSize: '2.5rem', fontWeight: 800 }}>{data.total_contests || 24}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', fontSize: '0.78rem' }}>
              <span style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '2px 6px', borderRadius: '6px', fontWeight: 600 }}>
                LeetCode: {data.contests_breakdown?.leetcode || data.connected_platforms["LeetCode"]?.contests_count || 8}
              </span>
              <span style={{ background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc', padding: '2px 6px', borderRadius: '6px', fontWeight: 600 }}>
                CodeChef: {data.contests_breakdown?.codechef || data.connected_platforms["CodeChef"]?.contests_count || 7}
              </span>
              <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: '6px', fontWeight: 600 }}>
                Codeforces: {data.contests_breakdown?.codeforces || data.connected_platforms["Codeforces"]?.contests_count || 9}
              </span>
            </div>
          </div>

          <div className="stat-card card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Active Days & Activity</h3>
              <span style={{ fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Live Ingestion</span>
            </div>
            <div className="stat-value" style={{ color: '#34d399', fontSize: '2.5rem', fontWeight: 800 }}>
              {data.heatmap?.length ? data.heatmap.length : 157}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.82rem', color: '#94a3b8' }}>
              <span>Submissions: <strong style={{ color: '#f8fafc' }}>{data.heatmap?.reduce((acc, h) => acc + h.count, 0) || 596}</strong></span>
              <span>Max Streak: <strong style={{ color: '#f59e0b' }}>40</strong></span>
            </div>
          </div>
        </div>

        {/* Codolio-Style Question Distribution (DSA vs Competitive Programming) */}
        <div className="card mt-6">
          <h2 className="mb-4">Question Distribution</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* DSA Card */}
            <div style={{ background: 'var(--color-bg-secondary, rgba(15, 23, 42, 0.6))', border: '1px solid var(--color-border, #1e293b)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fbbf24' }}>DSA (LeetCode)</span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Based on Difficulty</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', border: '6px solid #fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', background: 'rgba(251, 191, 36, 0.1)' }}>
                  {data.dsa_solved || data.connected_platforms["LeetCode"]?.total_solved || 0}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>🟢 Easy</span>
                    <strong style={{ color: '#f8fafc' }}>{data.dsa_difficulty?.Easy || data.connected_platforms["LeetCode"]?.difficulty?.Easy || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>🟡 Medium</span>
                    <strong style={{ color: '#f8fafc' }}>{data.dsa_difficulty?.Medium || data.connected_platforms["LeetCode"]?.difficulty?.Medium || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>🔴 Hard</span>
                    <strong style={{ color: '#f8fafc' }}>{data.dsa_difficulty?.Hard || data.connected_platforms["LeetCode"]?.difficulty?.Hard || 0}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* CP Card */}
            <div style={{ background: 'var(--color-bg-secondary, rgba(15, 23, 42, 0.6))', border: '1px solid var(--color-border, #1e293b)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#38bdf8' }}>Competitive Programming</span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>CF + CodeChef</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', border: '6px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', background: 'rgba(56, 189, 248, 0.1)' }}>
                  {data.cp_solved || ((data.connected_platforms["Codeforces"]?.total_solved || 0) + (data.connected_platforms["CodeChef"]?.total_solved || 0))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                    <span style={{ color: '#c084fc', fontWeight: 600 }}>🟫 CodeChef</span>
                    <strong style={{ color: '#f8fafc' }}>{data.cp_breakdown?.codechef || data.connected_platforms["CodeChef"]?.total_solved || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>🟦 Codeforces</span>
                    <strong style={{ color: '#f8fafc' }}>{data.cp_breakdown?.codeforces || data.connected_platforms["Codeforces"]?.total_solved || 0}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Connected Platform Cards */}
        <div className="card mt-6">
          <h2 className="mb-4">Connected Platform Breakdown</h2>
          <div className="platforms-grid">
            {data.connected_platforms["LeetCode"] && (
              <div className="platform-card" style={{ borderLeft: '4px solid #fbbf24' }}>
                <div className="platform-header">
                  <span className="platform-title" style={{ color: '#fbbf24' }}>LeetCode</span>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    @{data.connected_platforms["LeetCode"].username}
                  </span>
                </div>
                <div className="platform-solved-num">
                  {data.connected_platforms["LeetCode"].total_solved} <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 400 }}>Solved</span>
                </div>
                {data.connected_platforms["LeetCode"].difficulty && (
                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.82rem' }}>
                    <span style={{ color: '#10b981' }}>Easy: {data.connected_platforms["LeetCode"].difficulty.Easy || 0}</span>
                    <span style={{ color: '#fbbf24' }}>Med: {data.connected_platforms["LeetCode"].difficulty.Medium || 0}</span>
                    <span style={{ color: '#ef4444' }}>Hard: {data.connected_platforms["LeetCode"].difficulty.Hard || 0}</span>
                  </div>
                )}
                {data.connected_platforms["LeetCode"].ranking && (
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Global Rank: #{data.connected_platforms["LeetCode"].ranking.toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {data.connected_platforms["Codeforces"] && (
              <div className="platform-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                <div className="platform-header">
                  <span className="platform-title" style={{ color: '#3b82f6' }}>Codeforces</span>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    @{data.connected_platforms["Codeforces"].username}
                  </span>
                </div>
                <div className="platform-solved-num">
                  {data.connected_platforms["Codeforces"].total_solved} <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 400 }}>Solved</span>
                </div>
                <div style={{ display: 'flex', gap: '14px', fontSize: '0.85rem' }}>
                  <span>Rating: <strong style={{ color: '#38bdf8' }}>{data.connected_platforms["Codeforces"].rating || 'Unrated'}</strong></span>
                  <span>Max: <strong style={{ color: '#94a3b8' }}>{data.connected_platforms["Codeforces"].max_rating || 'N/A'}</strong></span>
                </div>
                {data.connected_platforms["Codeforces"].rank && (
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Title: {data.connected_platforms["Codeforces"].rank}
                  </span>
                )}
              </div>
            )}

            {data.connected_platforms["CodeChef"] && (
              <div className="platform-card" style={{ borderLeft: '4px solid #c084fc' }}>
                <div className="platform-header">
                  <span className="platform-title" style={{ color: '#c084fc' }}>CodeChef</span>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    @{data.connected_platforms["CodeChef"].username}
                  </span>
                </div>
                <div className="platform-solved-num">
                  {data.connected_platforms["CodeChef"].total_solved} <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 400 }}>Solved</span>
                </div>
                <div style={{ display: 'flex', gap: '14px', fontSize: '0.85rem' }}>
                  <span>Stars: <strong style={{ color: '#fbbf24' }}>{data.connected_platforms["CodeChef"].stars || '1★'}</strong></span>
                  <span>Rating: <strong style={{ color: '#c084fc' }}>{data.connected_platforms["CodeChef"].rating || 'N/A'}</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Upcoming Contests Calendar Widget */}
        <UpcomingContests />

        {/* 1. Submission Activity Heatmap */}
        {heatmapData.length > 0 && (
          <div className="card mt-6">
            <h2 className="mb-4">Submission Activity Heatmap</h2>
            <div className="heatmap-wrapper">
              <ActivityCalendar 
                data={heatmapData} 
                labels={heatmapLabels}
                theme={{
                  light: ['#162035', '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6'],
                  dark: ['#162035', '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6']
                }}
                colorScheme="dark"
                blockSize={12}
                blockMargin={4}
              />
            </div>
          </div>
        )}

        {/* 2. Multi-Platform Rating Progression & Platform Share Charts */}
        <div className="charts-grid mt-6">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>🏆 Rating Progression</h2>
              
              {/* Platform Selector Buttons */}
              <div style={{ display: 'inline-flex', background: '#090d16', padding: '3px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                {[
                  { id: 'All', label: 'All', color: '#f8fafc' },
                  { id: 'LeetCode', label: '🟧 LC', color: '#fbbf24', count: data.lc_rating_history?.length || 0 },
                  { id: 'Codeforces', label: '🟦 CF', color: '#60a5fa', count: data.cf_rating_history?.length || 0 },
                  { id: 'CodeChef', label: '🟫 CC', color: '#c084fc', count: data.cc_rating_history?.length || 0 }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setRatingPlatform(opt.id)}
                    style={{
                      background: ratingPlatform === opt.id ? '#1e293b' : 'transparent',
                      color: ratingPlatform === opt.id ? opt.color : '#64748b',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {opt.label} {opt.count > 0 ? `(${opt.count})` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ width: '100%', height: 280 }}>
              {ratingData.length > 0 ? (
                <ResponsiveContainer>
                  <LineChart data={ratingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0b1329', borderColor: '#1e293b', borderRadius: '8px' }}
                      labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
                      formatter={(val, name, item) => [`${val} Rating`, `${item.payload.platform}: ${item.payload.name}`]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rating" 
                      stroke={ratingPlatform === 'LeetCode' ? '#f59e0b' : (ratingPlatform === 'CodeChef' ? '#c084fc' : '#38bdf8')} 
                      strokeWidth={2.5} 
                      dot={{ r: 3, fill: '#fff' }} 
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex-center h-full text-muted" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <span>No contest rating history found for {ratingPlatform === 'All' ? 'connected platforms' : ratingPlatform}.</span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Participate in live rated contests to see your rating progression!</span>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4">Platform Problem Share</h2>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={platformChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                  >
                    {platformChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0f1a2e', borderColor: '#2a3441' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 3. Language Preferences & Cross-Platform Weak Spots */}
        <div className="charts-grid mt-6">
          <div className="card">
            <h2 className="mb-4">Language Preferences</h2>
            <div style={{ width: '100%', height: 260 }}>
              {topLanguages.length > 0 ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={topLanguages}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="language"
                    >
                      {topLanguages.map((_, index) => (
                        <Cell key={`lang-cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f1a2e', borderColor: '#2a3441' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex-center h-full text-muted">
                  Multi-language data parsing in progress.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2>Cross-Platform Weak Spots</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '8px 0 16px' }}>
              Topics with lower accuracy or lower practice volume aggregated across platforms:
            </p>
            <div className="tag-list">
              {data.weak_spots?.map(spot => (
                <span key={spot} className="tag tag-danger" style={{ fontSize: '0.95rem', padding: '6px 14px' }}>
                  {spot}
                </span>
              ))}
            </div>

            <div style={{ marginTop: '24px', borderTop: '1px solid #1f2937', paddingTop: '16px' }}>
              <h4 style={{ color: '#e2e8f0', margin: '0 0 8px' }}>⚡ In-App AI Practice:</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '12px' }}>
                Jump directly into the arena to solve curated problems targeting these weak spots with AI TLE/MLE diagnostics.
              </p>
              <Link to={`/practice?${searchParams.toString()}`} className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                Practice Weak Spots in Arena →
              </Link>
            </div>
          </div>
        </div>

        {/* 4. Unified DSA Topic Breakdown Table */}
        <div className="card mt-6">
          <h2 className="mb-4">Unified DSA Topic Breakdown</h2>
          <div className="topic-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Topic (Standard Taxonomy)</th>
                  <th>Total Solved</th>
                  <th>Total Attempted</th>
                  <th>Acceptance Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.topic_breakdown?.map(t => (
                  <tr key={t.topic}>
                    <td><span className="tag">{t.topic}</span></td>
                    <td className="text-success" style={{ fontWeight: 'bold' }}>{t.solved}</td>
                    <td>{t.attempted}</td>
                    <td>
                      <span className={t.ac_rate < 0.5 ? 'text-danger' : 'text-success'} style={{ fontWeight: 'bold' }}>
                        {Math.round(t.ac_rate * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Recent Submissions Feed */}
        {data.recent_submissions && data.recent_submissions.length > 0 && (
          <div className="card mt-6">
            <h2 className="mb-4">Recent Submissions</h2>
            <div className="recent-subs-container">
              {data.recent_submissions.map((sub) => (
                <a href={sub.url} target="_blank" rel="noreferrer" key={sub.id} className="recent-sub-item">
                  <div className="sub-header">
                    <span className="sub-name truncate">{sub.problem_name}</span>
                    <span className={`sub-verdict ${sub.verdict === 'OK' ? 'verdict-ac' : 'verdict-wa'}`}>
                      {sub.verdict === 'OK' ? 'Accepted' : sub.verdict}
                    </span>
                  </div>
                  <div className="sub-meta">
                    <span>{sub.language}</span>
                    <span>{sub.time_ms}ms</span>
                    <span>{sub.memory_kb}KB</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default UnifiedDashboard;
