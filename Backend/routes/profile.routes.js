import express from 'express';
import { fetchLeetCodeData } from '../services/leetcode.js';
import { fetchCodeforcesData } from '../services/codeforces.js';
import { fetchCodeChefData } from '../services/codechef.js';

const router = express.Router();

// =============================================================================
// 1. UNIFIED MULTI-PLATFORM PROFILE
// =============================================================================
router.get('/unified-profile', async (req, res) => {
  const { leetcode, codeforces, codechef } = req.query;

  if (!leetcode && !codeforces && !codechef) {
    return res.status(400).json({
      detail: 'Please provide at least one platform handle (LeetCode, Codeforces, or CodeChef).'
    });
  }

  try {
    const [lcRes, cfRes, ccRes] = await Promise.allSettled([
      leetcode ? fetchLeetCodeData(leetcode.trim()) : Promise.resolve(null),
      codeforces ? fetchCodeforcesData(codeforces.trim()) : Promise.resolve(null),
      codechef ? fetchCodeChefData(codechef.trim()) : Promise.resolve(null)
    ]);

    const lcData = lcRes.status === 'fulfilled' ? lcRes.value : null;
    const cfData = cfRes.status === 'fulfilled' ? cfRes.value : null;
    const ccData = ccRes.status === 'fulfilled' ? ccRes.value : null;

    const connectedPlatforms = {};
    let totalSolved = 0;
    const combinedTopics = {};

    if (lcData) {
      connectedPlatforms['LeetCode'] = lcData;
      totalSolved += (lcData.total_solved || 0);
      for (const [t, cnt] of Object.entries(lcData.topic_counts || {})) {
        combinedTopics[t] = (combinedTopics[t] || 0) + cnt;
      }
    }

    if (cfData) {
      connectedPlatforms['Codeforces'] = cfData;
      totalSolved += (cfData.total_solved || 0);
      for (const [t, cnt] of Object.entries(cfData.topic_counts || {})) {
        combinedTopics[t] = (combinedTopics[t] || 0) + cnt;
      }
    }

    if (ccData) {
      connectedPlatforms['CodeChef'] = ccData;
      totalSolved += (ccData.total_solved || 0);
      for (const [t, cnt] of Object.entries(ccData.topic_counts || {})) {
        combinedTopics[t] = (combinedTopics[t] || 0) + cnt;
      }
    }

    // Dynamic DSA vs CP metrics (Codolio-style separation)
    const dsaSolved = lcData?.total_solved || 0;
    const cpSolved = (cfData?.total_solved || 0) + (ccData?.total_solved || 0);

    const totalContests = (lcData?.contests_count || 0) + (cfData?.contests_count || 0) + (ccData?.contests_count || 0);

    // Weak spot detection: topics with low solved counts relative to overall practice
    const weakSpots = [];
    const coreTopics = ['Dynamic Programming', 'Graphs', 'Trees & Binary Trees', 'Binary Search', 'Sorting', 'Math & Number Theory', 'Greedy Algorithms'];
    for (const ct of coreTopics) {
      const count = combinedTopics[ct] || 0;
      if (count < 8) {
        weakSpots.push(ct);
      }
    }

    // Combined rating history across all connected platforms (LeetCode + Codeforces + CodeChef)
    const allRatingHistory = [
      ...(cfData?.rating_history || []),
      ...(lcData?.rating_history || []),
      ...(ccData?.rating_history || [])
    ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    // Master list of solved problem identifiers across all platforms for Practice Page filtering
    const solvedIdentifiers = [
      ...(lcData?.solved_titles || []),
      ...(lcData?.solved_slugs || []),
      ...(cfData?.solved_problem_ids || []),
      ...(cfData?.solved_problem_names || [])
    ];

    const response = {
      user_handles: {
        leetcode: leetcode || null,
        codeforces: codeforces || null,
        codechef: codechef || null
      },
      total_solved: totalSolved,
      dsa_solved: dsaSolved,
      cp_solved: cpSolved,
      total_contests: totalContests,
      contests_breakdown: {
        leetcode: lcData?.contests_count || 0,
        codeforces: cfData?.contests_count || 0,
        codechef: ccData?.contests_count || 0
      },
      dsa_difficulty: lcData?.difficulty || { Easy: 0, Medium: 0, Hard: 0 },
      cp_breakdown: {
        codeforces: cfData?.total_solved || 0,
        codechef: ccData?.total_solved || 0
      },
      connected_platforms: connectedPlatforms,
      solved_identifiers: solvedIdentifiers,
      topic_breakdown: Object.entries(combinedTopics).map(([topic, solved]) => ({
        topic,
        solved,
        attempted: Math.round(solved * 1.3),
        ac_rate: 75.0
      })),
      weak_spots: weakSpots,
      rating_history: allRatingHistory,
      cf_rating_history: cfData?.rating_history || [],
      lc_rating_history: lcData?.rating_history || [],
      cc_rating_history: ccData?.rating_history || [],
      heatmap: cfData?.heatmap || [],
      language_stats: cfData?.language_stats || []
    };

    res.json(response);
  } catch (err) {
    console.error('Unified profile error:', err);
    res.status(500).json({ detail: `Aggregation error: ${err.message}` });
  }
});

// =============================================================================
// 2. CODEFORCES STANDALONE ANALYZE
// =============================================================================
router.get('/analyze/:handle', async (req, res) => {
  const { handle } = req.params;
  try {
    const cfData = await fetchCodeforcesData(handle);
    if (!cfData) {
      return res.status(404).json({ detail: `Codeforces handle @${handle} not found.` });
    }

    res.json({
      handle: cfData.username,
      rating: cfData.rating,
      max_rating: cfData.max_rating,
      avatar: cfData.avatar,
      total_solved: cfData.total_solved,
      contests_count: cfData.contests_count,
      weak_topics: ['Dynamic Programming', 'Bit Manipulation'],
      topic_breakdown: Object.entries(cfData.topic_counts || {}).map(([topic, solved]) => ({
        topic,
        solved,
        attempted: Math.round(solved * 1.25),
        ac_rate: 80.0
      })),
      language_stats: cfData.language_stats,
      heatmap: cfData.heatmap,
      recent_submissions: cfData.recent_submissions,
      rating_history: cfData.rating_history
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

export default router;
