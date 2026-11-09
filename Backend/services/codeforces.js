import axios from 'axios';

export async function fetchCodeforcesData(handle) {
  if (!handle) return null;

  try {
    const [infoRes, ratingRes, statusRes] = await Promise.allSettled([
      axios.get(`https://codeforces.com/api/user.info?handles=${handle}`, { timeout: 10000 }),
      axios.get(`https://codeforces.com/api/user.rating?handle=${handle}`, { timeout: 10000 }),
      axios.get(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=5000`, { timeout: 14000 })
    ]);

    if (infoRes.status !== 'fulfilled' || infoRes.value.data?.status !== 'OK') {
      return null;
    }

    const userInfo = infoRes.value.data.result[0];
    const ratingHistory = ratingRes.status === 'fulfilled' && ratingRes.value.data?.status === 'OK'
      ? ratingRes.value.data.result
      : [];
    const submissions = statusRes.status === 'fulfilled' && statusRes.value.data?.status === 'OK'
      ? statusRes.value.data.result
      : [];

    const solvedIds = new Set();
    const topicCounts = {};
    const languageCounts = {};
    const heatmapCounts = {};
    const recentSubmissions = [];

    for (const sub of submissions) {
      const prob = sub.problem || {};
      const probId = `${prob.contestId}${prob.index}`;
      const verdict = sub.verdict;
      const tags = prob.tags || [];
      const language = sub.programmingLanguage || 'Unknown';
      const timeSec = sub.creationTimeSeconds;

      languageCounts[language] = (languageCounts[language] || 0) + 1;

      if (timeSec) {
        const dtStr = new Date(timeSec * 1000).toISOString().split('T')[0];
        heatmapCounts[dtStr] = (heatmapCounts[dtStr] || 0) + 1;
      }

      if (recentSubmissions.length < 10) {
        recentSubmissions.push({
          id: sub.id,
          problem_name: prob.name || 'Unknown Problem',
          verdict,
          language,
          time_ms: sub.timeConsumedMillis || 0,
          memory_kb: Math.floor((sub.memoryConsumedBytes || 0) / 1024),
          url: `https://codeforces.com/contest/${prob.contestId}/submission/${sub.id}`
        });
      }

      if (verdict === 'OK') {
        if (!solvedIds.has(probId)) {
          solvedIds.add(probId);
          for (const t of tags) {
            topicCounts[t] = (topicCounts[t] || 0) + 1;
          }
        }
      }
    }

    const heatmap = Object.entries(heatmapCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const languageStats = Object.entries(languageCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);

    return {
      platform: 'Codeforces',
      username: handle,
      avatar: userInfo.titlePhoto,
      rating: userInfo.rating || 0,
      max_rating: userInfo.maxRating || 0,
      rank: userInfo.rank || 'Unrated',
      total_solved: solvedIds.size,
      topic_counts: topicCounts,
      rating_history: ratingHistory,
      heatmap,
      language_stats: languageStats,
      recent_submissions: recentSubmissions
    };
  } catch (err) {
    console.warn(`Codeforces fetch failed for @${handle}:`, err.message);
    return null;
  }
}
