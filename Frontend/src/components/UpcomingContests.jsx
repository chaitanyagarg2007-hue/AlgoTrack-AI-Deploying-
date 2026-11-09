import React, { useState, useEffect } from 'react';
import { api } from '../lib/api/client';
import './UpcomingContests.css';

export const UpcomingContests = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [daysWindow, setDaysWindow] = useState(7);
  const [platformFilter, setPlatformFilter] = useState('All');

  useEffect(() => {
    const fetchContests = async () => {
      try {
        setLoading(true);
        setError('');
        const resp = await api.get(`/upcoming-contests?days=${daysWindow}`);
        setContests(resp.data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch upcoming contests. Check if backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, [daysWindow]);

  const PLATFORMS = ['All', 'Codeforces', 'LeetCode', 'CodeChef', 'AtCoder'];

  // Filtered by platform
  const filteredContests = platformFilter === 'All'
    ? contests
    : contests.filter(c => c.platform.toLowerCase() === platformFilter.toLowerCase());

  // Helper to format Google Calendar URL
  const getGoogleCalendarUrl = (contest) => {
    const startDate = new Date(contest.start_time_unix * 1000);
    const endDate = new Date((contest.start_time_unix + (contest.duration_seconds || 7200)) * 1000);
    
    const formatGCalTime = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${contest.platform}: ${contest.name}`,
      dates: `${formatGCalTime(startDate)}/${formatGCalTime(endDate)}`,
      details: `Live Contest on ${contest.platform}.\nLink: ${contest.url}`,
      location: contest.platform
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <section className="contests-section card mt-6">
      {/* Header & Time Window Selection */}
      <div className="contests-header">
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏆 Upcoming Contests Calendar
            <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              ⚡ Real-time Dynamic
            </span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0' }}>
            Live schedule for Codeforces, LeetCode, CodeChef & AtCoder rounds.
          </p>
        </div>

        {/* Time Window Buttons */}
        <div style={{ display: 'flex', gap: '6px', background: '#09090b', padding: '3px', borderRadius: '8px', border: '1px solid #27272a' }}>
          {[
            { label: 'Next 4 Days', value: 4 },
            { label: 'Next 7 Days (1 Wk)', value: 7 },
            { label: 'Next 14 Days', value: 14 }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setDaysWindow(opt.value)}
              style={{
                background: daysWindow === opt.value ? '#3b82f6' : 'transparent',
                color: daysWindow === opt.value ? '#fff' : '#a1a1aa',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform Filter Bar */}
      <div className="contests-filter-bar">
        {PLATFORMS.map(p => (
          <button
            key={p}
            onClick={() => setPlatformFilter(p)}
            className={`filter-pill-btn ${platformFilter === p ? 'active' : ''}`}
          >
            {p === 'Codeforces' && '🟦 '}
            {p === 'LeetCode' && '🟧 '}
            {p === 'CodeChef' && '🟫 '}
            {p === 'AtCoder' && '🔴 '}
            {p}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
          <p>Fetching dynamically updated upcoming contests...</p>
        </div>
      ) : error ? (
        <div style={{ color: '#f87171', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
          {error}
        </div>
      ) : filteredContests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#71717a' }}>
          No contests found for this platform in the next {daysWindow} days.
        </div>
      ) : (
        <div className="contests-grid">
          {filteredContests.map(c => {
            const startDate = new Date(c.start_time_unix * 1000);
            const dateStr = startDate.toLocaleDateString(undefined, { 
              weekday: 'short', month: 'short', day: 'numeric' 
            });
            const timeStr = startDate.toLocaleTimeString(undefined, { 
              hour: '2-digit', minute: '2-digit' 
            });

            const platformClass = c.platform.toLowerCase();

            return (
              <div key={c.id} className="contest-card">
                <div>
                  <div className="contest-top-row">
                    <span className={`platform-tag ${platformClass}`}>
                      {c.platform}
                    </span>
                    <span className="starts-in-badge">
                      ⏱️ {c.starts_in}
                    </span>
                  </div>

                  <h3 className="contest-name">{c.name}</h3>
                </div>

                <div className="contest-time-info">
                  <div>
                    📅 <strong>{dateStr}</strong> at <strong>{timeStr}</strong>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    Duration: {c.duration_str}
                  </div>
                </div>

                <div className="contest-actions">
                  <a 
                    href={c.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn-contest-link"
                  >
                    🔗 Go to Contest →
                  </a>
                  <a 
                    href={getGoogleCalendarUrl(c)} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn-cal"
                    title="Add reminder to Google Calendar"
                  >
                    📅 Remind
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
