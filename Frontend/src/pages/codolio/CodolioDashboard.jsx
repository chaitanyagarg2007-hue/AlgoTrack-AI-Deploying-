import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api/client';
import '../dashboard/Dashboard.css';

const CodolioDashboard = () => {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCodolio = async () => {
      try {
        setLoading(true);
        const resp = await api.get(`/codolio/${username}`);
        setData(resp.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || 'Failed to fetch Codolio / multi-platform profile.');
      } finally {
        setLoading(false);
      }
    };
    if (username) fetchCodolio();
  }, [username]);

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Aggregating multi-platform data (LeetCode, Codeforces, CodeChef) for {username}...</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <h2>Profile Fetch Error</h2>
      <p className="text-danger">{error}</p>
      <Link to="/" className="btn-primary mt-4 inline-block">Go Back</Link>
    </div>
  );

  if (!data) return null;

  return (
    <div className="dashboard-layout animate-fade-in">
      <header className="dashboard-header glass">
        <div className="flex-header">
          <Link to="/" className="back-link">← New Search</Link>
          <div className="user-info">
            <h1>{data.username} <span style={{ fontSize: '0.8rem', color: '#a78bfa' }}>({data.source})</span></h1>
          </div>
          <Link to="/practice" className="btn-primary" style={{ textDecoration: 'none', marginLeft: 'auto' }}>
            ⚡ Open Practice Arena
          </Link>
        </div>
      </header>

      <main className="dashboard-main">
        {/* KPI Cards */}
        <div className="stats-grid">
          <div className="stat-card card">
            <h3>Total Solved Across Platforms</h3>
            <div className="stat-value text-gradient-gold">{data.total_solved}</div>
          </div>
          <div className="stat-card card">
            <h3>Connected Platforms</h3>
            <div className="stat-value text-gradient">{Object.keys(data.platforms || {}).length}</div>
            <div className="stat-label">LeetCode, CF, CodeChef, etc.</div>
          </div>
          <div className="stat-card card">
            <h3>Weak Spots Detected</h3>
            <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{data.weak_topics?.length || 0}</div>
            <div className="stat-label">Requires targeted practice</div>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="card mt-6">
          <h2 className="mb-4">Platform-wise Solved Problems</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {Object.entries(data.platforms || {}).map(([platform, count]) => (
              <div key={platform} style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{platform}</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Weak Topics & Practice Recommendations */}
        <div className="content-grid mt-6">
          <div className="card">
            <h2>Identified Weak Spots Across Platforms</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '8px 0 16px' }}>
              Topics with low accuracy or low solved count across platforms:
            </p>
            <div className="tag-list">
              {data.weak_topics?.map(topic => (
                <span key={topic} className="tag tag-danger" style={{ fontSize: '0.95rem', padding: '6px 14px' }}>
                  {topic}
                </span>
              ))}
            </div>

            <div style={{ marginTop: '24px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
              <h3>🎯 Targeted Practice:</h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.88rem', margin: '6px 0 14px' }}>
                Practice questions specifically tailored to these weak topics directly in AlgoTrack:
              </p>
              <Link to="/practice" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                Solve Weak Spot Problems Now →
              </Link>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4">Unified Topic Breakdown</h2>
            <div className="topic-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Solved</th>
                    <th>Attempted</th>
                    <th>AC Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topic_breakdown?.map(t => (
                    <tr key={t.topic}>
                      <td><span className="tag">{t.topic}</span></td>
                      <td className="text-success">{t.solved}</td>
                      <td>{t.attempted}</td>
                      <td>
                        <span className={t.ac_rate < 0.5 ? 'text-danger' : 'text-success'}>
                          {Math.round(t.ac_rate * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CodolioDashboard;
