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
import './Dashboard.css';
import './UnifiedDashboard.css';

const UnifiedDashboard = () => {
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, openAuthModal, logout } = useAuthStore();
  const [savedToCloud, setSavedToCloud] = useState(false);
  
  // Retrieve from query params or localStorage
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

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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

  // Rating Progression Line Chart
  const ratingData = data.rating_history?.map((h) => ({
    name: h.contestName,
    date: new Date(h.ratingUpdateTimeSeconds * 1000).toLocaleDateString(),
    rating: h.newRating
  })) || [];

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
        {/* KPI Summary Cards */}
        <div className="stats-grid">
          <div className="stat-card card">
            <h3>Total Cross-Platform Solved</h3>
            <div className="stat-value text-gradient-gold">{data.total_solved}</div>
            <div className="stat-label">Combined Across Platforms</div>
          </div>
          <div className="stat-card card">
            <h3>Connected Platforms</h3>
            <div className="stat-value text-gradient">{Object.keys(data.connected_platforms).length}</div>
            <div className="stat-label">Live Parallel Ingestion</div>
          </div>
          <div className="stat-card card">
            <h3>Identified Weak Spots</h3>
            <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{data.weak_spots?.length || 0}</div>
            <div className="stat-label">Areas to improve</div>
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

        {/* 2. Rating Progression & Platform Share Charts */}
        <div className="charts-grid mt-6">
          <div className="card">
            <h2 className="mb-4">Rating Progression</h2>
            <div style={{ width: '100%', height: 280 }}>
              {ratingData.length > 0 ? (
                <ResponsiveContainer>
                  <LineChart data={ratingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3441" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f1a2e', borderColor: '#2a3441' }}
                      labelStyle={{ color: '#f0f4ff' }}
                    />
                    <Line type="monotone" dataKey="rating" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex-center h-full text-muted">
                  No contest rating history recorded yet.
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
