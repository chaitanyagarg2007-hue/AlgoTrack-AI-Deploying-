import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api/client';
import { ActivityCalendar } from 'react-activity-calendar';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import './Dashboard.css';

const DashboardPage = () => {
  const { handle } = useParams();
  const [summary, setSummary] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const sumResp = await api.get(`/analyze/${handle}`);
        setSummary(sumResp.data);
        
        const recResp = await api.get(`/recommendations/${handle}`);
        setRecommendations(recResp.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    
    if (handle) {
      fetchData();
    }
  }, [handle]);

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Analyzing profile for {handle}... This might take a few seconds.</p>
    </div>
  );
  
  if (error) return (
    <div className="error-container">
      <h2>Error</h2>
      <p className="text-danger">{error}</p>
      <Link to="/" className="btn-primary mt-4 inline-block">Go Back</Link>
    </div>
  );
  
  if (!summary) return null;

  // Format rating history for chart
  const ratingData = summary.rating_history?.map((h) => ({
    name: h.contestName,
    date: new Date(h.ratingUpdateTimeSeconds * 1000).toLocaleDateString(),
    rating: h.newRating
  })) || [];

  // Format languages for pie chart
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
  const topLanguages = summary.language_stats?.slice(0, 5) || [];

  // Format heatmap data
  const heatmapData = summary.heatmap?.map((d) => ({
    date: d.date,
    count: d.count,
    level: Math.min(4, Math.ceil(d.count / 2)) // simple level calculation
  })) || [];
  
  const heatmapLabels = {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    totalCount: '{{count}} submissions in the last year',
    legend: {
      less: 'Less',
      more: 'More'
    }
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      <header className="dashboard-header glass">
        <div className="flex-header">
          <Link to="/" className="back-link">← New Search</Link>
          <div className="user-info">
             {summary.avatar && <img src={summary.avatar} alt="avatar" className="avatar" />}
             <h1>{summary.handle}</h1>
          </div>
          <Link to="/practice" className="btn-primary" style={{ textDecoration: 'none', marginLeft: 'auto', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', padding: '8px 16px', fontSize: '0.9rem' }}>
            ⚡ Solve Questions In-App
          </Link>
        </div>
      </header>
      
      <main className="dashboard-main">
        <div className="stats-grid">
          <div className="stat-card card">
            <h3>Total Solved</h3>
            <div className="stat-value text-gradient-gold">{summary.total_solved}</div>
          </div>
          <div className="stat-card card">
            <h3>Current Rating</h3>
            <div className="stat-value text-gradient">{summary.rating || 'Unrated'}</div>
            <div className="stat-label">Max: {summary.max_rating || 'N/A'}</div>
          </div>
          <div className="stat-card card">
            <h3>Identified Weaknesses</h3>
            <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{summary.weak_topics.length}</div>
            <div className="stat-label">Tags to improve</div>
          </div>
        </div>

        {/* Heatmap Section */}
        <div className="card mt-6">
          <h2 className="mb-4">Submission Activity</h2>
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

        {/* Charts Row */}
        <div className="charts-grid mt-6">
           <div className="card">
              <h2 className="mb-4">Rating Progression</h2>
              <div style={{ width: '100%', height: 300 }}>
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
                  <div className="flex-center h-full text-muted">No rating history available.</div>
                )}
              </div>
           </div>

           <div className="card">
              <h2 className="mb-4">Language Preferences</h2>
              <div style={{ width: '100%', height: 300 }}>
                {topLanguages.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={topLanguages}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="language"
                      >
                        {topLanguages.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f1a2e', borderColor: '#2a3441' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex-center h-full text-muted">No language data available.</div>
                )}
              </div>
           </div>
        </div>

        {/* Bottom Grid: Topics, Submissions, Recommendations */}
        <div className="content-grid mt-6">
           <div className="flex-column gap-6">
             <div className="card">
                <h2>Weak Topics</h2>
                {summary.weak_topics.length > 0 ? (
                   <div className="tag-list">
                      {summary.weak_topics.map((topic) => (
                         <span key={topic} className="tag tag-danger">{topic}</span>
                      ))}
                   </div>
                ) : (
                   <p className="text-muted mt-2">No obvious weaknesses detected yet.</p>
                )}
             </div>

             <div className="card flex-1">
                <h2 className="mb-4">Topic Breakdown</h2>
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
                      {summary.topic_breakdown?.slice(0, 15).map((t) => (
                        <tr key={t.topic}>
                          <td><span className="tag">{t.topic}</span></td>
                          <td className="text-success">{t.solved}</td>
                          <td>{t.attempted}</td>
                          <td>
                             <span className={t.ac_rate < 0.4 ? 'text-danger' : (t.ac_rate > 0.8 ? 'text-success' : '')}>
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

           <div className="flex-column gap-6">
             <div className="recommendations-section card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                   <h2 style={{ margin: 0 }}>Personalized Recommendations</h2>
                   <Link to="/practice" style={{ color: '#a78bfa', fontSize: '0.88rem', textDecoration: 'none', fontWeight: 600 }}>
                      ⚡ Practice in Arena →
                   </Link>
                </div>
                {recommendations.length > 0 ? (
                   <div className="rec-list">
                      {recommendations.map(rec => (
                         <a href={rec.url} target="_blank" rel="noreferrer" key={rec.id} className="rec-item">
                            <div className="rec-title">{rec.name} <span className="rec-rating">{rec.rating}</span></div>
                            <div className="rec-reason">{rec.reason}</div>
                            <div className="rec-tags mt-2">
                               {rec.tags.slice(0,3).map((tag) => (
                                 <span key={tag} className="tag text-xs">{tag}</span>
                               ))}
                            </div>
                         </a>
                      ))}
                   </div>
                ) : (
                   <p className="text-muted mt-2">No recommendations generated.</p>
                )}
             </div>

             <div className="card">
                <h2 className="mb-4">Recent Submissions</h2>
                <div className="recent-subs-container">
                  {summary.recent_submissions?.map((sub) => (
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
           </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
