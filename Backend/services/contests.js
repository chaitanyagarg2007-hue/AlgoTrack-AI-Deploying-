import axios from 'axios';

export async function fetchUpcomingContests(daysAhead = 7) {
  const nowTs = Math.floor(Date.now() / 1000);
  const maxTs = nowTs + daysAhead * 86400;
  const contests = [];

  // 1. Fetch from Codeforces API
  try {
    const cfRes = await axios.get('https://codeforces.com/api/contest.list?gym=false', { timeout: 8000 });
    if (cfRes.data?.status === 'OK') {
      const list = cfRes.data.result || [];
      for (const c of list) {
        const startTs = c.startTimeSeconds;
        if (c.phase === 'BEFORE' && startTs >= nowTs && startTs <= maxTs) {
          const durationSecs = c.durationSeconds || 7200;
          const hrs = Math.floor(durationSecs / 3600);
          const mins = Math.floor((durationSecs % 3600) / 60);
          const durStr = mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;

          contests.push({
            id: `cf-${c.id}`,
            name: c.name,
            platform: 'Codeforces',
            url: `https://codeforces.com/contests/${c.id}`,
            start_time_unix: startTs,
            start_time_iso: new Date(startTs * 1000).toISOString(),
            duration_seconds: durationSecs,
            duration_str: durStr
          });
        }
      }
    }
  } catch (err) {
    console.warn('CF contests fetch error:', err.message);
  }

  // 2. Fetch from Kontests API (LeetCode, AtCoder, CodeChef)
  try {
    const kRes = await axios.get('https://kontests.net/api/v1/all', { timeout: 8000 });
    if (Array.isArray(kRes.data)) {
      for (const c of kRes.data) {
        if (!c.start_time) continue;
        const startTs = Math.floor(new Date(c.start_time).getTime() / 1000);
        if (startTs >= nowTs && startTs <= maxTs) {
          let platform = c.site || 'Other';
          if (platform.toLowerCase().includes('leet')) platform = 'LeetCode';
          else if (platform.toLowerCase().includes('codeforces')) platform = 'Codeforces';
          else if (platform.toLowerCase().includes('codechef')) platform = 'CodeChef';
          else if (platform.toLowerCase().includes('atcoder')) platform = 'AtCoder';

          // Avoid duplicating CF contests
          if (platform === 'Codeforces') continue;

          const durationSecs = parseInt(c.duration || 7200, 10);
          const hrs = Math.floor(durationSecs / 3600);
          const mins = Math.floor((durationSecs % 3600) / 60);
          const durStr = mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;

          contests.push({
            id: `k-${platform.toLowerCase()}-${startTs}`,
            name: c.name,
            platform,
            url: c.url,
            start_time_unix: startTs,
            start_time_iso: new Date(startTs * 1000).toISOString(),
            duration_seconds: durationSecs,
            duration_str: durStr
          });
        }
      }
    }
  } catch (err) {
    console.warn('Kontests API fetch error:', err.message);
  }

  // Sort chronologically by start time
  contests.sort((a, b) => a.start_time_unix - b.start_time_unix);
  return contests;
}
