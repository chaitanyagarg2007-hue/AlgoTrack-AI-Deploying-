import axios from 'axios';

function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

/**
 * Generates regular scheduled LeetCode & CodeChef rounds dynamically
 * as a guaranteed fallback if live third-party network APIs timeout.
 */
function getScheduledRounds(nowTs, maxTs) {
  const fallback = [];

  // Iterate day by day in the window
  const now = new Date(nowTs * 1000);
  const end = new Date(maxTs * 1000);

  for (let d = new Date(now); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getUTCDay(); // 0: Sun, 1: Mon, ..., 3: Wed, 6: Sat

    // 1. LeetCode Weekly Contest: Every Sunday at 02:30 UTC (08:00 AM IST)
    if (dayOfWeek === 0) {
      const contestTime = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 2, 30, 0));
      const ts = Math.floor(contestTime.getTime() / 1000);
      if (ts >= nowTs && ts <= maxTs) {
        fallback.push({
          id: `lc-weekly-sched-${ts}`,
          name: 'LeetCode Weekly Contest',
          platform: 'LeetCode',
          url: 'https://leetcode.com/contest',
          start_time_unix: ts,
          start_time_iso: contestTime.toISOString(),
          duration_seconds: 5400,
          duration_str: '1h 30m'
        });
      }
    }

    // 2. LeetCode Biweekly Contest: Saturday at 14:30 UTC (08:00 PM IST)
    if (dayOfWeek === 6) {
      const contestTime = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 14, 30, 0));
      const ts = Math.floor(contestTime.getTime() / 1000);
      if (ts >= nowTs && ts <= maxTs) {
        fallback.push({
          id: `lc-biweekly-sched-${ts}`,
          name: 'LeetCode Biweekly Contest',
          platform: 'LeetCode',
          url: 'https://leetcode.com/contest',
          start_time_unix: ts,
          start_time_iso: contestTime.toISOString(),
          duration_seconds: 5400,
          duration_str: '1h 30m'
        });
      }
    }

    // 3. CodeChef Starters: Every Wednesday at 14:30 UTC (08:00 PM IST)
    if (dayOfWeek === 3) {
      const contestTime = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 14, 30, 0));
      const ts = Math.floor(contestTime.getTime() / 1000);
      if (ts >= nowTs && ts <= maxTs) {
        fallback.push({
          id: `cc-starters-sched-${ts}`,
          name: 'CodeChef Starters (Rated for Div 1, 2, 3, 4)',
          platform: 'CodeChef',
          url: 'https://www.codechef.com/contests',
          start_time_unix: ts,
          start_time_iso: contestTime.toISOString(),
          duration_seconds: 7200,
          duration_str: '2h'
        });
      }
    }
  }

  return fallback;
}

export async function fetchUpcomingContests(daysAhead = 7) {
  const nowTs = Math.floor(Date.now() / 1000);
  const maxTs = nowTs + daysAhead * 86400;
  const contests = [];
  let hasLeetCode = false;
  let hasCodeChef = false;

  // 1. Fetch Codeforces Contests (Official REST API)
  try {
    const cfRes = await axios.get('https://codeforces.com/api/contest.list?gym=false', { timeout: 8000 });
    if (cfRes.data?.status === 'OK') {
      const list = cfRes.data.result || [];
      for (const c of list) {
        const startTs = c.startTimeSeconds;
        if (c.phase === 'BEFORE' && startTs >= nowTs && startTs <= maxTs) {
          const durationSecs = c.durationSeconds || 7200;
          contests.push({
            id: `cf-${c.id}`,
            name: c.name,
            platform: 'Codeforces',
            url: `https://codeforces.com/contests/${c.id}`,
            start_time_unix: startTs,
            start_time_iso: new Date(startTs * 1000).toISOString(),
            duration_seconds: durationSecs,
            duration_str: formatDuration(durationSecs)
          });
        }
      }
    }
  } catch (err) {
    console.warn('Codeforces contests fetch warning:', err.message);
  }

  // 2. Fetch LeetCode Contests (Official LeetCode GraphQL API)
  try {
    const lcRes = await axios.post(
      'https://leetcode.com/graphql',
      { query: 'query { upcomingContests { title titleSlug startTime duration } }' },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        timeout: 8000
      }
    );

    const lcList = lcRes.data?.data?.upcomingContests || [];
    for (const c of lcList) {
      if (!c.startTime) continue;
      const startTs = c.startTime;
      if (startTs >= nowTs && startTs <= maxTs) {
        hasLeetCode = true;
        const durationSecs = c.duration || 5400;
        contests.push({
          id: `lc-${c.titleSlug || startTs}`,
          name: c.title || 'LeetCode Contest',
          platform: 'LeetCode',
          url: `https://leetcode.com/contest/${c.titleSlug || ''}`,
          start_time_unix: startTs,
          start_time_iso: new Date(startTs * 1000).toISOString(),
          duration_seconds: durationSecs,
          duration_str: formatDuration(durationSecs)
        });
      }
    }
  } catch (err) {
    console.warn('LeetCode GraphQL contest fetch warning:', err.message);
  }

  // 3. Fetch CodeChef Contests (Official CodeChef REST API)
  try {
    const ccRes = await axios.get(
      'https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        timeout: 8000
      }
    );

    const ccList = ccRes.data?.future_contests || [];
    for (const c of ccList) {
      const dateStr = c.contest_start_date_iso || c.contest_start_date;
      if (!dateStr) continue;
      const startTs = Math.floor(new Date(dateStr).getTime() / 1000);
      if (startTs >= nowTs && startTs <= maxTs) {
        hasCodeChef = true;
        const durationSecs = (parseInt(c.contest_duration || '120', 10)) * 60;
        contests.push({
          id: `cc-${c.contest_code || startTs}`,
          name: c.contest_name || 'CodeChef Contest',
          platform: 'CodeChef',
          url: `https://www.codechef.com/${c.contest_code || ''}`,
          start_time_unix: startTs,
          start_time_iso: new Date(startTs * 1000).toISOString(),
          duration_seconds: durationSecs,
          duration_str: formatDuration(durationSecs)
        });
      }
    }
  } catch (err) {
    console.warn('CodeChef contest fetch warning:', err.message);
  }

  // 4. Guaranteed Fallback: If LC or CC were not populated (network or rate limits), inject official scheduled rounds
  const scheduled = getScheduledRounds(nowTs, maxTs);
  for (const s of scheduled) {
    if (s.platform === 'LeetCode' && !hasLeetCode) {
      contests.push(s);
    } else if (s.platform === 'CodeChef' && !hasCodeChef) {
      contests.push(s);
    }
  }

  // Sort chronologically by start time
  contests.sort((a, b) => a.start_time_unix - b.start_time_unix);
  return contests;
}
