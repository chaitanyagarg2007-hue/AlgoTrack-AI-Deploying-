import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAuthStore } from '../../store/authStore';
import { getLeaderboard, getCollegeSummary } from '../../lib/api/leaderboard';
import './LeaderboardPage.css';

const COLLEGE_TABS = ['All', 'NSUT', 'DTU', 'IIIT Delhi', 'IGDTUW', 'IIT Delhi', 'BITS Pilani', 'Other'];
const SORT_OPTIONS = [
  { key: 'total_solved', label: '🌟 Most Solved' },
  { key: 'cf_rating', label: '🟦 CF Rating' },
  { key: 'lc_solved', label: '🟧 LC Solved' },
];

const AVATAR_COLORS = [
  'linear-gradient(135deg, #3b82f6, #8b5cf6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #ec4899, #f43f5e)',
  'linear-gradient(135deg, #6366f1, #a855f7)',
  'linear-gradient(135deg, #14b8a6, #22d3ee)',
];

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

const LeaderboardPage = () => {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();

  const [collegeFilter, setCollegeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('total_solved');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [leaderboard, setLeaderboard] = useState([]);
  const [collegeSummary, setCollegeSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch college summary once
  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const data = await getCollegeSummary();
        setCollegeSummary(data);
      } catch (err) {
        console.warn('Could not load college summary:', err);
      }
    };
    fetchColleges();
  }, []);

  // Fetch leaderboard whenever filters change
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError('');
        const params = {
          sort_by: sortBy,
          page: 1,
          limit: 50,
        };
        if (collegeFilter !== 'All') params.college = collegeFilter;
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

        const data = await getLeaderboard(params);
        setLeaderboard(data.results || []);
      } catch (err) {
        console.error('Leaderboard fetch error:', err);
        setError('Failed to load leaderboard. Make sure backend is running.');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [collegeFilter, sortBy, debouncedSearch]);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getProfileLink = (coder) => {
    const params = new URLSearchParams();
    if (coder.lc_handle) params.append('lc', coder.lc_handle);
    if (coder.cf_handle) params.append('cf', coder.cf_handle);
    if (coder.cc_handle) params.append('cc', coder.cc_handle);
    const q = params.toString();
    return q ? `/profile?${q}` : `/profile?cf=${coder.username}`;
  };

  const getAvatarColor = (id) => AVATAR_COLORS[id % AVATAR_COLORS.length];

  return (
    <div className="leaderboard-wrapper">
      <Navbar />

      <div className="leaderboard-container">
        {/* Hero */}
        <div className="lb-hero">
          <h1>🏆 College Leaderboard</h1>
          <p>
            Real-time rankings across NSUT, DTU, IIIT Delhi & more — powered by LeetCode + Codeforces + CodeChef stats.
          </p>
        </div>

        {/* College Summary Cards */}
        {collegeSummary.length > 0 && (
          <div className="college-summary-grid">
            {collegeSummary.map((c) => (
              <div
                key={c.college}
                className={`college-summary-card ${collegeFilter === c.college ? 'active' : ''}`}
                onClick={() => setCollegeFilter(collegeFilter === c.college ? 'All' : c.college)}
              >
                <div className="csc-name">🏛️ {c.college}</div>
                <div className="csc-stats">
                  <div className="csc-stat">
                    <span className="csc-stat-label">Coders</span>
                    <span className="csc-stat-value">{c.total_coders}</span>
                  </div>
                  <div className="csc-stat">
                    <span className="csc-stat-label">Total Solved</span>
                    <span className="csc-stat-value">{c.total_solved.toLocaleString()}</span>
                  </div>
                  <div className="csc-stat">
                    <span className="csc-stat-label">Avg CF Rating</span>
                    <span className="csc-stat-value">{c.avg_cf_rating || '—'}</span>
                  </div>
                </div>
                {c.top_coder && (
                  <div className="csc-top-coder">
                    👑 Top: <strong>{c.top_coder}</strong> ({c.top_coder_solved} solved)
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Filter Bar */}
        <div className="lb-filter-bar">
          {/* College Tabs */}
          <div className="lb-college-tabs">
            {COLLEGE_TABS.map((tab) => (
              <button
                key={tab}
                className={`lb-tab ${collegeFilter === tab ? 'active' : ''}`}
                onClick={() => setCollegeFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            className="lb-search-input"
            placeholder="🔍 Search by name or handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Sort Tabs */}
          <div className="lb-sort-tabs">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                className={`lb-tab ${sortBy === opt.key ? 'active' : ''}`}
                onClick={() => setSortBy(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="lb-loading">
            <div className="spinner"></div>
            <p>Loading leaderboard...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="lb-empty">
            <div className="lb-empty-icon">⚠️</div>
            <h3>Oops! Could not load leaderboard</h3>
            <p>{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && leaderboard.length === 0 && (
          <div className="lb-empty">
            <div className="lb-empty-icon">🚀</div>
            <h3>
              {collegeFilter !== 'All'
                ? `No coders from ${collegeFilter} yet!`
                : 'The leaderboard is empty!'}
            </h3>
            <p>
              {collegeFilter !== 'All'
                ? `Be the first coder from ${collegeFilter} to claim the #1 spot.`
                : 'Sign up, link your coding handles, and be the first to claim Rank #1!'}
            </p>
            {!isAuthenticated ? (
              <button className="lb-empty-cta" onClick={() => openAuthModal('register')}>
                ⚡ Sign Up & Claim #1
              </button>
            ) : (
              <Link to="/" className="lb-empty-cta">
                🔗 Link Your Handles
              </Link>
            )}
          </div>
        )}

        {/* Leaderboard Table */}
        {!loading && !error && leaderboard.length > 0 && (
          <div className="lb-table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                  <th>Coder</th>
                  <th>College</th>
                  <th style={{ textAlign: 'center' }}>LC Solved</th>
                  <th style={{ textAlign: 'center' }}>CF Rating</th>
                  <th style={{ textAlign: 'center' }}>CC Solved</th>
                  <th style={{ textAlign: 'center' }}>Total Solved</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((coder) => (
                  <tr
                    key={coder.id}
                    style={
                      isAuthenticated && user && coder.id === user.id
                        ? { background: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid #3b82f6' }
                        : {}
                    }
                  >
                    {/* Rank */}
                    <td className={`lb-rank ${coder.rank <= 3 ? `lb-rank-${coder.rank}` : ''}`}>
                      {MEDAL[coder.rank] || `#${coder.rank}`}
                    </td>

                    {/* User */}
                    <td>
                      <div className="lb-user-cell">
                        <div
                          className="lb-avatar"
                          style={{ background: getAvatarColor(coder.id) }}
                        >
                          {getInitials(coder.full_name)}
                        </div>
                        <div className="lb-user-info">
                          <span className="lb-user-name">
                            {coder.full_name}
                            {isAuthenticated && user && coder.id === user.id && (
                              <span style={{ color: '#60a5fa', fontSize: '0.75rem', marginLeft: '6px' }}>(You)</span>
                            )}
                          </span>
                          <span className="lb-user-handle">@{coder.username}</span>
                        </div>
                      </div>
                    </td>

                    {/* College */}
                    <td>
                      <span className="lb-college-pill">🏛️ {coder.college}</span>
                    </td>

                    {/* LC Solved */}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`lb-stat-highlight ${coder.lc_solved > 0 ? 'lb-stat-lc' : ''}`}>
                        {coder.lc_solved || '—'}
                      </span>
                    </td>

                    {/* CF Rating */}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`lb-stat-highlight ${coder.cf_rating > 0 ? 'lb-stat-cf' : ''}`}>
                        {coder.cf_rating || '—'}
                      </span>
                    </td>

                    {/* CC Solved */}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`lb-stat-highlight ${coder.cc_solved > 0 ? 'lb-stat-cc' : ''}`}>
                        {coder.cc_solved || '—'}
                      </span>
                    </td>

                    {/* Total Solved */}
                    <td style={{ textAlign: 'center' }}>
                      <span className="lb-stat-highlight lb-stat-total">
                        {coder.total_solved}
                      </span>
                    </td>

                    {/* View Profile */}
                    <td>
                      <Link to={getProfileLink(coder)} className="lb-view-btn">
                        View Analytics →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
